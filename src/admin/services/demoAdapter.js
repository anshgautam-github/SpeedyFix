/**
 * DEMO ADMIN ADAPTER. A simulated "backend" stored in this browser's localStorage. It reads and writes the same booking,
 * user and center records as the customer, driver and service-center demo adapters, so admin decisions bind every portal:
 * a suspended driver loses access, an unapproved center cannot operate or be booked, a deactivated user is signed out,
 * and an assignment shows up on the driver's job list and the customer's booking.
 *
 * Rules here are what a real backend must enforce: admin-only access with permission levels, no self-escalation, reasons
 * for sensitive actions, atomic assignment with stale-request rejection, no OTP bypass, and a server-written append-only
 * audit trail. Nothing here sends an SMS, email or push notification, and there is no live GPS.
 */
import { ServiceError as E } from '../../portal/services/errors';
import { demoInternals as X } from '../../portal/services/demoAdapter';

const { NS, read, write, delay, rid, nowISO } = X;

const PERMS = {
  super: ['view', 'users.manage', 'drivers.approve', 'centers.approve', 'dispatch', 'bookings.manage', 'handovers.recover', 'settings.manage', 'audit.view', 'reports.view', 'alerts.manage'],
  operations: ['view', 'dispatch', 'bookings.manage', 'reports.view', 'alerts.manage'],
};
const ME = () => {
  const u = X.sessionUser();
  if (!u) throw new E('UNAUTHENTICATED', 'Your session has ended. Sign in again.');
  if (u.role !== 'admin') throw new E('FORBIDDEN', 'This area is only for platform administrators.');
  return u;
};
const can = (u, p) => (PERMS[u.adminLevel || 'operations'] || []).includes(p);
const need = (u, p) => { if (!can(u, p)) throw new E('FORBIDDEN', 'Your administrator level does not allow this action.'); };

// ---------- platform store (server-owned) ----------
const DEFAULTS = { alerts: { unassignedMinutes: 30, pickupDelayMinutes: 30, receiptDelayMinutes: 30, stalledWorkOrderHours: 24 }, assignment: { requireOnline: true, maxActiveJobs: 1 } };
const plat = () => {
  const p = read('platform', null) || {};
  return { centers: p.centers || {}, extraCenters: p.extraCenters || [], audit: p.audit || [], alertState: p.alertState || {}, seeded: Boolean(p.seeded), settings: { alerts: { ...DEFAULTS.alerts, ...(p.settings?.alerts || {}) }, assignment: { ...DEFAULTS.assignment, ...(p.settings?.assignment || {}) } } };
};
const savePlat = (p) => write('platform', p);
const audit = (me, action, entity, entityId, { reason = '', before, after } = {}) => {
  const p = plat();
  p.audit.push({ id: `a_${rid()}`, at: nowISO(), adminId: me.id, adminName: me.name, adminLevel: me.adminLevel || 'operations', action, entity, entityId, reason: String(reason || '').trim(), before: before ?? null, after: after ?? null });
  savePlat(p);
};
const needReason = (reason) => { if (!String(reason || '').trim()) throw new E('REASON_REQUIRED', 'Give a reason. It is recorded in the audit log.'); };

// ---------- reading shared records ----------
const users = () => read('users', []);
const saveUsers = (u) => write('users', u);
function entries() {
  const out = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i);
    if (!k.startsWith(`${NS}data:`)) continue;
    const key = k.slice(NS.length);
    const d = JSON.parse(localStorage.getItem(k));
    for (const b of d.bookings) out.push({ key, d, b });
  }
  return out;
}
const findBooking = (id) => { const e = entries().find((x) => x.b.id === id); if (!e) throw new E('NOT_FOUND', 'Booking not found.'); return e; };
const custOf = (key, b) => b.customer || { name: (users().find((u) => u.id === key.slice(5)) || {}).name || 'Customer', phone: b.pickup?.phone || '' };
const custId = (key) => (key.startsWith('data:u_') ? key.slice(5) : null);
const centers = () => [...X.allCenters()].map((c) => { const st = plat().centers[c.id] || {}; return { ...c, approval: st.approval || 'approved', status: st.status || 'active', contact: st.contact, application: Boolean(plat().extraCenters.find((x) => x.id === c.id)) }; });
const centerName = (id) => centers().find((c) => c.id === id)?.name || id;
const dstate = (id) => read(`driver:${id}`, { availability: 'offline', notifications: [] });
const mins = (iso) => (iso ? (Date.now() - new Date(iso).getTime()) / 60000 : 0);
const slotEnd = (date, slot) => { const m = String(slot || '').match(/-\s*(\d{1,2}):(\d{2})/); return new Date(`${date}T${m ? `${m[1].padStart(2, '0')}:${m[2]}` : '18:00'}:00`).getTime(); };

// ---------- statuses and exceptions ----------
function statusKey(b) {
  const s = b.status;
  if (s === 'cancelled') return 'cancelled';
  if (s === 'delivered') return 'completed';
  if (s === 'confirmed') return b.driver ? 'driver_assigned' : 'pending_assignment';
  if (s === 'driver_assigned') return 'driver_assigned';
  if (['driver_en_route', 'picked_up', 'in_transit'].includes(s)) return 'pickup_in_progress';
  if (s === 'received_at_center') return 'received';
  if (s === 'service_in_progress') return 'service_in_progress';
  if (s === 'service_completed') return b.delivery ? 'delivery_in_progress' : 'ready_for_delivery';
  return 'delivery_in_progress';
}
const stage = (b) => {
  const s = b.status;
  if (s === 'delivered' || s === 'cancelled') return 'completed';
  if (['confirmed', 'driver_assigned', 'driver_en_route'].includes(s)) return 'pickup';
  if (['picked_up', 'in_transit'].includes(s)) return 'transit';
  if (['received_at_center', 'service_in_progress', 'service_completed'].includes(s) && !b.delivery) return 'workshop';
  return 'delivery';
};
const SEV = { unassigned: 'high', delayed_pickup: 'high', failed_handover: 'medium', awaiting_receipt: 'medium', stalled_work_order: 'medium', driver_rejection: 'medium' };
function flagsOf(e, S) {
  const { b, d } = e;
  const out = [];
  const A = S.alerts;
  const add = (type, since, detail, sev) => out.push({ type, severity: sev || SEV[type], since, detail });
  if (b.status === 'confirmed' && !b.driver && mins(b.createdAt) > A.unassignedMinutes) add('unassigned', b.createdAt, 'Pickup has no driver');
  if (b.status === 'service_completed' && b.delivery && !b.deliveryDriver && mins(b.delivery.requestedAt || b.updatedAt) > A.unassignedMinutes) add('unassigned', b.delivery.requestedAt || b.updatedAt, 'Delivery has no driver');
  if (['confirmed', 'driver_assigned', 'driver_en_route'].includes(b.status) && Date.now() > slotEnd(b.pickup.date, b.pickup.slot) + A.pickupDelayMinutes * 60000) add('delayed_pickup', b.pickup.date, `Pickup window ended (${b.pickup.slot})`);
  for (const t of ['pickup', 'delivery']) {
    const o = d.otps?.[`${b.id}:${t}`];
    if (o && o.attempts >= 1 && !b.handovers[t].verifiedAt) add('failed_handover', b.updatedAt, `${t} code: ${o.attempts} failed ${o.attempts === 1 ? 'attempt' : 'attempts'}${o.attempts >= 5 ? ', locked' : ''}`, o.attempts >= 5 || Date.now() > o.expiresAt ? 'high' : 'medium');
  }
  if (b.status === 'in_transit' && (b.pickupJob?.centerArrivedAt || b.pickupJob?.handedOverAt) && mins(b.pickupJob.handedOverAt || b.pickupJob.centerArrivedAt) > A.receiptDelayMinutes) add('awaiting_receipt', b.pickupJob.centerArrivedAt, 'Driver arrived, center has not confirmed receipt');
  const wo = b.workOrder;
  if (wo && ['new', 'accepted', 'assigned', 'in_progress', 'waiting_parts'].includes(wo.status)) { const last = wo.history[wo.history.length - 1]?.at; if (last && mins(last) / 60 > A.stalledWorkOrderHours) add('stalled_work_order', last, `${wo.reference} unchanged for ${Math.round(mins(last) / 60)} h`); }
  if (!b.driver && (b.offers || []).some((o) => o.job === 'pickup' && o.status === 'declined')) add('driver_rejection', b.updatedAt, 'A driver declined this pickup');
  return out;
}

function summary(e, S) {
  const { b, key } = e;
  const flags = flagsOf(e, S);
  return {
    id: b.id, reference: b.reference, vehicle: { registration: b.vehicle.registration, make: b.vehicle.make, model: b.vehicle.model },
    customer: custOf(key, b), center: { id: b.centerId, name: centerName(b.centerId) },
    type: b.delivery ? 'Pickup + drop' : 'Pickup', hasDelivery: Boolean(b.delivery),
    driver: b.driver ? { id: b.driver.id, name: b.driver.name } : null, deliveryDriver: b.deliveryDriver ? { id: b.deliveryDriver.id, name: b.deliveryDriver.name } : null,
    schedule: { date: b.pickup.date, slot: b.pickup.slot }, status: b.status, statusKey: statusKey(b), stage: stage(b), flags,
    updatedAt: b.updatedAt, createdAt: b.createdAt, demo: Boolean(b.demo),
  };
}
const inRange = (iso, from, to) => { const d = (iso || '').slice(0, 10); return (!from || d >= from) && (!to || d <= to); };
const matches = (s, f = {}) => (!f.status || f.status === 'all' || (f.status === 'exception' ? s.flags.length > 0 : s.statusKey === f.status)) && (!f.centerId || s.center.id === f.centerId) && (!f.driverId || s.driver?.id === f.driverId || s.deliveryDriver?.id === f.driverId)
  && (!f.type || f.type === 'all' || (f.type === 'delivery' ? s.hasDelivery : !s.hasDelivery)) && inRange(s.schedule.date, f.from, f.to)
  && (!f.query || `${s.reference} ${s.vehicle.registration} ${s.customer.name} ${s.vehicle.make} ${s.vehicle.model}`.toLowerCase().includes(f.query.trim().toLowerCase()));

// ---------- drivers ----------
const driverUsers = () => users().filter((u) => u.role === 'driver');
const ACTIVE_PICKUP = ['driver_assigned', 'driver_en_route', 'picked_up', 'in_transit'];
function driverWork(id, es) {
  let active = 0; let completed = 0;
  for (const { b } of es) {
    if (b.driver?.id === id) { if (ACTIVE_PICKUP.includes(b.status) && !b.pickupJob?.handedOverAt) active += 1; else if (b.status !== 'cancelled' && !ACTIVE_PICKUP.includes(b.status)) completed += 1; else if (b.pickupJob?.handedOverAt) completed += 1; }
    if (b.deliveryDriver?.id === id) { if (['delivery_driver_assigned', 'out_for_delivery'].includes(b.status)) active += 1; else if (b.status === 'delivered') completed += 1; }
  }
  return { active, completed };
}
const driverStatus = (u) => (u.active === false ? 'deactivated' : u.driverStatus || 'approved');
function driverView(u, es) {
  const w = driverWork(u.id, es);
  const st = dstate(u.id);
  return { id: u.id, name: u.name, email: u.email, phone: u.phone || '', status: driverStatus(u), approval: u.driverStatus || 'approved', availability: w.active ? 'on_job' : st.availability, activeJobs: w.active, completedJobs: w.completed, createdAt: u.createdAt || null, lastSignInAt: u.lastSignInAt || null, serviceArea: u.serviceArea || null };
}

function activityOf(es) {
  const items = [];
  for (const { b } of es) {
    (b.statusHistory || []).forEach((h, i) => items.push({ id: `${b.id}:s${i}`, at: h.at, bookingId: b.id, text: `${b.reference} · ${b.vehicle.registration}: ${X.NOTE[h.status] || h.status}` }));
    (b.workOrder?.history || []).forEach((h, i) => items.push({ id: `${b.id}:w${i}`, at: h.at, bookingId: b.id, text: `${b.reference}: work order ${h.status.replace(/_/g, ' ')}` }));
  }
  plat().audit.forEach((a) => items.push({ id: a.id, at: a.at, bookingId: a.entity === 'booking' ? a.entityId : null, text: `Admin ${a.adminName}: ${a.action.replace(/\./g, ' ')}` }));
  return items.sort((a, c) => (a.at < c.at ? 1 : -1)).slice(0, 15);
}

// ---------- alerts (derived from records; acknowledgement is stored by the platform) ----------
function alertsList(es, S, P) {
  const out = [];
  const st = P.alertState;
  const push = (id, type, sev, text, at, link) => out.push({ id, type, severity: sev, text, at, link, status: st[id]?.status || 'open', ack: st[id] || null });
  for (const e of es) {
    const { b } = e;
    flagsOf(e, S).forEach((f) => push(`${f.type}:${b.id}`, f.type, f.severity, `${b.reference} · ${b.vehicle.registration}: ${f.detail}`, f.since, { bookingId: b.id }));
    if (Date.now() - new Date(b.createdAt).getTime() < 864e5) push(`new:${b.id}`, 'new_booking', 'info', `New booking ${b.reference} at ${centerName(b.centerId)}`, b.createdAt, { bookingId: b.id });
    if (b.receiving && Date.now() - new Date(b.receiving.at).getTime() < 864e5) push(`rcv:${b.id}`, 'vehicle_received', 'info', `${b.reference}: vehicle received by ${centerName(b.centerId)}`, b.receiving.at, { bookingId: b.id });
    if (b.workOrder?.status === 'completed' && Date.now() - new Date(b.workOrder.completedAt).getTime() < 864e5) push(`svc:${b.id}`, 'service_completed', 'info', `${b.reference}: service completed`, b.workOrder.completedAt, { bookingId: b.id });
    if (b.status === 'service_completed' && b.delivery) push(`dlp:${b.id}`, 'delivery_pending', 'info', `${b.reference}: delivery pending`, b.delivery.requestedAt || b.updatedAt, { bookingId: b.id });
    if (b.status === 'delivered' && b.handovers.delivery.verifiedAt && Date.now() - new Date(b.handovers.delivery.verifiedAt).getTime() < 864e5) push(`dlv:${b.id}`, 'delivery_completed', 'info', `${b.reference}: delivery completed`, b.handovers.delivery.verifiedAt, { bookingId: b.id });
  }
  users().filter((u) => u.role === 'driver' && (u.driverStatus || 'approved') === 'pending').forEach((u) => push(`appr:${u.id}`, 'account_approval', 'medium', `Driver ${u.name} is waiting for approval`, u.createdAt || nowISO(), { userId: u.id }));
  P.extraCenters.filter((c) => (P.centers[c.id]?.approval || 'pending') === 'pending').forEach((c) => push(`appr:${c.id}`, 'account_approval', 'medium', `Service center application: ${c.name}`, c.submittedAt, { centerId: c.id }));
  X.CENTERS.filter((c) => P.centers[c.id]?.approval === 'pending').forEach((c) => push(`appr:${c.id}`, 'account_approval', 'medium', `Service center awaiting approval: ${c.name}`, P.centers[c.id].at || nowISO(), { centerId: c.id }));
  return out.sort((a, c) => ((SEV_RANK[a.severity] - SEV_RANK[c.severity]) || (a.at < c.at ? 1 : -1)));
}
const SEV_RANK = { high: 0, medium: 1, info: 2 };

export const demoAdminAdapter = {
  mode: 'demo',

  context: { async get() { await delay(120); const me = ME(); return { user: { id: me.id, name: me.name, email: me.email, adminLevel: me.adminLevel || 'operations' }, permissions: PERMS[me.adminLevel || 'operations'] || [], centers: centers().map((c) => ({ id: c.id, name: c.name })), seeded: plat().seeded }; } },

  dashboard: {
    async get(f = {}) {
      await delay(250);
      const me = ME(); need(me, 'view');
      const P = plat(); const es = entries();
      const all = es.map((e) => ({ e, s: summary(e, P.settings) }));
      const fil = all.filter(({ s }) => matches(s, { ...f, query: '' }));
      const t = new Date().toISOString().slice(0, 10);
      const S = (k) => fil.filter(({ s }) => s.statusKey === k).map(({ s }) => s);
      const us = users(); const drivers = driverUsers().map((u) => driverView(u, es));
      const days = Array.from({ length: 7 }, (_, i) => new Date(Date.now() - (6 - i) * 864e5).toISOString().slice(0, 10));
      const dist = {}; fil.forEach(({ s }) => { dist[s.statusKey] = (dist[s.statusKey] || 0) + 1; });
      return {
        total: all.length,
        counts: {
          customers: us.filter((u) => (u.role || 'customer') === 'customer').length,
          activeDrivers: drivers.filter((d) => d.status === 'approved' && d.availability !== 'offline').length,
          approvedCenters: centers().filter((c) => c.approval === 'approved' && c.status === 'active').length,
          bookingsToday: all.filter(({ s }) => s.schedule.date === t || (s.createdAt || '').slice(0, 10) === t).length,
          pending: S('pending_assignment').length,
          activePickups: fil.filter(({ s }) => ['driver_assigned', 'pickup_in_progress'].includes(s.statusKey)).length,
          activeDeliveries: S('delivery_in_progress').length,
          inTransit: fil.filter(({ s }) => ['picked_up', 'in_transit'].includes(s.status)).length,
          openWorkOrders: es.filter(({ b }) => b.workOrder && !['completed', 'cancelled'].includes(b.workOrder.status)).length,
          completed: S('completed').length, cancelled: S('cancelled').length,
        },
        live: {
          recent: fil.map(({ s }) => s).sort((a, c) => (a.createdAt < c.createdAt ? 1 : -1)).slice(0, 6),
          awaitingAssignment: fil.filter(({ s }) => s.flags.some((x) => x.type === 'unassigned') || s.statusKey === 'pending_assignment').map(({ s }) => s).slice(0, 6),
          driversOnJobs: drivers.filter((d) => d.activeJobs > 0),
          exceptions: fil.filter(({ s }) => s.flags.length).map(({ s }) => s).slice(0, 8),
          awaitingReceipt: fil.filter(({ s }) => s.status === 'in_transit').map(({ s }) => s).slice(0, 6),
          readyForDelivery: S('ready_for_delivery').slice(0, 6),
          recentCompleted: S('completed').sort((a, c) => (a.updatedAt < c.updatedAt ? 1 : -1)).slice(0, 5),
        },
        activity: activityOf(fil.map(({ e }) => e)),
        charts: { volumeByDay: days.map((date) => ({ date, count: all.filter(({ s }) => (s.createdAt || '').slice(0, 10) === date).length })), statusDistribution: dist },
        thresholds: P.settings.alerts, demo: es.some(({ b }) => b.demo), seeded: P.seeded,
      };
    },
  },

  users: {
    async list({ query = '', role = 'all', status = 'all', cursor = 0, limit = 10 } = {}) {
      await delay(200);
      const me = ME(); need(me, 'users.manage');
      const q = query.trim().toLowerCase();
      const rows = users().map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role || 'customer', staffRole: u.staffRole || null, adminLevel: u.adminLevel || null, centerId: u.centerId || null, centerName: u.centerId ? centerName(u.centerId) : null, status: u.active === false ? 'deactivated' : u.role === 'driver' ? driverStatus(u) : 'active', createdAt: u.createdAt || null, lastSignInAt: u.lastSignInAt || null }))
        .filter((u) => role === 'all' || u.role === role).filter((u) => status === 'all' || u.status === status)
        .filter((u) => !q || `${u.name} ${u.email}`.toLowerCase().includes(q)).sort((a, c) => String(c.createdAt || '').localeCompare(String(a.createdAt || '')) || a.name.localeCompare(c.name));
      return { items: rows.slice(cursor, cursor + limit), total: rows.length, nextCursor: cursor + limit < rows.length ? cursor + limit : null };
    },
    async get(id) {
      await delay(200);
      const me = ME(); need(me, 'users.manage');
      const u = users().find((x) => x.id === id);
      if (!u) throw new E('NOT_FOUND', 'User not found.');
      const es = entries(); const P = plat();
      let history = [];
      if ((u.role || 'customer') === 'customer') history = es.filter(({ key }) => custId(key) === id).map((e) => summary(e, P.settings));
      if (u.role === 'driver') history = es.filter(({ b }) => b.driver?.id === id || b.deliveryDriver?.id === id).map((e) => summary(e, P.settings));
      if (u.role === 'center') history = es.filter(({ b }) => b.centerId === u.centerId).slice(0, 8).map((e) => summary(e, P.settings));
      return {
        id: u.id, name: u.name, email: u.email, phone: u.phone || '', role: u.role || 'customer', staffRole: u.staffRole || null, adminLevel: u.adminLevel || null, centerId: u.centerId || null, centerName: u.centerId ? centerName(u.centerId) : null,
        status: u.active === false ? 'deactivated' : u.role === 'driver' ? driverStatus(u) : 'active', createdAt: u.createdAt || null, lastSignInAt: u.lastSignInAt || null,
        history: history.sort((a, c) => (a.updatedAt < c.updatedAt ? 1 : -1)).slice(0, 12), isSelf: id === me.id, audit: P.audit.filter((a) => a.entityId === id).reverse().slice(0, 8),
      };
    },
    async setActive(id, active, reason) {
      await delay(300);
      const me = ME(); need(me, 'users.manage'); needReason(reason);
      if (id === me.id) throw new E('NOT_ALLOWED', 'You cannot deactivate your own account.');
      const us = users(); const u = us.find((x) => x.id === id);
      if (!u) throw new E('NOT_FOUND', 'User not found.');
      if (!active && u.role === 'admin' && u.adminLevel === 'super' && us.filter((x) => x.role === 'admin' && x.adminLevel === 'super' && x.active !== false).length <= 1) throw new E('LAST_SUPER_ADMIN', 'The last active super admin cannot be deactivated.');
      const before = u.active !== false; u.active = Boolean(active); saveUsers(us);
      audit(me, active ? 'user.activated' : 'user.deactivated', 'user', id, { reason, before: { active: before }, after: { active: u.active } });
    },
    /** Role changes are limited to staff roles and admin levels, never self, never creating admins from customers/drivers. */
    async changeRole(id, { staffRole, adminLevel }, reason) {
      await delay(300);
      const me = ME(); need(me, 'users.manage'); needReason(reason);
      if (id === me.id) throw new E('NOT_ALLOWED', 'You cannot change your own role.');
      const us = users(); const u = us.find((x) => x.id === id);
      if (!u) throw new E('NOT_FOUND', 'User not found.');
      if (u.role === 'center') {
        if (!['manager', 'advisor', 'technician'].includes(staffRole)) throw new E('INVALID_INPUT', 'Choose a valid staff role.');
        const before = u.staffRole; u.staffRole = staffRole; saveUsers(us);
        audit(me, 'user.role_changed', 'user', id, { reason, before: { staffRole: before }, after: { staffRole } });
      } else if (u.role === 'admin') {
        if (!['super', 'operations'].includes(adminLevel)) throw new E('INVALID_INPUT', 'Choose a valid administrator level.');
        if (u.adminLevel === 'super' && adminLevel !== 'super' && us.filter((x) => x.role === 'admin' && x.adminLevel === 'super' && x.active !== false).length <= 1) throw new E('LAST_SUPER_ADMIN', 'The last active super admin cannot be demoted.');
        const before = u.adminLevel; u.adminLevel = adminLevel; saveUsers(us);
        audit(me, 'user.role_changed', 'user', id, { reason, before: { adminLevel: before }, after: { adminLevel } });
      } else throw new E('NOT_ALLOWED', 'Roles for customers and drivers are not changed here. Drivers are approved through driver management.');
    },
    async requestRecovery(id) {
      await delay(300);
      const me = ME(); need(me, 'users.manage');
      const u = users().find((x) => x.id === id);
      if (!u) throw new E('NOT_FOUND', 'User not found.');
      audit(me, 'user.recovery_requested', 'user', id);
      // No email or authentication provider is connected in this build, so nothing is sent.
      return { sent: false, note: 'No account-recovery email provider is configured. The request was recorded only.' };
    },
  },

  customers: {
    async list({ query = '' } = {}) {
      await delay(200);
      const me = ME(); need(me, 'view');
      const es = entries(); const q = query.trim().toLowerCase();
      return users().filter((u) => (u.role || 'customer') === 'customer').map((u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone || '', status: u.active === false ? 'deactivated' : 'active', createdAt: u.createdAt || null, bookings: es.filter(({ key }) => custId(key) === u.id).length, vehicles: new Set(es.filter(({ key }) => custId(key) === u.id).map(({ b }) => (b.vehicle.registration || '').toUpperCase())).size }))
        .filter((c) => !q || `${c.name} ${c.email}`.toLowerCase().includes(q));
    },
  },

  drivers: {
    async list({ status = 'all', query = '' } = {}) {
      await delay(220);
      const me = ME(); need(me, 'view');
      const es = entries(); const q = query.trim().toLowerCase();
      return driverUsers().map((u) => driverView(u, es)).filter((d) => status === 'all' || d.status === status).filter((d) => !q || `${d.name} ${d.email}`.toLowerCase().includes(q));
    },
    async setApproval(id, decision, reason) {
      await delay(300);
      const me = ME(); need(me, 'drivers.approve');
      if (!['approved', 'rejected', 'suspended'].includes(decision)) throw new E('INVALID_INPUT', 'Unknown decision.');
      if (decision !== 'approved') needReason(reason);
      const us = users(); const u = us.find((x) => x.id === id && x.role === 'driver');
      if (!u) throw new E('NOT_FOUND', 'Driver not found.');
      const before = u.driverStatus || 'approved';
      if (decision === 'suspended' && before === 'pending') throw new E('INVALID_TRANSITION', 'A driver who is still pending can be approved or rejected, not suspended.');
      if (decision === 'approved' && before === 'approved') throw new E('INVALID_TRANSITION', 'This driver is already approved.');
      u.driverStatus = decision; saveUsers(us);
      audit(me, `driver.${decision}`, 'driver', id, { reason, before: { status: before }, after: { status: decision } });
    },
  },

  centers: {
    async list() {
      await delay(200);
      const me = ME(); need(me, 'view');
      const es = entries(); const us = users();
      return centers().map((c) => {
        const mine = es.filter(({ b }) => b.centerId === c.id);
        return { id: c.id, name: c.name, address: c.address, contact: c.contact || read(`center:${c.id}`, {}).settings?.contact || '', approval: c.approval, status: c.status, application: c.application, staff: us.filter((u) => u.role === 'center' && u.centerId === c.id).length, bookings: mine.length, activeWorkOrders: mine.filter(({ b }) => b.workOrder && !['completed', 'cancelled'].includes(b.workOrder.status)).length, completedJobs: mine.filter(({ b }) => b.status === 'delivered').length, demo: Boolean(c.demo) };
      });
    },
    async get(id) {
      await delay(220);
      const me = ME(); need(me, 'view');
      const c = centers().find((x) => x.id === id);
      if (!c) throw new E('NOT_FOUND', 'Service center not found.');
      const P = plat(); const es = entries().filter(({ b }) => b.centerId === id);
      const cs = read(`center:${id}`, { settings: {}, technicians: [] });
      return { ...c, contact: cs.settings?.contact || '', hours: cs.settings?.hours || c.hours || '', staff: users().filter((u) => u.role === 'center' && u.centerId === id).map((u) => ({ id: u.id, name: u.name, email: u.email, staffRole: u.staffRole, status: u.active === false ? 'deactivated' : 'active' })), technicians: (cs.technicians || []).length,
        bookings: es.map((e) => summary(e, P.settings)).sort((a, c2) => (a.updatedAt < c2.updatedAt ? 1 : -1)).slice(0, 10), bookingCount: es.length,
        workOrders: es.filter(({ b }) => b.workOrder).map(({ b }) => ({ id: b.workOrder.id, reference: b.workOrder.reference, status: b.workOrder.status, bookingRef: b.reference })).slice(0, 10),
        audit: P.audit.filter((a) => a.entityId === id).reverse().slice(0, 10), canApprove: can(me, 'centers.approve'), canEdit: can(me, 'centers.approve') };
    },
    async setApproval(id, decision, reason) {
      await delay(300);
      const me = ME(); need(me, 'centers.approve');
      if (!['approved', 'rejected'].includes(decision)) throw new E('INVALID_INPUT', 'Unknown decision.');
      if (decision === 'rejected') needReason(reason);
      const P = plat(); const c = centers().find((x) => x.id === id);
      if (!c) throw new E('NOT_FOUND', 'Service center not found.');
      const before = P.centers[id]?.approval || 'approved';
      if (before === decision) throw new E('INVALID_TRANSITION', `This center is already ${decision}.`);
      P.centers[id] = { ...(P.centers[id] || {}), approval: decision, status: P.centers[id]?.status || 'active', at: nowISO() }; savePlat(P);
      audit(me, `center.${decision}`, 'center', id, { reason, before: { approval: before }, after: { approval: decision } });
    },
    async setStatus(id, status, reason) {
      await delay(300);
      const me = ME(); need(me, 'centers.approve'); needReason(reason);
      if (!['active', 'suspended'].includes(status)) throw new E('INVALID_INPUT', 'Unknown status.');
      const P = plat(); const c = centers().find((x) => x.id === id);
      if (!c) throw new E('NOT_FOUND', 'Service center not found.');
      if (c.approval !== 'approved' && status === 'active') throw new E('NOT_ALLOWED', 'Approve the center before activating it.');
      const before = P.centers[id]?.status || 'active';
      P.centers[id] = { ...(P.centers[id] || {}), approval: P.centers[id]?.approval || 'approved', status, at: nowISO() }; savePlat(P);
      audit(me, status === 'suspended' ? 'center.suspended' : 'center.reactivated', 'center', id, { reason, before: { status: before }, after: { status } });
    },
    async updateInfo(id, { contact, hours }, reason) {
      await delay(300);
      const me = ME(); need(me, 'centers.approve'); needReason(reason);
      const key = `center:${id}`; const cs = read(key, { settings: { contact: '', hours: '', hourlyRate: null }, technicians: [], seen: {} });
      const before = { contact: cs.settings.contact, hours: cs.settings.hours };
      cs.settings = { ...cs.settings, contact: String(contact || '').trim(), hours: String(hours || '').trim() }; write(key, cs);
      audit(me, 'center.updated', 'center', id, { reason, before, after: { contact: cs.settings.contact, hours: cs.settings.hours } });
    },
  },

  bookings: {
    async list({ cursor = 0, limit = 10, ...f } = {}) {
      await delay(220);
      const me = ME(); need(me, 'view');
      const P = plat();
      const rows = entries().map((e) => summary(e, P.settings)).filter((s) => matches(s, f)).sort((a, c) => (a.updatedAt < c.updatedAt ? 1 : -1));
      return { items: rows.slice(cursor, cursor + limit), total: rows.length, nextCursor: cursor + limit < rows.length ? cursor + limit : null };
    },
    async get(id) {
      await delay(200);
      const me = ME(); need(me, 'view');
      const e = findBooking(id); const P = plat(); const { b } = e; const s = summary(e, P.settings);
      const hv = (t) => X.handoverView(e.d, b, t); const j = b.pickupJob || {}; const dj = b.deliveryJob || {};
      const tl = [];
      (b.statusHistory || []).forEach((h) => tl.push({ at: h.at, kind: 'booking', label: X.NOTE[h.status] || h.status }));
      (b.jobLog || []).forEach((l) => tl.push({ at: l.at, kind: 'driver', label: `Driver: ${l.event.replace(/_/g, ' ')} (${l.job})` }));
      if (b.receiving) tl.push({ at: b.receiving.at, kind: 'center', label: `Receipt confirmed by ${b.receiving.byName}` });
      (b.workOrder?.history || []).forEach((h) => tl.push({ at: h.at, kind: 'workorder', label: `Work order ${h.status.replace(/_/g, ' ')}` }));
      P.audit.filter((a) => a.entity === 'booking' && a.entityId === id).forEach((a) => tl.push({ at: a.at, kind: 'admin', label: `Admin ${a.adminName}: ${a.action.replace(/\./g, ' ')}${a.reason ? ` (${a.reason})` : ''}` }));
      return {
        ...s, pickup: { ...b.pickup }, delivery: b.delivery || null, notesText: b.serviceNotes || '', priority: b.priority || 'normal', issue: b.serviceType,
        driverFull: b.driver ? { id: b.driver.id, name: b.driver.name, phone: b.driver.phone } : null, deliveryDriverFull: b.deliveryDriver ? { id: b.deliveryDriver.id, name: b.deliveryDriver.name, phone: b.deliveryDriver.phone } : null,
        handovers: { pickup: { status: hv('pickup').status, verifiedAt: b.handovers.pickup.verifiedAt, attempts: e.d.otps?.[`${id}:pickup`]?.attempts || 0, driverCondition: j.inspection || null }, delivery: { status: hv('delivery').status, verifiedAt: b.handovers.delivery.verifiedAt, attempts: e.d.otps?.[`${id}:delivery`]?.attempts || 0, driverCondition: dj.inspection || null } },
        workOrder: b.workOrder ? { id: b.workOrder.id, reference: b.workOrder.reference, status: b.workOrder.status, startedAt: b.workOrder.startedAt, completedAt: b.workOrder.completedAt, technician: (read(`center:${b.centerId}`, { technicians: [] }).technicians || []).find((t) => t.id === b.workOrder.technicianId)?.name || null } : null,
        receiving: b.receiving ? { at: b.receiving.at, byName: b.receiving.byName } : null, timeline: tl.sort((a, c) => (a.at < c.at ? 1 : -1)), adminNotes: (b.adminNotes || []).slice().reverse(),
        permitted: { cancel: can(me, 'bookings.manage') && ['confirmed', 'driver_assigned', 'driver_en_route'].includes(b.status), update: can(me, 'bookings.manage') && ['confirmed', 'driver_assigned'].includes(b.status), assign: can(me, 'dispatch') },
      };
    },
    async cancel(id, reason) {
      await delay(400);
      const me = ME(); need(me, 'bookings.manage'); needReason(reason);
      const e = findBooking(id);
      if (!['confirmed', 'driver_assigned', 'driver_en_route'].includes(e.b.status)) throw new E('NOT_CANCELLABLE', 'This booking cannot be cancelled because the vehicle has already been collected or the booking is finished.');
      const before = e.b.status;
      X.setStatus(e.d, e.b, 'cancelled'); delete e.d.otps[`${id}:pickup`]; write(e.key, e.d);
      audit(me, 'booking.cancelled', 'booking', id, { reason, before: { status: before }, after: { status: 'cancelled' } });
    },
    async update(id, patch, reason) {
      await delay(300);
      const me = ME(); need(me, 'bookings.manage'); needReason(reason);
      const e = findBooking(id);
      if (!['confirmed', 'driver_assigned'].includes(e.b.status)) throw new E('NOT_ALLOWED', 'This booking can no longer be corrected because the pickup has started.');
      if (patch.date !== undefined && (!patch.date || !X.SLOTS.includes(patch.slot))) throw new E('INVALID_INPUT', 'Choose a valid pickup date and time slot.');
      const before = { date: e.b.pickup.date, slot: e.b.pickup.slot, instructions: e.b.pickup.instructions, priority: e.b.priority || 'normal' };
      if (patch.date) { e.b.pickup.date = patch.date; e.b.pickup.slot = patch.slot; }
      if (patch.instructions !== undefined) e.b.pickup.instructions = String(patch.instructions).trim();
      if (patch.priority && ['normal', 'urgent'].includes(patch.priority)) e.b.priority = patch.priority;
      e.b.updatedAt = nowISO(); write(e.key, e.d);
      audit(me, 'booking.updated', 'booking', id, { reason, before, after: { date: e.b.pickup.date, slot: e.b.pickup.slot, instructions: e.b.pickup.instructions, priority: e.b.priority || 'normal' } });
    },
    async addNote(id, text) {
      await delay(200);
      const me = ME(); need(me, 'bookings.manage');
      if (!String(text || '').trim()) throw new E('INVALID_INPUT', 'Write a note.');
      const e = findBooking(id);
      (e.b.adminNotes = e.b.adminNotes || []).push({ at: nowISO(), by: me.name, text: String(text).trim() }); write(e.key, e.d);
      audit(me, 'booking.note_added', 'booking', id);
    },
  },

  dispatch: {
    async list({ view = 'unassigned' } = {}) {
      await delay(220);
      const me = ME(); need(me, 'view');
      const P = plat(); const items = [];
      for (const e of entries()) {
        const { b } = e; const s = summary(e, P.settings);
        const decl = (t) => (b.offers || []).filter((o) => o.job === t && o.status === 'declined').map((o) => ({ driver: users().find((u) => u.id === o.driverId)?.name || o.driverId, reason: o.reason || '', at: o.at }));
        const mk = (type, state, assignee) => ({ jobId: `${b.id}~${type}`, type, booking: s, assignee, state, waitingMinutes: Math.round(mins(type === 'pickup' ? b.createdAt : b.delivery?.requestedAt || b.updatedAt)), pickupAddress: type === 'pickup' ? [b.pickup.address, b.pickup.city].filter(Boolean).join(', ') : b.center.address, destination: type === 'pickup' ? b.center.address : b.delivery?.address, declines: decl(type), offered: (b.offers || []).some((o) => o.job === type && o.status === 'offered'), reassignable: type === 'pickup' ? ['driver_assigned', 'driver_en_route'].includes(b.status) : ['delivery_driver_assigned', 'out_for_delivery'].includes(b.status) });
        if (b.status === 'confirmed' && !b.driver) items.push(mk('pickup', 'unassigned', null));
        else if (b.driver && b.status !== 'cancelled') items.push(mk('pickup', 'assigned', { id: b.driver.id, name: b.driver.name }));
        if (b.status === 'service_completed' && b.delivery && !b.deliveryDriver) items.push(mk('delivery', 'unassigned', null));
        else if (b.deliveryDriver) items.push(mk('delivery', 'assigned', { id: b.deliveryDriver.id, name: b.deliveryDriver.name }));
      }
      const pick = view === 'unassigned' ? items.filter((i) => i.state === 'unassigned') : view === 'assigned' ? items.filter((i) => i.state === 'assigned' && !['completed'].includes(i.booking.stage)) : items.filter((i) => i.declines.length);
      return pick.sort((a, c) => c.waitingMinutes - a.waitingMinutes);
    },
    /** Eligibility is decided here (server side): approved, active, online if required, and under the active-job limit. */
    async eligibleDrivers(jobId) {
      await delay(200);
      const me = ME(); need(me, 'dispatch');
      const P = plat(); const es = entries();
      return driverUsers().map((u) => {
        const v = driverView(u, es); const reasons = [];
        if (v.approval !== 'approved') reasons.push(`Not approved (${v.approval})`);
        if (u.active === false) reasons.push('Account deactivated');
        if (P.settings.assignment.requireOnline && dstate(u.id).availability !== 'online' && v.activeJobs === 0) reasons.push('Offline');
        if (v.activeJobs >= P.settings.assignment.maxActiveJobs) reasons.push(`Already on ${v.activeJobs} active ${v.activeJobs === 1 ? 'job' : 'jobs'}`);
        return { ...v, eligible: reasons.length === 0, reasons };
      }).sort((a, c) => (c.eligible - a.eligible) || (a.activeJobs - c.activeJobs));
    },
    async assign(jobId, driverId, { reason = '', expectedDriverId = null } = {}) {
      await delay(450);
      const me = ME(); need(me, 'dispatch');
      const [bookingId, type] = String(jobId).split('~');
      if (!['pickup', 'delivery'].includes(type)) throw new E('NOT_FOUND', 'Job not found.');
      const e = findBooking(bookingId); const { b } = e; const P = plat();
      const cur = type === 'pickup' ? b.driver : b.deliveryDriver;
      if ((cur?.id || null) !== (expectedDriverId || null)) throw new E('STALE', 'This job was assigned or changed by someone else. The latest state has been loaded.');
      const u = users().find((x) => x.id === driverId && x.role === 'driver');
      if (!u) throw new E('NOT_FOUND', 'Driver not found.');
      if (cur?.id === driverId) return;
      if ((u.driverStatus || 'approved') !== 'approved' || u.active === false) throw new E('NOT_ELIGIBLE', 'Only approved, active drivers can be assigned jobs.');
      const w = driverWork(driverId, entries());
      if (P.settings.assignment.requireOnline && dstate(driverId).availability !== 'online' && w.active === 0) throw new E('NOT_ELIGIBLE', 'This driver is offline. Assignment rules require an online driver.');
      if (w.active >= P.settings.assignment.maxActiveJobs) throw new E('NOT_ELIGIBLE', 'This driver already has the maximum number of active jobs.');
      const before = cur ? { driver: cur.name } : { driver: null };
      if (type === 'pickup') {
        if (b.status === 'confirmed' && !cur) { b.driver = { id: u.id, name: u.name, phone: u.phone }; X.setStatus(e.d, b, 'driver_assigned'); }
        else if (cur && ['driver_assigned', 'driver_en_route'].includes(b.status)) {
          needReason(reason);
          b.driver = { id: u.id, name: u.name, phone: u.phone }; b.pickupJob = {}; delete e.d.otps[`${bookingId}:pickup`];
          if (b.status === 'driver_en_route') X.setStatus(e.d, b, 'driver_assigned'); // the new driver starts the journey again
          X.addNote(e.d, b, 'driver_reassigned', 'Your pickup driver was changed by operations.');
        } else throw new E('NOT_ALLOWED', cur ? 'This job can no longer be reassigned because the vehicle has been collected.' : 'This pickup is not waiting for a driver.');
      } else if (b.status === 'service_completed' && b.delivery && !cur) { b.deliveryDriver = { id: u.id, name: u.name, phone: u.phone }; X.setStatus(e.d, b, 'delivery_driver_assigned'); }
      else if (cur && ['delivery_driver_assigned', 'out_for_delivery'].includes(b.status)) {
        needReason(reason);
        b.deliveryDriver = { id: u.id, name: u.name, phone: u.phone }; b.deliveryJob = {}; delete e.d.otps[`${bookingId}:delivery`];
        if (b.status === 'out_for_delivery') X.setStatus(e.d, b, 'delivery_driver_assigned');
        X.addNote(e.d, b, 'driver_reassigned', 'Your delivery driver was changed by operations.');
      } else throw new E('NOT_ALLOWED', 'This delivery is not waiting for a driver.');
      b.offers = (b.offers || []).map((o) => (o.job === type && o.status === 'offered' ? { ...o, status: 'withdrawn' } : o));
      b.updatedAt = nowISO();
      write(e.key, e.d);
      audit(me, cur ? 'assignment.reassigned' : 'assignment.assigned', 'booking', bookingId, { reason, before, after: { driver: u.name, job: type } });
    },
    /** Sends an offer the driver can accept or decline (instead of a direct assignment). */
    async offer(jobId, driverId) {
      await delay(350);
      const me = ME(); need(me, 'dispatch');
      const [bookingId, type] = String(jobId).split('~');
      const e = findBooking(bookingId); const { b } = e;
      const free = type === 'pickup' ? b.status === 'confirmed' && !b.driver : b.status === 'service_completed' && b.delivery && !b.deliveryDriver;
      if (!free) throw new E('NOT_ALLOWED', 'This job is not waiting for a driver.');
      const el = (await this.eligibleDrivers(jobId)).find((d) => d.id === driverId);
      if (!el?.eligible) throw new E('NOT_ELIGIBLE', el ? el.reasons.join('. ') : 'Driver not found.');
      if ((b.offers || []).some((o) => o.job === type && o.driverId === driverId && o.status === 'offered')) throw new E('ALREADY_OFFERED', 'This driver already has an open offer for this job.');
      (b.offers = b.offers || []).push({ job: type, driverId, status: 'offered', at: nowISO(), by: me.id });
      write(e.key, e.d);
      audit(me, 'assignment.offered', 'booking', bookingId, { after: { driver: el.name, job: type } });
    },
  },

  vehicles: {
    async list({ query = '' } = {}) {
      await delay(220);
      const me = ME(); need(me, 'view');
      const map = new Map(); const P = plat();
      for (const e of entries()) {
        const reg = (e.b.vehicle.registration || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const r = map.get(reg) || { registration: e.b.vehicle.registration, make: e.b.vehicle.make, model: e.b.vehicle.model, customers: new Set(), centers: new Set(), bookings: 0, latest: null };
        r.bookings += 1; r.customers.add(custOf(e.key, e.b).name); r.centers.add(centerName(e.b.centerId));
        if (!r.latest || e.b.createdAt > r.latest.b.createdAt) r.latest = e;
        map.set(reg, r);
      }
      const q = query.trim().toLowerCase();
      return [...map.values()].map((r) => { const s = summary(r.latest, P.settings); return { registration: r.registration, make: r.make, model: r.model, customer: [...r.customers].join(', '), centers: [...r.centers].join(', '), bookings: r.bookings, latestId: s.id, latestReference: s.reference, statusKey: s.statusKey, flags: s.flags.length }; })
        .filter((v) => !q || `${v.registration} ${v.make} ${v.model} ${v.customer}`.toLowerCase().includes(q)).sort((a, c) => a.registration.localeCompare(c.registration));
    },
  },

  workOrders: {
    async list({ status = 'all', centerId = '', query = '', stalledOnly = false } = {}) {
      await delay(220);
      const me = ME(); need(me, 'view');
      const P = plat(); const q = query.trim().toLowerCase();
      return entries().filter(({ b }) => b.workOrder).map((e) => {
        const { b } = e; const wo = b.workOrder; const lab = wo.labour.reduce((s, l) => s + l.hours * l.rate, 0); const par = wo.parts.reduce((s, p) => s + p.qty * p.unitPrice, 0);
        const stalled = flagsOf(e, P.settings).some((f) => f.type === 'stalled_work_order');
        const tech = (read(`center:${b.centerId}`, { technicians: [] }).technicians || []).find((t) => t.id === wo.technicianId);
        return { id: wo.id, reference: wo.reference, bookingId: b.id, bookingRef: b.reference, vehicle: b.vehicle.registration, center: { id: b.centerId, name: centerName(b.centerId) }, technician: tech?.name || null, status: wo.status, startedAt: wo.startedAt, completedAt: wo.completedAt, labour: Math.round(lab * 100) / 100, parts: Math.round(par * 100) / 100, total: Math.round((lab + par) * 100) / 100, stalled, deliveryStatus: b.status, demo: Boolean(b.demo) };
      }).filter((w) => status === 'all' || w.status === status).filter((w) => !centerId || w.center.id === centerId).filter((w) => !stalledOnly || w.stalled)
        .filter((w) => !q || `${w.reference} ${w.bookingRef} ${w.vehicle}`.toLowerCase().includes(q)).sort((a, c) => String(c.startedAt || '').localeCompare(String(a.startedAt || '')));
    },
  },

  handovers: {
    async list({ status = 'all' } = {}) {
      await delay(220);
      const me = ME(); need(me, 'view');
      const rows = [];
      for (const e of entries()) {
        const { b, d } = e;
        for (const t of ['pickup', 'delivery']) {
          const v = X.handoverView(d, b, t); const o = d.otps?.[`${b.id}:${t}`];
          const relevant = b.handovers[t].verifiedAt || o || (t === 'pickup' ? b.driver && b.status !== 'confirmed' : b.deliveryDriver);
          if (!relevant) continue;
          const state = v.status === 'verified' ? 'verified' : v.status === 'locked' ? 'locked' : v.status === 'expired' ? 'expired' : (o?.attempts || 0) > 0 ? 'failed_attempts' : v.status === 'pending' ? 'pending' : 'waiting';
          rows.push({ id: `${b.id}~${t}`, bookingId: b.id, reference: b.reference, type: t, vehicle: b.vehicle.registration, driver: (t === 'pickup' ? b.driver : b.deliveryDriver)?.name || null, state, attempts: o?.attempts || 0, verifiedAt: b.handovers[t].verifiedAt, recoverable: ['locked', 'expired'].includes(state), at: b.handovers[t].verifiedAt || b.updatedAt, demo: Boolean(b.demo) });
        }
      }
      return rows.filter((r) => status === 'all' || (status === 'problem' ? ['locked', 'expired', 'failed_attempts'].includes(r.state) : r.state === status)).sort((a, c) => (a.at < c.at ? 1 : -1));
    },
    /** Exceptional recovery: issues a NEW code for the customer. It never verifies a handover and never shows the code to the admin. */
    async reissue(jobId, reason) {
      await delay(400);
      const me = ME(); need(me, 'handovers.recover'); needReason(reason);
      const [bookingId, type] = String(jobId).split('~');
      const e = findBooking(bookingId); const v = X.handoverView(e.d, e.b, type);
      if (!['locked', 'expired'].includes(v.status)) throw new E('NOT_ALLOWED', 'A new code can only be issued when the current code is locked or expired.');
      const required = (type === 'pickup' && e.b.status === 'driver_en_route') || (type === 'delivery' && e.b.status === 'out_for_delivery');
      if (!required) throw new E('NOT_ALLOWED', 'No handover is waiting for a code on this booking.');
      X.issueOtp(e.d, e.b, type); write(e.key, e.d);
      audit(me, 'handover.code_reissued', 'booking', bookingId, { reason, before: { state: v.status }, after: { state: 'pending' } });
    },
  },

  alerts: {
    async list({ status = 'open', severity = 'all' } = {}) {
      await delay(200);
      const me = ME(); need(me, 'view');
      const P = plat();
      const all = alertsList(entries(), P.settings, P);
      return { items: all.filter((a) => (status === 'all' || a.status === status) && (severity === 'all' || a.severity === severity)), open: all.filter((a) => a.status === 'open' && a.severity !== 'info').length, channels: { inApp: true, sms: false, email: false, push: false } };
    },
    async acknowledge(id, resolved = false) {
      await delay(200);
      const me = ME(); need(me, 'alerts.manage');
      const P = plat(); P.alertState[id] = { status: resolved ? 'resolved' : 'acknowledged', by: me.name, at: nowISO() }; savePlat(P);
      audit(me, resolved ? 'alert.resolved' : 'alert.acknowledged', 'alert', id);
    },
    async count() { const me = ME(); const P = plat(); const all = alertsList(entries(), P.settings, P); return all.filter((a) => a.status === 'open' && a.severity !== 'info').length; },
  },

  reports: {
    async get({ from = '', to = '' } = {}) {
      await delay(300);
      const me = ME(); need(me, 'reports.view');
      const es = entries().filter(({ b }) => inRange(b.createdAt, from, to)); const P = plat();
      const byStatus = {}; const byDay = {}; const byCenter = {}; const byDriver = {};
      const dur = { pickup: [], delivery: [], workOrder: [] };
      const at = (b, s) => (b.statusHistory || []).find((h) => h.status === s)?.at;
      let failed = 0; let exceptions = 0;
      es.forEach((e) => {
        const { b, d } = e; const k = statusKey(b);
        byStatus[k] = (byStatus[k] || 0) + 1; const day = b.createdAt.slice(0, 10); byDay[day] = (byDay[day] || 0) + 1;
        const cn = centerName(b.centerId); byCenter[cn] = (byCenter[cn] || 0) + 1;
        if (b.status === 'delivered' && b.deliveryDriver) byDriver[b.deliveryDriver.name] = (byDriver[b.deliveryDriver.name] || 0) + 1;
        if (b.driver && b.pickupJob?.handedOverAt || (b.driver && AFTER.includes(b.status))) byDriver[b.driver.name] = (byDriver[b.driver.name] || 0) + 1;
        const a = at(b, 'driver_assigned'); const p = at(b, 'picked_up'); if (a && p) dur.pickup.push((new Date(p) - new Date(a)) / 6e4);
        const da = at(b, 'delivery_driver_assigned'); const dd = at(b, 'delivered'); if (da && dd) dur.delivery.push((new Date(dd) - new Date(da)) / 6e4);
        if (b.workOrder?.startedAt && b.workOrder?.completedAt) dur.workOrder.push((new Date(b.workOrder.completedAt) - new Date(b.workOrder.startedAt)) / 36e5);
        ['pickup', 'delivery'].forEach((t) => { const o = d.otps?.[`${b.id}:${t}`]; if (o && o.attempts >= 1) failed += 1; });
        if (flagsOf(e, P.settings).length) exceptions += 1;
      });
      const avg = (arr) => (arr.length ? Math.round((arr.reduce((s, x) => s + x, 0) / arr.length) * 10) / 10 : null);
      return {
        total: es.length, pickupOnly: es.filter(({ b }) => !b.delivery).length, withDelivery: es.filter(({ b }) => b.delivery).length,
        completed: byStatus.completed || 0, cancelled: byStatus.cancelled || 0, byStatus, byDay: Object.entries(byDay).sort().map(([date, count]) => ({ date, count })), byCenter, byDriver,
        avgPickupMinutes: avg(dur.pickup), pickupSample: dur.pickup.length, avgDeliveryMinutes: avg(dur.delivery), deliverySample: dur.delivery.length, avgWorkOrderHours: avg(dur.workOrder), workOrderSample: dur.workOrder.length,
        failedHandovers: failed, exceptions, demo: es.some(({ b }) => b.demo),
      };
    },
    /** Rows for CSV export. Deliberately excludes customer names, phone numbers and addresses. */
    async exportBookings({ from = '', to = '' } = {}) {
      await delay(300);
      const me = ME(); need(me, 'reports.view');
      const P = plat();
      const rows = entries().filter(({ b }) => inRange(b.createdAt, from, to)).map((e) => { const s = summary(e, P.settings); return { reference: s.reference, registration: s.vehicle.registration, center: s.center.name, type: s.type, status: s.statusKey, driver: s.driver?.name || '', created: s.createdAt, updated: s.updatedAt, scheduled: s.schedule.date, exceptions: s.flags.map((f) => f.type).join('|') }; });
      audit(me, 'report.exported', 'report', 'bookings', { reason: `${rows.length} rows, ${from || 'start'} to ${to || 'now'}` });
      return rows;
    },
  },

  audit: {
    async list({ query = '', action = 'all', cursor = 0, limit = 15 } = {}) {
      await delay(220);
      const me = ME(); need(me, 'audit.view');
      const q = query.trim().toLowerCase();
      const rows = plat().audit.slice().reverse().filter((a) => action === 'all' || a.action.startsWith(action)).filter((a) => !q || `${a.adminName} ${a.action} ${a.entity} ${a.entityId} ${a.reason}`.toLowerCase().includes(q));
      return { items: rows.slice(cursor, cursor + limit), total: rows.length, nextCursor: cursor + limit < rows.length ? cursor + limit : null };
    },
    // There is intentionally no update or delete method: the audit trail is append-only.
  },

  settings: {
    async get() { await delay(150); const me = ME(); need(me, 'view'); const P = plat(); return { ...P.settings, canEdit: can(me, 'settings.manage'), channels: { inApp: true, sms: false, email: false, push: false } }; },
    async update(next, reason) {
      await delay(300);
      const me = ME(); need(me, 'settings.manage'); needReason(reason);
      const num = (v, lo, hi, label) => { const n = Number(v); if (!Number.isFinite(n) || n < lo || n > hi) throw new E('INVALID_INPUT', `${label} must be between ${lo} and ${hi}.`); return n; };
      const a = next.alerts; const s = next.assignment;
      const clean = { alerts: { unassignedMinutes: num(a.unassignedMinutes, 1, 1440, 'Unassigned threshold'), pickupDelayMinutes: num(a.pickupDelayMinutes, 0, 1440, 'Pickup delay'), receiptDelayMinutes: num(a.receiptDelayMinutes, 1, 1440, 'Receipt delay'), stalledWorkOrderHours: num(a.stalledWorkOrderHours, 1, 720, 'Stalled work order') }, assignment: { requireOnline: Boolean(s.requireOnline), maxActiveJobs: Math.round(num(s.maxActiveJobs, 1, 10, 'Active jobs per driver')) } };
      const P = plat(); const before = P.settings; P.settings = clean; savePlat(P);
      audit(me, 'settings.updated', 'settings', 'platform', { reason, before, after: clean });
    },
  },

  demo: {
    async seed() { await delay(300); const me = ME(); need(me, 'settings.manage'); X.keepSession(X.seedWorld); },
  },
};
const AFTER = ['received_at_center', 'service_in_progress', 'service_completed', 'delivery_driver_assigned', 'out_for_delivery', 'delivered'];

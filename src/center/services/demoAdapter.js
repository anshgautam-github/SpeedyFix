/**
 * DEMO SERVICE-CENTER ADAPTER. A simulated "backend" stored in this browser's localStorage. It reads and writes the same
 * booking records as the customer and driver demo adapters, so one booking connects all three portals.
 *
 * Rules here are what a real backend must enforce: center-level isolation, role permissions, the work-order state
 * machine, stale-request rejection, receiving gates, delivery eligibility, numeric validation, idempotent creation,
 * and an audit trail. Nothing here contacts a real driver, customer or service center.
 */
import { ServiceError as E } from '../../portal/services/errors';
import { demoInternals as X } from '../../portal/services/demoAdapter';

const { NS, read, write, delay, rid, nowISO } = X;

const PERMS = {
  manager: ['bookings.create', 'bookings.manage', 'receive', 'wo.manage', 'wo.assign', 'wo.progress', 'delivery.request', 'technicians.manage', 'settings.manage', 'reports.view'],
  advisor: ['bookings.create', 'bookings.manage', 'receive', 'wo.manage', 'wo.progress', 'delivery.request', 'reports.view'],
  technician: ['wo.progress'],
};
const ME = () => {
  const u = X.sessionUser();
  if (!u) throw new E('UNAUTHENTICATED', 'Your session has ended. Sign in again.');
  if (u.role !== 'center' || !u.centerId) throw new E('FORBIDDEN', 'This area is only for service center staff.');
  if (!X.centerAvailable(u.centerId)) throw new E('CENTER_NOT_ACTIVE', 'Your service center account is not active (pending approval or suspended). Contact Speedy Fix operations.');
  return u;
};
const can = (u, perm) => (PERMS[u.staffRole || 'advisor'] || []).includes(perm);
const need = (u, perm) => { if (!can(u, perm)) throw new E('FORBIDDEN', 'Your role does not allow this action.'); };

const ckey = (id) => `center:${id}`;
const cstate = (id) => read(ckey(id), { settings: { contact: '', hours: '', hourlyRate: null }, technicians: [], seen: {} });
const centerInfo = (id) => X.allCenters().find((c) => c.id === id) || { id, name: id, address: '' };
const today = () => new Date().toISOString().slice(0, 10);
const r2 = (n) => Math.round(n * 100) / 100;
const normReg = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// ---------- reading the shared booking records, always scoped to the signed-in staff member's center ----------
function entries(me) {
  const out = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i);
    if (!k.startsWith(`${NS}data:`)) continue;
    const key = k.slice(NS.length);
    const d = JSON.parse(localStorage.getItem(k));
    for (const b of d.bookings) if (b.centerId === me.centerId) out.push({ key, d, b });
  }
  return out;
}
function findOne(me, bookingId) {
  const e = entries(me).find((x) => x.b.id === bookingId);
  // A booking of another center is indistinguishable from one that does not exist.
  if (!e) throw new E('NOT_FOUND', 'Booking not found.');
  return e;
}
const custOf = (key, b) => b.customer || { name: (read('users', []).find((u) => u.id === key.slice(5)) || {}).name || 'Customer', phone: b.pickup?.phone || '' };
const walkinKey = (centerId) => `data:walkin_${centerId}`;
function walkin(me) {
  const key = walkinKey(me.centerId);
  const d = read(key, null) || { vehicles: [], bookings: [], notifications: [], otps: {}, idem: {} };
  return { key, d };
}
const audit = (b, me, action, detail = '') => { (b.audit = b.audit || []).push({ at: nowISO(), by: me.id, byName: me.name, action, detail }); };

// ---------- status mapping ----------
function statusKey(b) {
  const s = b.status;
  if (s === 'cancelled') return 'cancelled';
  if (s === 'confirmed') return 'pending';
  if (s === 'driver_assigned') return 'driver_assigned';
  if (['driver_en_route', 'picked_up', 'in_transit'].includes(s)) return 'pickup_in_progress';
  if (s === 'received_at_center') return 'received';
  if (s === 'service_in_progress') return 'service_in_progress';
  if (s === 'service_completed') return b.delivery ? 'delivery_pending' : 'completed';
  if (['delivery_driver_assigned', 'out_for_delivery'].includes(s)) return 'delivery_pending';
  return s === 'delivered' ? 'delivered' : 'pending';
}
function deliveryStage(b) {
  if (b.status === 'delivered') return 'delivered';
  if (b.status === 'out_for_delivery') return 'out_for_delivery';
  if (b.status === 'delivery_driver_assigned') return 'driver_assigned';
  if (b.status === 'service_completed') return b.delivery ? 'awaiting_driver' : 'ready';
  return null;
}

// ---------- work orders ----------
function ensureWO(b) {
  if (!b.workOrder) b.workOrder = { id: `wo_${b.id}`, reference: `WO-DEMO-${String(b.reference).slice(-5)}`, status: 'new', technicianId: null, createdAt: nowISO(), startedAt: null, completedAt: null, labour: [], parts: [], history: [{ status: 'new', at: nowISO(), by: 'system' }] };
  return b.workOrder;
}
const totals = (wo) => {
  const labour = r2(wo.labour.reduce((s, l) => s + l.hours * l.rate, 0));
  const parts = r2(wo.parts.reduce((s, p) => s + p.qty * p.unitPrice, 0));
  return { labour, parts, total: r2(labour + parts), labourHours: r2(wo.labour.reduce((s, l) => s + l.hours, 0)) };
};
const WO = {
  new: { accept: ['accepted', 'wo.manage'], cancel: ['cancelled', 'wo.manage'] },
  accepted: { assign: [null, 'wo.assign'], cancel: ['cancelled', 'wo.manage'] },
  assigned: { assign: [null, 'wo.assign'], start: ['in_progress', 'wo.progress'], cancel: ['cancelled', 'wo.manage'] },
  in_progress: { assign: [null, 'wo.assign'], hold_parts: ['waiting_parts', 'wo.progress'], complete_service: ['quality_check', 'wo.progress'] },
  waiting_parts: { assign: [null, 'wo.assign'], resume: ['in_progress', 'wo.progress'] },
  quality_check: { pass_qc: ['completed', 'wo.manage'], fail_qc: ['in_progress', 'wo.manage'] },
};
const ownWO = (me, wo) => me.staffRole !== 'technician' || wo.technicianId === me.technicianId;
const allowedActions = (me, wo) => Object.entries(WO[wo.status] || {}).filter(([, [, perm]]) => can(me, perm) && (perm !== 'wo.progress' || ownWO(me, wo))).map(([a]) => a);

function woView(me, cs, e) {
  const { b } = e;
  const wo = b.workOrder;
  const tech = wo.technicianId ? cs.technicians.find((t) => t.id === wo.technicianId) : null;
  const cust = custOf(e.key, b);
  return {
    id: wo.id, reference: wo.reference, bookingId: b.id, bookingRef: b.reference, status: wo.status,
    vehicle: { registration: b.vehicle.registration, make: b.vehicle.make, model: b.vehicle.model },
    customer: cust, technician: tech ? { id: tech.id, name: tech.name } : null,
    startedAt: wo.startedAt, completedAt: wo.completedAt, createdAt: wo.createdAt,
    labour: wo.labour.map((l) => ({ ...l, technicianName: cs.technicians.find((t) => t.id === l.technicianId)?.name || 'Technician', total: r2(l.hours * l.rate) })),
    parts: wo.parts.map((p) => ({ ...p, total: r2(p.qty * p.unitPrice) })),
    totals: totals(wo), history: wo.history, allowed: allowedActions(me, wo),
    editable: ['in_progress', 'waiting_parts'].includes(wo.status) && can(me, 'wo.progress') && ownWO(me, wo),
    bookingStatus: b.status, demo: Boolean(b.demo),
  };
}

// ---------- booking views ----------
function bookingSummary(me, cs, e) {
  const { b } = e;
  const cust = custOf(e.key, b);
  const wo = b.workOrder;
  return {
    id: b.id, reference: b.reference, type: 'pickup', vehicle: { registration: b.vehicle.registration, make: b.vehicle.make, model: b.vehicle.model },
    customer: cust, priority: b.priority || 'normal', issue: b.serviceType,
    schedule: { date: b.pickup.date, slot: b.pickup.slot }, delivery: b.delivery || null,
    driver: b.driver ? { name: b.driver.name } : null, status: b.status, statusKey: statusKey(b),
    workOrder: wo ? { id: wo.id, reference: wo.reference, status: wo.status, technician: cs.technicians.find((t) => t.id === wo.technicianId)?.name || null } : null,
    updatedAt: b.updatedAt, createdAt: b.createdAt, createdBy: b.createdBy?.type || 'customer', demo: Boolean(b.demo),
  };
}
function timeline(b) {
  const out = [];
  (b.statusHistory || []).forEach((h) => out.push({ at: h.at, kind: 'booking', label: X.NOTE[h.status] || h.status }));
  (b.jobLog || []).filter((l) => ['arrived', 'inspected', 'verified', 'center_arrived', 'handed_over', 'started'].includes(l.event)).forEach((l) => out.push({ at: l.at, kind: 'driver', label: ({ arrived: 'Driver arrived', inspected: 'Driver recorded vehicle condition', verified: 'Handover verified with OTP', center_arrived: 'Driver arrived at the service center', handed_over: 'Driver handed the vehicle to the center', started: 'Driver started a journey' })[l.event] }));
  if (b.receiving) out.push({ at: b.receiving.at, kind: 'center', label: `Receipt confirmed by ${b.receiving.byName}` });
  (b.workOrder?.history || []).forEach((h) => out.push({ at: h.at, kind: 'workorder', label: `Work order ${h.status.replace(/_/g, ' ')}${h.note ? `: ${h.note}` : ''}` }));
  if (b.delivery) out.push({ at: b.delivery.requestedAt || b.updatedAt, kind: 'center', label: `Delivery requested for ${b.delivery.date}, ${b.delivery.slot}` });
  return out.sort((a, c) => (a.at < c.at ? 1 : -1));
}
function bookingDetail(me, cs, e) {
  const { b } = e;
  const j = b.pickupJob || {};
  const dj = b.deliveryJob || {};
  const hv = (t) => X.handoverView(e.d, b, t);
  const editable = ['confirmed', 'driver_assigned'].includes(b.status);
  return {
    ...bookingSummary(me, cs, e),
    pickup: { ...b.pickup }, notes: b.serviceNotes || '', center: b.center, driver: b.driver ? { ...b.driver, id: undefined } : null, deliveryDriver: b.deliveryDriver ? { ...b.deliveryDriver, id: undefined } : null,
    handovers: {
      pickup: { status: hv('pickup').status, verifiedAt: b.handovers.pickup.verifiedAt, driverCondition: j.inspection || null },
      delivery: { status: hv('delivery').status, verifiedAt: b.handovers.delivery.verifiedAt, driverCondition: dj.inspection || null },
    },
    driverArrivedAt: j.centerArrivedAt || null, driverHandedOverAt: j.handedOverAt || null,
    receiving: b.receiving || null, receivable: receivable(b),
    timeline: timeline(b), audit: can(me, 'settings.manage') ? (b.audit || []).slice().reverse() : [],
    workOrderFull: b.workOrder ? woView(me, cs, { ...e }) : null,
    permitted: {
      update: editable && can(me, 'bookings.manage'), cancel: editable && can(me, 'bookings.manage'),
      receive: receivable(b) && can(me, 'receive'), requestDelivery: deliveryEligible(b) && can(me, 'delivery.request'),
    },
    deliveryDefaults: { address: [b.pickup.address, b.pickup.city, b.pickup.postalCode].filter(Boolean).join(', ') },
    photos: [], // No storage integration exists in this build.
  };
}
const receivable = (b) => b.status === 'in_transit' && Boolean(b.pickupJob?.centerArrivedAt || b.pickupJob?.handedOverAt) && !b.receiving;
const deliveryEligible = (b) => b.status === 'service_completed' && b.workOrder?.status === 'completed' && !b.delivery;

function validateReceiving(c = {}) {
  const miss = [];
  if (c.identityConfirmed !== true) miss.push('vehicle identity');
  if (!['good', 'minor', 'damage'].includes(c.exterior)) miss.push('exterior condition');
  if (!['none', 'present'].includes(c.scratches)) miss.push('scratches or dents');
  if (miss.length) throw new E('INVALID_INPUT', `Complete the required checks: ${miss.join(', ')}.`);
  if ((c.scratches === 'present' || c.exterior === 'damage') && !String(c.notes || '').trim()) throw new E('INVALID_INPUT', 'Describe the visible damage in the notes.');
  return { identityConfirmed: true, exterior: c.exterior, scratches: c.scratches, fuel: c.fuel || '', accessories: String(c.accessories || '').trim(), notes: String(c.notes || '').trim() };
}

export const demoCenterAdapter = {
  mode: 'demo',

  context: {
    async get() {
      await delay(120);
      const me = ME();
      const cs = cstate(me.centerId);
      const c = centerInfo(me.centerId);
      return { user: { id: me.id, name: me.name, email: me.email, staffRole: me.staffRole || 'advisor', technicianId: me.technicianId || null }, center: { id: c.id, name: c.name, address: c.address, ...cs.settings, currency: 'INR', demo: Boolean(c.demo) }, permissions: PERMS[me.staffRole || 'advisor'] || [] };
    },
  },

  dashboard: {
    async get() {
      await delay(200);
      const me = ME();
      need(me, 'bookings.manage');
      const cs = cstate(me.centerId);
      const es = entries(me);
      const sums = es.map((e) => bookingSummary(me, cs, e));
      const t = today();
      const inWorkshopStatuses = ['received_at_center', 'service_in_progress', 'service_completed', 'delivery_driver_assigned'];
      const wos = es.filter((e) => e.b.workOrder);
      const workshop = wos.filter((e) => inWorkshopStatuses.includes(e.b.status) || (e.b.status === 'service_completed')).map((e) => woView(me, cs, e));
      const attention = [];
      es.forEach((e) => {
        const b = e.b; const wo = b.workOrder;
        if (receivable(b)) attention.push({ id: `a_arr_${b.id}`, bookingId: b.id, kind: 'receive', text: `${b.vehicle.registration} has arrived. Receive the vehicle.`, priority: 1 });
        if (wo?.status === 'new') attention.push({ id: `a_new_${b.id}`, bookingId: b.id, workOrderId: wo.id, kind: 'accept', text: `${wo.reference} needs to be accepted.`, priority: 2 });
        if (wo?.status === 'accepted') attention.push({ id: `a_asg_${b.id}`, bookingId: b.id, workOrderId: wo.id, kind: 'assign', text: `${wo.reference} needs a technician.`, priority: 2 });
        if (wo?.status === 'waiting_parts') attention.push({ id: `a_wp_${b.id}`, bookingId: b.id, workOrderId: wo.id, kind: 'parts', text: `${wo.reference} is waiting for parts.`, priority: 3 });
        if (wo?.status === 'quality_check') attention.push({ id: `a_qc_${b.id}`, bookingId: b.id, workOrderId: wo.id, kind: 'qc', text: `${wo.reference} is waiting for a quality check.`, priority: 2 });
        if (deliveryEligible(b)) attention.push({ id: `a_del_${b.id}`, bookingId: b.id, kind: 'delivery', text: `${b.vehicle.registration} is ready. Request delivery.`, priority: 2 });
        if (b.status === 'service_completed' && b.delivery && !b.deliveryDriver) attention.push({ id: `a_drv_${b.id}`, bookingId: b.id, kind: 'driver', text: `Delivery for ${b.vehicle.registration} is waiting for a driver.`, priority: 3 });
      });
      const ws = (s) => workshop.filter((w) => w.status === s);
      return {
        counts: {
          bookingsToday: sums.filter((s) => s.schedule.date === t || (s.createdAt || '').slice(0, 10) === t).length,
          pendingPickup: sums.filter((s) => ['pending', 'driver_assigned'].includes(s.statusKey) || ['driver_en_route'].includes(s.status)).length,
          awaitingArrival: es.filter((e) => ['picked_up', 'in_transit'].includes(e.b.status) && !e.b.receiving).length,
          openWorkOrders: wos.filter((e) => !['completed', 'cancelled'].includes(e.b.workOrder.status)).length,
          inProgress: wos.filter((e) => e.b.workOrder.status === 'in_progress').length,
          completedServices: wos.filter((e) => e.b.workOrder.status === 'completed').length,
          awaitingDelivery: es.filter((e) => ['service_completed', 'delivery_driver_assigned'].includes(e.b.status)).length,
        },
        workshop: { vehicles: workshop.filter((w) => w.status !== 'completed' || w.bookingStatus === 'service_completed'), inProgress: ws('in_progress'), waitingParts: ws('waiting_parts'), qualityCheck: ws('quality_check'), readyForDelivery: workshop.filter((w) => w.status === 'completed' && ['service_completed', 'delivery_driver_assigned'].includes(w.bookingStatus)) },
        attention: attention.sort((a, c) => a.priority - c.priority).slice(0, 8),
        recent: sums.sort((a, c) => (a.updatedAt < c.updatedAt ? 1 : -1)).slice(0, 5),
        totalBookings: sums.length,
      };
    },
  },

  bookings: {
    async list({ status = 'all', query = '', cursor = 0, limit = 8 } = {}) {
      await delay(180);
      const me = ME();
      need(me, 'bookings.manage');
      const cs = cstate(me.centerId);
      const q = query.trim().toLowerCase();
      const all = entries(me).map((e) => bookingSummary(me, cs, e))
        .filter((s) => status === 'all' || s.statusKey === status)
        .filter((s) => !q || `${s.reference} ${s.customer.name} ${s.vehicle.registration} ${s.vehicle.make} ${s.vehicle.model}`.toLowerCase().includes(q))
        .sort((a, c) => (a.updatedAt < c.updatedAt ? 1 : -1));
      return { items: all.slice(cursor, cursor + limit), total: all.length, nextCursor: cursor + limit < all.length ? cursor + limit : null };
    },
    async get(id) {
      await delay(150);
      const me = ME();
      need(me, 'bookings.manage');
      return bookingDetail(me, cstate(me.centerId), findOne(me, id));
    },
    /** Recognizes a returning vehicle by registration so staff do not re-enter customer details. */
    async lookupVehicle(registration) {
      await delay(120);
      const me = ME();
      need(me, 'bookings.create');
      const reg = normReg(registration);
      if (reg.length < 5) return null;
      const hit = entries(me).filter((e) => normReg(e.b.vehicle.registration) === reg).sort((a, c) => (a.b.createdAt < c.b.createdAt ? 1 : -1))[0];
      if (!hit) return null;
      const cust = custOf(hit.key, hit.b);
      return { make: hit.b.vehicle.make, model: hit.b.vehicle.model, customerName: cust.name, customerPhone: cust.phone, address: hit.b.pickup.address, city: hit.b.pickup.city, postalCode: hit.b.pickup.postalCode, landmark: hit.b.pickup.landmark, lastReference: hit.b.reference };
    },
    async createPickup(p, idempotencyKey) {
      await delay(500);
      const me = ME();
      need(me, 'bookings.create');
      const cs = cstate(me.centerId);
      const w = walkin(me);
      if (idempotencyKey && w.d.idem[idempotencyKey]) return bookingDetail(me, cs, findOne(me, w.d.idem[idempotencyKey]));
      const reg = normReg(p.registration);
      const phone = String(p.customerPhone || '').replace(/[\s()+-]/g, '');
      if (reg.length < 5 || !/[A-Z]/.test(reg) || !/\d/.test(reg)) throw new E('INVALID_INPUT', 'Enter a valid registration number.');
      if (!p.customerName?.trim()) throw new E('INVALID_INPUT', 'Enter the customer name.');
      if (!/^\d{7,15}$/.test(phone)) throw new E('INVALID_INPUT', 'Enter a valid customer phone number.');
      if (!p.address?.trim() || !p.city?.trim()) throw new E('INVALID_INPUT', 'Enter the pickup address and city.');
      if (!p.issueType) throw new E('INVALID_INPUT', 'Choose a service or issue type.');
      if (!['normal', 'urgent'].includes(p.priority)) throw new E('INVALID_INPUT', 'Choose a priority.');
      if (!p.date || p.date < today() || !X.SLOTS.includes(p.slot)) throw new E('INVALID_INPUT', 'Choose a pickup date (today or later) and a time slot.');
      // The same vehicle cannot have two open bookings at this center.
      if (entries(me).some((e) => normReg(e.b.vehicle.registration) === reg && !['delivered', 'cancelled'].includes(e.b.status))) throw new E('DUPLICATE_OPEN_BOOKING', `${p.registration.toUpperCase()} already has an open booking at this center.`);
      const prior = entries(me).find((e) => normReg(e.b.vehicle.registration) === reg);
      const t = nowISO();
      const b = {
        id: `b_${rid()}`, reference: `SF-DEMO-${Math.floor(10000 + Math.random() * 89999)}`, vehicleId: prior?.b.vehicleId || '',
        vehicle: { make: (p.make || prior?.b.vehicle.make || 'Unknown').trim(), model: (p.model || prior?.b.vehicle.model || '').trim(), year: prior?.b.vehicle.year || null, registration: reg, type: prior?.b.vehicle.type || '' },
        customer: { name: p.customerName.trim(), phone }, serviceType: p.issueType, serviceNotes: '', priority: p.priority,
        pickup: { address: p.address.trim(), city: p.city.trim(), postalCode: (p.postalCode || '').trim(), landmark: (p.landmark || '').trim(), phone, date: p.date, slot: p.slot, instructions: (p.instructions || '').trim() },
        centerId: me.centerId, center: { name: centerInfo(me.centerId).name, address: centerInfo(me.centerId).address },
        status: 'confirmed', driver: null, deliveryDriver: null, delivery: null, demo: true, createdAt: t, updatedAt: t, statusHistory: [{ status: 'confirmed', at: t }],
        handovers: { pickup: { verifiedAt: null }, delivery: { verifiedAt: null } }, createdBy: { type: 'center', id: me.id },
      };
      audit(b, me, 'booking.created', b.reference);
      w.d.bookings.push(b);
      if (idempotencyKey) w.d.idem[idempotencyKey] = b.id;
      write(w.key, w.d);
      return bookingDetail(me, cs, findOne(me, b.id));
    },
    async update(id, patch) {
      await delay(300);
      const me = ME();
      need(me, 'bookings.manage');
      const e = findOne(me, id);
      if (!['confirmed', 'driver_assigned'].includes(e.b.status)) throw new E('NOT_ALLOWED', 'This booking can no longer be changed because the pickup has started.');
      if (patch.date !== undefined && (patch.date < today() || !X.SLOTS.includes(patch.slot))) throw new E('INVALID_INPUT', 'Choose a pickup date (today or later) and a time slot.');
      if (patch.date) { e.b.pickup.date = patch.date; e.b.pickup.slot = patch.slot; }
      if (patch.landmark !== undefined) e.b.pickup.landmark = String(patch.landmark).trim();
      if (patch.instructions !== undefined) e.b.pickup.instructions = String(patch.instructions).trim();
      if (patch.priority && ['normal', 'urgent'].includes(patch.priority)) e.b.priority = patch.priority;
      e.b.updatedAt = nowISO();
      audit(e.b, me, 'booking.updated');
      write(e.key, e.d);
      return bookingDetail(me, cstate(me.centerId), e);
    },
    async cancel(id) {
      await delay(400);
      const me = ME();
      need(me, 'bookings.manage');
      const e = findOne(me, id);
      if (!['confirmed', 'driver_assigned'].includes(e.b.status)) throw new E('NOT_CANCELLABLE', 'This booking can no longer be cancelled because the pickup has already started.');
      X.setStatus(e.d, e.b, 'cancelled');
      audit(e.b, me, 'booking.cancelled');
      write(e.key, e.d);
      return bookingDetail(me, cstate(me.centerId), e);
    },
  },

  receiving: {
    async list() {
      await delay(180);
      const me = ME();
      need(me, 'receive');
      const cs = cstate(me.centerId);
      return entries(me).filter((e) => ['picked_up', 'in_transit'].includes(e.b.status) && !e.b.receiving).map((e) => ({ ...bookingSummary(me, cs, e), arrived: receivable(e.b), driverArrivedAt: e.b.pickupJob?.centerArrivedAt || null }));
    },
    /** Confirms the vehicle physically arrived. Needs the driver's arrival record; creates the one work order for the visit. */
    async confirm(bookingId, checklist) {
      await delay(500);
      const me = ME();
      need(me, 'receive');
      const e = findOne(me, bookingId);
      if (e.b.receiving || e.b.status === 'received_at_center') throw new E('ALREADY_RECEIVED', 'This vehicle has already been received.');
      if (!receivable(e.b)) throw new E('NOT_ARRIVED', 'The driver has not recorded arrival at the service center yet, so the vehicle cannot be received.');
      const rec = validateReceiving(checklist);
      e.b.receiving = { ...rec, at: nowISO(), by: me.id, byName: me.name };
      X.setStatus(e.d, e.b, 'received_at_center');
      ensureWO(e.b);
      audit(e.b, me, 'vehicle.received');
      write(e.key, e.d);
      return bookingDetail(me, cstate(me.centerId), e);
    },
  },

  workOrders: {
    async list({ status = 'all', query = '', technicianId = '', cursor = 0, limit = 8 } = {}) {
      await delay(180);
      const me = ME();
      if (!can(me, 'wo.progress')) throw new E('FORBIDDEN', 'Your role does not allow this action.');
      const cs = cstate(me.centerId);
      const q = query.trim().toLowerCase();
      const all = entries(me).filter((e) => e.b.workOrder).map((e) => woView(me, cs, e))
        .filter((w) => ownWO(me, { technicianId: w.technician?.id }))
        .filter((w) => status === 'all' || w.status === status).filter((w) => !technicianId || w.technician?.id === technicianId)
        .filter((w) => !q || `${w.reference} ${w.bookingRef} ${w.vehicle.registration} ${w.customer.name}`.toLowerCase().includes(q))
        .sort((a, c) => (a.createdAt < c.createdAt ? 1 : -1));
      return { items: all.slice(cursor, cursor + limit), total: all.length, nextCursor: cursor + limit < all.length ? cursor + limit : null };
    },
    async get(id) {
      await delay(150);
      const me = ME();
      if (!can(me, 'wo.progress')) throw new E('FORBIDDEN', 'Your role does not allow this action.');
      const e = entries(me).find((x) => x.b.workOrder?.id === id);
      if (!e || !ownWO(me, e.b.workOrder)) throw new E('NOT_FOUND', 'Work order not found.');
      return woView(me, cstate(me.centerId), e);
    },
    async transition(id, action, { expectedStatus, payload = {} } = {}) {
      await delay(350);
      const me = ME();
      const cs = cstate(me.centerId);
      const e = entries(me).find((x) => x.b.workOrder?.id === id);
      if (!e || !ownWO(me, e.b.workOrder)) throw new E('NOT_FOUND', 'Work order not found.');
      const wo = e.b.workOrder;
      if (expectedStatus && expectedStatus !== wo.status) throw new E('STALE', 'This work order has changed since you opened it. The latest state has been loaded.', { status: wo.status });
      const rule = (WO[wo.status] || {})[action];
      if (!rule) throw new E('INVALID_TRANSITION', `That step is not available while the work order is "${wo.status.replace(/_/g, ' ')}".`);
      need(me, rule[1]);
      if (rule[1] === 'wo.progress' && !ownWO(me, wo)) throw new E('FORBIDDEN', 'You can only update work orders assigned to you.');
      const t = nowISO();
      let to = rule[0];
      if (action === 'assign') {
        const tech = cs.technicians.find((x) => x.id === payload.technicianId);
        if (!tech) throw new E('INVALID_INPUT', 'Choose a technician from your center.');
        if (!tech.active) throw new E('INVALID_INPUT', 'That technician is deactivated.');
        wo.technicianId = tech.id;
        to = wo.status === 'accepted' ? 'assigned' : wo.status;
        wo.status = to;
        wo.history.push({ status: to, at: t, by: me.id, note: `Assigned to ${tech.name}` });
      } else {
        if (action === 'complete_service' && !wo.labour.length) throw new E('INVALID_INPUT', 'Record labour hours before completing servicing.');
        if (action === 'fail_qc' && !String(payload.reason || '').trim()) throw new E('INVALID_INPUT', 'Say why the quality check failed.');
        if (action === 'cancel' && !String(payload.reason || '').trim()) throw new E('INVALID_INPUT', 'Give a reason for cancelling.');
        wo.status = to;
        wo.history.push({ status: to, at: t, by: me.id, note: payload.reason ? String(payload.reason).trim() : undefined });
        if (action === 'start') { wo.startedAt = wo.startedAt || t; X.setStatus(e.d, e.b, 'service_in_progress'); }
        if (action === 'pass_qc') { wo.completedAt = t; X.setStatus(e.d, e.b, 'service_completed'); }
      }
      audit(e.b, me, `workorder.${action}`, payload.reason || '');
      e.b.updatedAt = t;
      write(e.key, e.d);
      return woView(me, cs, e);
    },
    async addLabour(id, entry) {
      await delay(250);
      const { me, e, cs } = woScope(id);
      const hours = Number(entry.hours);
      const rate = entry.rate === '' || entry.rate == null ? cs.settings.hourlyRate : Number(entry.rate);
      if (!Number.isFinite(hours) || hours <= 0 || hours > 100) throw new E('INVALID_INPUT', 'Hours must be more than 0 and at most 100.');
      if (rate == null || !Number.isFinite(rate)) throw new E('INVALID_INPUT', 'No hourly rate is set. Enter a rate or ask a manager to set the default in Settings.');
      if (rate < 0 || rate > 100000) throw new E('INVALID_INPUT', 'Enter a valid hourly rate.');
      const tech = cs.technicians.find((t) => t.id === (entry.technicianId || e.b.workOrder.technicianId));
      if (!tech) throw new E('INVALID_INPUT', 'Choose a technician from your center.');
      e.b.workOrder.labour.push({ id: `l_${rid()}`, technicianId: tech.id, hours: r2(hours), rate: r2(rate), description: String(entry.description || '').trim() });
      return finishWO(me, cs, e, 'workorder.labour_added');
    },
    async removeLabour(id, entryId) {
      await delay(200);
      const { me, e, cs } = woScope(id);
      e.b.workOrder.labour = e.b.workOrder.labour.filter((l) => l.id !== entryId);
      return finishWO(me, cs, e, 'workorder.labour_removed');
    },
    async addPart(id, part) {
      await delay(250);
      const { me, e, cs } = woScope(id);
      const qty = Number(part.qty);
      const unitPrice = Number(part.unitPrice);
      if (!String(part.description || '').trim()) throw new E('INVALID_INPUT', 'Describe the part.');
      if (!Number.isInteger(qty) || qty < 1 || qty > 999) throw new E('INVALID_INPUT', 'Quantity must be a whole number from 1 to 999.');
      if (!Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 10000000) throw new E('INVALID_INPUT', 'Enter a valid unit price (zero or more).');
      e.b.workOrder.parts.push({ id: `p_${rid()}`, description: part.description.trim(), qty, unitPrice: r2(unitPrice) });
      return finishWO(me, cs, e, 'workorder.part_added');
    },
    async removePart(id, partId) {
      await delay(200);
      const { me, e, cs } = woScope(id);
      e.b.workOrder.parts = e.b.workOrder.parts.filter((p) => p.id !== partId);
      return finishWO(me, cs, e, 'workorder.part_removed');
    },
  },

  technicians: {
    async list() {
      await delay(180);
      const me = ME();
      need(me, 'wo.assign');
      const cs = cstate(me.centerId);
      const wos = entries(me).filter((e) => e.b.workOrder);
      return cs.technicians.map((t) => {
        const mine = wos.filter((e) => e.b.workOrder.technicianId === t.id);
        const active = mine.filter((e) => !['completed', 'cancelled'].includes(e.b.workOrder.status));
        return { ...t, activeCount: active.length, completedCount: mine.filter((e) => e.b.workOrder.status === 'completed').length, active: t.active, assignments: active.map((e) => ({ workOrderId: e.b.workOrder.id, reference: e.b.workOrder.reference, registration: e.b.vehicle.registration, status: e.b.workOrder.status })), inactive: !t.active };
      });
    },
    async create({ name, phone }) {
      await delay(300);
      const me = ME();
      need(me, 'technicians.manage');
      if (!String(name || '').trim()) throw new E('INVALID_INPUT', 'Enter the technician name.');
      const cs = cstate(me.centerId);
      if (cs.technicians.some((t) => t.name.toLowerCase() === name.trim().toLowerCase())) throw new E('DUPLICATE', 'A technician with this name already exists.');
      cs.technicians.push({ id: `t_${rid()}`, name: name.trim(), phone: String(phone || '').trim(), active: true });
      write(ckey(me.centerId), cs);
    },
    async setActive(id, active) {
      await delay(250);
      const me = ME();
      need(me, 'technicians.manage');
      const cs = cstate(me.centerId);
      const t = cs.technicians.find((x) => x.id === id);
      if (!t) throw new E('NOT_FOUND', 'Technician not found.');
      if (!active && entries(me).some((e) => e.b.workOrder && e.b.workOrder.technicianId === id && !['completed', 'cancelled'].includes(e.b.workOrder.status))) throw new E('HAS_ASSIGNMENTS', 'This technician has open work orders. Reassign them first.');
      t.active = Boolean(active);
      write(ckey(me.centerId), cs);
    },
  },

  deliveries: {
    async list({ stage = 'all' } = {}) {
      await delay(180);
      const me = ME();
      need(me, 'bookings.manage');
      const cs = cstate(me.centerId);
      return entries(me).map((e) => ({ e, stg: deliveryStage(e.b) })).filter((x) => x.stg && (stage === 'all' || x.stg === stage))
        .map(({ e, stg }) => ({ ...bookingSummary(me, cs, e), stage: stg, deliveryAddress: e.b.delivery?.address || null, deliveryDriver: e.b.deliveryDriver ? { name: e.b.deliveryDriver.name } : null, deliveredAt: e.b.handovers.delivery.verifiedAt, deliveryVerified: Boolean(e.b.handovers.delivery.verifiedAt), eligible: deliveryEligible(e.b), deliveryDefaults: { address: [e.b.pickup.address, e.b.pickup.city, e.b.pickup.postalCode].filter(Boolean).join(', ') } }))
        .sort((a, c) => (a.updatedAt < c.updatedAt ? 1 : -1));
    },
    async request(bookingId, { date, slot, address, notes }, idempotencyKey) {
      await delay(450);
      const me = ME();
      need(me, 'delivery.request');
      const e = findOne(me, bookingId);
      if (e.b.delivery && idempotencyKey && e.b.delivery.key === idempotencyKey) return bookingDetail(me, cstate(me.centerId), e);
      if (e.b.delivery) throw new E('ALREADY_REQUESTED', 'Delivery has already been requested for this booking.');
      if (!deliveryEligible(e.b)) throw new E('NOT_ELIGIBLE', 'Delivery can only be requested after the work order is completed and the quality check has passed.');
      if (!date || date < today() || !X.SLOTS.includes(slot)) throw new E('INVALID_INPUT', 'Choose a delivery date (today or later) and a time slot.');
      if (!String(address || '').trim()) throw new E('INVALID_INPUT', 'Enter the delivery address.');
      e.b.delivery = { date, slot, address: address.trim(), notes: String(notes || '').trim(), requestedBy: 'center', requestedAt: nowISO(), key: idempotencyKey || null };
      e.b.updatedAt = nowISO();
      X.addNote(e.d, e.b, 'delivery_scheduled', `The service center requested delivery for ${date}, ${slot}.`);
      audit(e.b, me, 'delivery.requested');
      write(e.key, e.d);
      return bookingDetail(me, cstate(me.centerId), e);
    },
  },

  vehicles: {
    async list({ query = '' } = {}) {
      await delay(180);
      const me = ME();
      need(me, 'bookings.manage');
      const cs = cstate(me.centerId);
      const map = new Map();
      for (const e of entries(me)) {
        const reg = normReg(e.b.vehicle.registration);
        const row = map.get(reg) || { registration: e.b.vehicle.registration, make: e.b.vehicle.make, model: e.b.vehicle.model, customer: custOf(e.key, e.b).name, bookings: 0, latest: null, lastServiceDate: null };
        row.bookings += 1;
        if (!row.latest || e.b.createdAt > row.latest.createdAt) row.latest = e.b;
        const done = e.b.workOrder?.completedAt;
        if (done && (!row.lastServiceDate || done > row.lastServiceDate)) row.lastServiceDate = done;
        map.set(reg, row);
      }
      const q = query.trim().toLowerCase();
      return [...map.values()].map((r) => ({
        registration: r.registration, make: r.make, model: r.model, customer: r.customer, bookings: r.bookings, latestReference: r.latest.reference, latestBookingId: r.latest.id,
        workOrderStatus: r.latest.workOrder?.status || null, lastServiceDate: r.lastServiceDate,
        workshopStatus: r.latest.workOrder && !['delivered', 'cancelled'].includes(r.latest.status) ? 'In workshop' : ['picked_up', 'in_transit'].includes(r.latest.status) ? 'On the way' : 'Not at the workshop',
      })).filter((r) => !q || `${r.registration} ${r.make} ${r.model} ${r.customer}`.toLowerCase().includes(q)).sort((a, c) => a.registration.localeCompare(c.registration));
    },
  },

  reports: {
    async get() {
      await delay(250);
      const me = ME();
      need(me, 'reports.view');
      const es = entries(me);
      const byStatus = {};
      es.forEach((e) => { const k = statusKey(e.b); byStatus[k] = (byStatus[k] || 0) + 1; });
      const wos = es.filter((e) => e.b.workOrder).map((e) => e.b.workOrder);
      const done = wos.filter((w) => w.status === 'completed');
      const timed = done.filter((w) => w.startedAt && w.completedAt);
      const sum = wos.reduce((a, w) => { const t = totals(w); return { labour: a.labour + t.labour, parts: a.parts + t.parts }; }, { labour: 0, parts: 0 });
      return {
        total: es.length, byStatus, completedWorkOrders: done.length,
        inWorkshop: es.filter((e) => e.b.workOrder && !['delivered', 'cancelled'].includes(e.b.status)).length,
        avgServiceHours: timed.length ? r2(timed.reduce((s, w) => s + (new Date(w.completedAt) - new Date(w.startedAt)) / 36e5, 0) / timed.length) : null, timedSample: timed.length,
        labourTotal: r2(sum.labour), partsTotal: r2(sum.parts), pendingDeliveries: es.filter((e) => ['service_completed', 'delivery_driver_assigned', 'out_for_delivery'].includes(e.b.status)).length,
        demo: es.some((e) => e.b.demo),
      };
    },
  },

  activity: {
    async list() {
      await delay(120);
      const me = ME();
      const cs = cstate(me.centerId);
      const items = [];
      for (const e of entries(me)) timeline(e.b).forEach((t, i) => items.push({ id: `${e.b.id}:${t.at}:${i}`, at: t.at, text: `${e.b.reference} · ${e.b.vehicle.registration}: ${t.label}`, bookingId: e.b.id, kind: t.kind }));
      items.sort((a, c) => (a.at < c.at ? 1 : -1));
      const seen = cs.seen[me.id] || '';
      return { items: items.slice(0, 20), unread: items.filter((i) => i.at > seen).length };
    },
    async markSeen() {
      const me = ME();
      const cs = cstate(me.centerId);
      cs.seen[me.id] = nowISO();
      write(ckey(me.centerId), cs);
    },
  },

  settings: {
    async get() {
      await delay(150);
      const me = ME();
      const cs = cstate(me.centerId);
      const c = centerInfo(me.centerId);
      const staff = read('users', []).filter((u) => u.role === 'center' && u.centerId === me.centerId).map((u) => ({ id: u.id, name: u.name, email: u.email, staffRole: u.staffRole || 'advisor', status: 'active' }));
      return { center: { id: c.id, name: c.name, address: c.address, demo: Boolean(c.demo) }, ...cs.settings, currency: 'INR', staff, canEdit: can(me, 'settings.manage') };
    },
    async update({ contact, hours, hourlyRate }) {
      await delay(300);
      const me = ME();
      need(me, 'settings.manage');
      const rate = hourlyRate === '' || hourlyRate == null ? null : Number(hourlyRate);
      if (rate != null && (!Number.isFinite(rate) || rate < 0 || rate > 100000)) throw new E('INVALID_INPUT', 'Enter a valid hourly rate (zero or more).');
      const cs = cstate(me.centerId);
      cs.settings = { contact: String(contact || '').trim(), hours: String(hours || '').trim(), hourlyRate: rate };
      write(ckey(me.centerId), cs);
      return cs.settings;
    },
  },

  demo: {
    async seed() { await delay(300); const me = ME(); need(me, 'settings.manage'); X.keepSession(X.seedWorld); },
  },
};

// ---------- helpers used by labour/parts ----------
function woScope(id) {
  const me = ME();
  need(me, 'wo.progress');
  const cs = cstate(me.centerId);
  const e = entries(me).find((x) => x.b.workOrder?.id === id);
  if (!e || !ownWO(me, e.b.workOrder)) throw new E('NOT_FOUND', 'Work order not found.');
  if (!['in_progress', 'waiting_parts'].includes(e.b.workOrder.status)) throw new E('NOT_EDITABLE', 'Labour and parts can only be changed while the work is in progress or waiting for parts.');
  return { me, e, cs };
}
function finishWO(me, cs, e, action) {
  e.b.updatedAt = nowISO();
  audit(e.b, me, action);
  write(e.key, e.d);
  return woView(me, cs, e);
}

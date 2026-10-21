/**
 * DEMO ADAPTER (frontend-only mock). There is no backend and no account system:
 *  - Data lives in this browser's localStorage, written by the shared mock layer (src/mock).
 *  - There is NO authentication. Sign-in, Google sign-in, sign-up and password reset all reject with NOT_CONFIGURED.
 *    "Preview" only picks a demo persona so a portal can be explored. It is not a login and not a security boundary.
 *  - No passwords are collected or stored.
 * The checks in this file (cancellation, OTP attempts, ownership) mimic what a real backend must enforce later;
 * they are demo behaviour, not real security.
 */
import { ServiceError as E } from './errors';
import { CENTERS as MOCK_CENTERS } from '../../mock/centers';
import { clearWorld, ensureWorld, personaFor, seedWorld } from '../../mock';
import { statusMeta, STAGES } from '../domain/status';
import { isPhone, normalizeReg } from '../lib/validate';

const NS = 'sf-demo:';
const read = (k, d) => {
  try {
    const v = localStorage.getItem(NS + k);
    return v ? JSON.parse(v) : d;
  } catch {
    return d;
  }
};
const write = (k, v) => localStorage.setItem(NS + k, JSON.stringify(v));
const delay = (ms = 260) => new Promise((r) => setTimeout(r, ms + Math.random() * 180));
const rid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10));
const nowISO = () => new Date().toISOString();
const clone = (x) => JSON.parse(JSON.stringify(x));

const SERVICE_TYPES = [
  { id: 'general', label: 'General servicing', description: 'Routine check-up and servicing.' },
  { id: 'repair', label: 'Repair and maintenance', description: 'Fix a known problem or fault.' },
  { id: 'inspection', label: 'Inspection', description: 'Have the vehicle inspected.' },
  { id: 'other', label: 'Other', description: 'Something else. Describe it in the notes.' },
];
const SLOTS = ['09:00 - 12:00', '12:00 - 15:00', '15:00 - 18:00'];
const CENTERS = MOCK_CENTERS;

const NEXT = {
  confirmed: 'driver_assigned',
  driver_assigned: 'driver_en_route',
  picked_up: 'in_transit',
  in_transit: 'received_at_center',
  received_at_center: 'service_in_progress',
  service_in_progress: 'service_completed',
  delivery_driver_assigned: 'out_for_delivery',
};
const NOTE = {
  confirmed: 'Booking confirmed.',
  driver_assigned: 'A driver has been assigned to your pickup.',
  driver_en_route: 'Your driver is on the way. Verify the handover when they arrive.',
  picked_up: 'Your vehicle has been collected.',
  in_transit: 'Your vehicle is on its way to the service center.',
  received_at_center: 'Your vehicle was received by the service center.',
  service_in_progress: 'Service has started on your vehicle.',
  service_completed: 'Service is complete. Schedule delivery when you are ready.',
  delivery_driver_assigned: 'A driver has been assigned for delivery.',
  out_for_delivery: 'Your vehicle is out for delivery. Verify the handover when it arrives.',
  delivered: 'Your vehicle has been delivered.',
  cancelled: 'Booking cancelled.',
};
export const DEMO_DRIVER = { id: 'u_driver_demo', name: 'Karthik S.', phone: '+91 90000 11111' };
const MAX_ATTEMPTS = 5;
const OTP_TTL_MS = 15 * 60 * 1000;
const RESEND_GAP_MS = 30 * 1000;

// ---------- session + per-user data ----------
/** Re-seeding or clearing wipes storage, so keep the current preview session. */
function keepSession(fn) { const sess = read('session', null); fn(); if (sess) write('session', sess); }
const listeners = new Set();
const emit = (s) => listeners.forEach((f) => f(s));
const sessionUser = () => {
  const s = read('session', null);
  if (!s) return null;
  const u = read('users', []).find((x) => x.id === s.userId) || null;
  // A deactivated account loses its session immediately.
  return u && u.active !== false ? u : null;
};

/** Platform-wide state written by the admin portal: center approval/suspension and onboarded centers. */
const platformCenters = () => (read('platform', null) || {}).centers || {};
const allCenters = () => [...CENTERS, ...(((read('platform', null) || {}).extraCenters) || [])];
/** A center can take part in bookings only when approved and not suspended. Centers without a record are treated as approved. */
const centerAvailable = (id) => { const c = platformCenters()[id]; return !c || ((c.approval || 'approved') === 'approved' && (c.status || 'active') !== 'suspended'); };
const publicUser = (u) => ({ id: u.id, role: u.role || 'customer', adminLevel: u.adminLevel || null, staffRole: u.staffRole || null, centerId: u.centerId || null, technicianId: u.technicianId || null, name: u.name, email: u.email, phone: u.phone || '', preferredContact: u.preferredContact || 'phone', addresses: u.addresses || [] });

function ctx() {
  const user = sessionUser();
  if (!user) throw new E('UNAUTHENTICATED', 'Your session has ended. Sign in again.');
  const key = `data:${user.id}`;
  const d = read(key, { vehicles: [], bookings: [], notifications: [], otps: {}, idem: {} });
  return { user, d, save: () => write(key, d) };
}


function addNote(d, booking, type, message) {
  d.notifications.unshift({ id: `n_${rid()}`, bookingId: booking.id, reference: booking.reference, type, message, createdAt: nowISO(), read: false });
}

function setStatus(d, b, status) {
  b.status = status;
  b.updatedAt = nowISO();
  b.statusHistory.push({ status, at: b.updatedAt });
  addNote(d, b, status, NOTE[status]);
}

// ---------- OTP (simulated server side) ----------
function issueOtp(d, b, type) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  d.otps[`${b.id}:${type}`] = { code, attempts: 0, issuedAt: Date.now(), expiresAt: Date.now() + OTP_TTL_MS };
}
function handoverView(d, b, type) {
  const rec = b.handovers[type];
  if (rec.verifiedAt) return { status: 'verified', verifiedAt: rec.verifiedAt };
  const otp = d.otps[`${b.id}:${type}`];
  if (!otp) return { status: 'waiting' };
  if (otp.attempts >= MAX_ATTEMPTS) return { status: 'locked', attemptsLeft: 0 };
  if (Date.now() > otp.expiresAt) return { status: 'expired', attemptsLeft: MAX_ATTEMPTS - otp.attempts };
  return { status: 'pending', expiresAt: new Date(otp.expiresAt).toISOString(), attemptsLeft: MAX_ATTEMPTS - otp.attempts, canResendAt: new Date(otp.issuedAt + RESEND_GAP_MS).toISOString() };
}
const view = (d, b) => ({ ...clone(b), handovers: { pickup: handoverView(d, b, 'pickup'), delivery: handoverView(d, b, 'delivery') } });
const find = (d, id) => {
  const b = d.bookings.find((x) => x.id === id);
  if (!b) throw new E('NOT_FOUND', 'Booking not found.');
  return b;
};

/** Server-side OTP check shared by the customer and driver demo flows. Throws ServiceError; mutates d and b on success. */
function consumeOtp(d, b, type, code) {
  const key = `${b.id}:${type}`;
  const otp = d.otps[key];
  const required = (type === 'pickup' && b.status === 'driver_en_route') || (type === 'delivery' && b.status === 'out_for_delivery');
  if (!required || !otp) throw new E('NOT_REQUIRED', 'No handover is waiting for verification on this booking.');
  if (otp.attempts >= MAX_ATTEMPTS) throw new E('LOCKED', 'Too many incorrect attempts. Request a new code.');
  if (Date.now() > otp.expiresAt) throw new E('EXPIRED', 'This code has expired. Request a new code.');
  if (String(code) !== otp.code) {
    otp.attempts += 1;
    const left = MAX_ATTEMPTS - otp.attempts;
    throw new E(left ? 'INVALID_CODE' : 'LOCKED', left ? `That code is not correct. ${left} ${left === 1 ? 'attempt' : 'attempts'} left.` : 'Too many incorrect attempts. Request a new code.', { attemptsLeft: left });
  }
  b.handovers[type] = { verifiedAt: nowISO() };
  delete d.otps[key];
  setStatus(d, b, type === 'pickup' ? 'picked_up' : 'delivered');
}

// ---------- adapter ----------
export const demoAdapter = {
  mode: 'demo',

  auth: {
    async getSession() {
      const u = sessionUser();
      return u ? { user: publicUser(u), preview: true } : null;
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    // Real authentication is not built. These reject honestly instead of pretending to succeed.
    async signIn() {
      await delay(350);
      throw new E('NOT_CONFIGURED', 'Sign-in is not configured yet. This build has no account system, so nothing was sent and you are not signed in.');
    },
    async signInWithGoogle() {
      await delay(350);
      throw new E('NOT_CONFIGURED', 'Google sign-in is not configured yet. Nothing was sent to Google and you are not signed in.');
    },
    async signUp() {
      await delay(350);
      throw new E('NOT_CONFIGURED', 'Registration is not available yet. This build has no account system, so no account was created.');
    },
    async requestPasswordReset() {
      await delay(350);
      throw new E('NOT_CONFIGURED', 'Password reset is not available yet. No email was sent.');
    },
    async changePassword() {
      await delay(250);
      throw new E('NOT_CONFIGURED', 'Password management needs the authentication service, which is not configured yet.');
    },
    /**
     * Preview mode: open a portal as a demo persona with demo data. This is NOT signing in. It exists only so the
     * interface can be explored before a backend exists.
     */
    async enterPreview(portal, level) {
      const persona = personaFor(portal, level);
      if (!persona) throw new E('INVALID_INPUT', 'Unknown portal.');
      ensureWorld();
      write('session', { userId: persona.id, preview: true, at: nowISO() });
      const u = sessionUser();
      const s = { user: publicUser(u), preview: true };
      emit(s);
      return s;
    },
    async signOut() {
      localStorage.removeItem(NS + 'session');
      emit(null);
    },
  },

  profile: {
    async get() {
      await delay(120);
      return publicUser(ctx().user);
    },
    async update({ name, phone, preferredContact, addresses }) {
      await delay();
      const me = ctx().user;
      if (!name?.trim()) throw new E('INVALID_INPUT', 'Enter your name.');
      if (phone && !isPhone(phone)) throw new E('INVALID_INPUT', 'Enter a valid phone number.');
      const users = read('users', []);
      const u = users.find((x) => x.id === me.id);
      Object.assign(u, { name: name.trim(), phone: (phone || '').trim(), preferredContact, addresses: (addresses || []).slice(0, 3) });
      write('users', users);
      const s = { user: publicUser(u) };
      emit(s);
      return s.user;
    },
  },

  vehicles: {
    async list() {
      await delay(180);
      const { d } = ctx();
      return d.vehicles.map((v) => ({ ...v, bookingCount: d.bookings.filter((b) => b.vehicleId === v.id).length })).sort((a, b) => a.createdAt < b.createdAt ? 1 : -1);
    },
    async create(input) {
      await delay();
      const c = ctx();
      const reg = normalizeReg(input.registration || '');
      if (!reg || !input.make?.trim() || !input.model?.trim() || !input.type) throw new E('INVALID_INPUT', 'Registration, make, model and type are required.');
      if (c.d.vehicles.some((v) => normalizeReg(v.registration) === reg)) throw new E('DUPLICATE_VEHICLE', 'You already have a vehicle with this registration number.');
      const v = { id: `v_${rid()}`, registration: reg, make: input.make.trim(), model: input.model.trim(), year: Number(input.year), type: input.type, notes: (input.notes || '').trim(), createdAt: nowISO() };
      c.d.vehicles.push(v);
      c.save();
      return { ...v, bookingCount: 0 };
    },
    async update(id, input) {
      await delay();
      const c = ctx();
      const v = c.d.vehicles.find((x) => x.id === id);
      if (!v) throw new E('NOT_FOUND', 'Vehicle not found.');
      const reg = normalizeReg(input.registration || '');
      if (c.d.vehicles.some((x) => x.id !== id && normalizeReg(x.registration) === reg)) throw new E('DUPLICATE_VEHICLE', 'You already have a vehicle with this registration number.');
      Object.assign(v, { registration: reg, make: input.make.trim(), model: input.model.trim(), year: Number(input.year), type: input.type, notes: (input.notes || '').trim() });
      c.save();
      return v;
    },
    async remove(id) {
      await delay();
      const c = ctx();
      if (c.d.bookings.some((b) => b.vehicleId === id && !['delivered', 'cancelled'].includes(b.status))) {
        throw new E('VEHICLE_IN_USE', 'This vehicle has an open booking. Finish or cancel it before removing the vehicle.');
      }
      c.d.vehicles = c.d.vehicles.filter((v) => v.id !== id);
      c.save();
    },
  },

  centers: {
    async list() {
      await delay(200);
      ctx();
      return clone(allCenters().filter((c) => centerAvailable(c.id)));
    },
  },

  bookings: {
    async serviceTypes() {
      ctx();
      return { source: 'demo', items: SERVICE_TYPES, slots: SLOTS };
    },
    async list({ tab = 'all', query = '', vehicleId = '', cursor = 0, limit = 6 } = {}) {
      await delay(200);
      const { d } = ctx();
      const q = query.trim().toLowerCase();
      const all = d.bookings
        .filter((b) => tab === 'all' || statusMeta(b.status).group === tab)
        .filter((b) => !vehicleId || b.vehicleId === vehicleId)
        .filter((b) => !q || [b.reference, b.vehicle.registration, b.vehicle.make, b.vehicle.model, b.serviceType, b.center.name].join(' ').toLowerCase().includes(q))
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      const items = all.slice(cursor, cursor + limit).map((b) => view(d, b));
      return { items, total: all.length, nextCursor: cursor + limit < all.length ? cursor + limit : null };
    },
    async summary() {
      await delay(200);
      const { d } = ctx();
      const open = d.bookings.filter((b) => !['delivered', 'cancelled'].includes(b.status));
      const featured = [...open].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0];
      return {
        total: d.bookings.length,
        active: open.length,
        upcoming: d.bookings.filter((b) => statusMeta(b.status).group === 'upcoming').length,
        completed: d.bookings.filter((b) => b.status === 'delivered').length,
        vehicleCount: d.vehicles.length,
        featured: featured ? view(d, featured) : null,
        recent: [...d.bookings].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 4).map((b) => view(d, b)),
      };
    },
    async get(id) {
      await delay(150);
      const { d } = ctx();
      return view(d, find(d, id));
    },
    async create(payload, idempotencyKey) {
      await delay(500);
      const c = ctx();
      if (idempotencyKey && c.d.idem[idempotencyKey]) return view(c.d, find(c.d, c.d.idem[idempotencyKey]));
      const v = c.d.vehicles.find((x) => x.id === payload.vehicleId);
      const center = allCenters().find((x) => x.id === payload.centerId);
      const st = SERVICE_TYPES.find((x) => x.id === payload.serviceType);
      const p = payload.pickup || {};
      if (!v) throw new E('INVALID_INPUT', 'Choose one of your vehicles.');
      if (!st) throw new E('INVALID_INPUT', 'Choose a service type.');
      if (!center || !centerAvailable(center.id)) throw new E('INVALID_INPUT', 'Choose an available service center.');
      if (!p.address?.trim() || !p.city?.trim() || !p.postalCode?.trim() || !isPhone(p.phone || '') || !SLOTS.includes(p.slot)) throw new E('INVALID_INPUT', 'Pickup details are incomplete.');
      if (!p.date || p.date < new Date().toISOString().slice(0, 10)) throw new E('INVALID_INPUT', 'Pickup date must be today or later.');
      const b = {
        id: `b_${rid()}`, reference: `SF-DEMO-${Math.floor(10000 + Math.random() * 89999)}`, vehicleId: v.id,
        vehicle: { make: v.make, model: v.model, year: v.year, registration: v.registration, type: v.type },
        serviceType: st.label, serviceNotes: (payload.serviceNotes || '').trim(), pickup: { ...p },
        centerId: center.id, center: { name: center.name, address: center.address },
        status: 'confirmed', driver: null, deliveryDriver: null, delivery: null, demo: true,
        createdAt: nowISO(), updatedAt: nowISO(), statusHistory: [{ status: 'confirmed', at: nowISO() }],
        handovers: { pickup: { verifiedAt: null }, delivery: { verifiedAt: null } },
      };
      c.d.bookings.push(b);
      addNote(c.d, b, 'confirmed', `Booking ${b.reference} confirmed (demo).`);
      if (idempotencyKey) c.d.idem[idempotencyKey] = b.id;
      c.save();
      return view(c.d, b);
    },
    async cancel(id) {
      await delay(400);
      const c = ctx();
      const b = find(c.d, id);
      if (!['confirmed', 'driver_assigned'].includes(b.status)) throw new E('NOT_CANCELLABLE', 'This booking can no longer be cancelled because the pickup has already started.');
      setStatus(c.d, b, 'cancelled');
      c.save();
      return view(c.d, b);
    },
    async scheduleDelivery(id, { date, slot, address }) {
      await delay(400);
      const c = ctx();
      const b = find(c.d, id);
      if (b.status !== 'service_completed') throw new E('NOT_ALLOWED', 'Delivery can be scheduled once service is completed.');
      if (b.delivery) throw new E('ALREADY_SCHEDULED', 'Delivery is already scheduled for this booking.');
      if (!date || date < new Date().toISOString().slice(0, 10) || !SLOTS.includes(slot) || !address?.trim()) throw new E('INVALID_INPUT', 'Choose a delivery date, time slot and address.');
      b.delivery = { date, slot, address: address.trim() };
      b.updatedAt = nowISO();
      addNote(c.d, b, 'delivery_scheduled', `Delivery requested for ${date}, ${slot} (demo).`);
      c.save();
      return view(c.d, b);
    },
  },

  tracking: {
    async get(id) {
      await delay(150);
      const { d } = ctx();
      const b = find(d, id);
      // Live GPS is not available; only the last known operational status is returned.
      return { booking: view(d, b), liveLocation: null, lastUpdated: b.updatedAt, source: 'demo' };
    },
  },

  handover: {
    async verify(id, type, code) {
      await delay(450);
      const c = ctx();
      const b = find(c.d, id);
      try { consumeOtp(c.d, b, type, code); } catch (e) { c.save(); throw e; }
      c.save();
      return view(c.d, b);
    },
    async resend(id, type) {
      await delay(300);
      const c = ctx();
      const b = find(c.d, id);
      const otp = c.d.otps[`${b.id}:${type}`];
      if (otp && Date.now() - otp.issuedAt < RESEND_GAP_MS && otp.attempts < MAX_ATTEMPTS && Date.now() <= otp.expiresAt) {
        throw new E('RATE_LIMITED', 'Please wait a few seconds before requesting another code.');
      }
      issueOtp(c.d, b, type);
      c.save();
      return view(c.d, b);
    },
  },

  serviceProgress: {
    async get(id) {
      await delay(150);
      const { d } = ctx();
      const b = find(d, id);
      const at = STAGES.findIndex((s) => s.key === b.status);
      const idx = (k) => STAGES.findIndex((s) => s.key === k);
      if (at < idx('received_at_center') || b.status === 'cancelled') return null;
      const done = b.status === 'delivered' || at >= idx('service_completed');
      const items = [
        { key: 'received', label: 'Vehicle received by the service center', state: 'done' },
        { key: 'service', label: 'Servicing', state: done ? 'done' : at >= idx('service_in_progress') ? 'active' : 'todo' },
        { key: 'complete', label: 'Service completed', state: done ? 'done' : 'todo' },
        { key: 'delivery', label: 'Delivery scheduling', state: b.delivery ? 'done' : done ? 'active' : 'todo', detail: b.delivery ? `${b.delivery.date}, ${b.delivery.slot}` : undefined },
      ];
      return { source: 'demo', workOrderRef: `WO-DEMO-${b.reference.slice(-5)}`, items, percent: Math.round((items.filter((i) => i.state === 'done').length / items.length) * 100) };
    },
  },

  notifications: {
    async list({ limit = 50 } = {}) {
      await delay(120);
      const { d } = ctx();
      return d.notifications.slice(0, limit).map(clone);
    },
    async markRead(id) {
      const c = ctx();
      const n = c.d.notifications.find((x) => x.id === id);
      if (n) n.read = true;
      c.save();
    },
    async markAllRead() {
      const c = ctx();
      c.d.notifications.forEach((n) => (n.read = true));
      c.save();
    },
  },

  /** Simulation tools. These do not exist in production: a real backend moves bookings forward, not the customer. */
  demo: {
    async advance(id) {
      await delay(350);
      const c = ctx();
      const b = find(c.d, id);
      const s = b.status;
      if (s === 'delivered' || s === 'cancelled') return { booking: view(c.d, b), blocked: 'This booking is finished.' };
      if (s === 'driver_en_route') return { booking: view(c.d, b), blocked: 'Waiting for you to verify the pickup handover.' };
      if (s === 'out_for_delivery') return { booking: view(c.d, b), blocked: 'Waiting for you to verify the delivery handover.' };
      if (s === 'service_completed') {
        if (!b.delivery) return { booking: view(c.d, b), blocked: 'Waiting for you to schedule delivery.' };
        b.deliveryDriver = { ...DEMO_DRIVER };
        setStatus(c.d, b, 'delivery_driver_assigned');
      } else {
        const next = NEXT[s];
        if (next === 'driver_assigned') b.driver = { ...DEMO_DRIVER };
        setStatus(c.d, b, next);
        if (next === 'driver_en_route') issueOtp(c.d, b, 'pickup');
      }
      if (b.status === 'out_for_delivery') issueOtp(c.d, b, 'delivery');
      c.save();
      return { booking: view(c.d, b) };
    },
    async peekOtp(id, type) {
      const { d } = ctx();
      const o = d.otps[`${id}:${type}`];
      return o ? o.code : null;
    },
    async seedSample() { await delay(300); ctx(); keepSession(seedWorld); },
    async reset() { ctx(); keepSession(clearWorld); },
  },
};

/** Used by the demo driver adapter so both portals read and write the same simulated booking records. */
export const demoInternals = { keepSession, seedWorld, clearWorld, CENTERS, allCenters, centerAvailable, NOTE, NS, read, write, delay, rid, nowISO, issueOtp, setStatus, addNote, consumeOtp, handoverView, SLOTS, sessionUser, publicUser };

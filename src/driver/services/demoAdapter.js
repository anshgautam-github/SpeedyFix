/**
 * DEMO DRIVER ADAPTER. Simulated "backend" for the driver portal, stored in this browser's localStorage.
 * It reads and writes the SAME booking records as the customer portal's demo adapter, so a driver action
 * (accept, start, verify, hand over) changes what the customer sees. Nothing here talks to a real server.
 *
 * The rules in this file (ownership, state machine, stale-request rejection, verification gates, redaction of
 * customer details) are what a real backend must enforce. The UI only hints at them.
 */
import { ServiceError as E } from '../../portal/services/errors';
import { demoInternals as X } from '../../portal/services/demoAdapter';

const { NS, read, write, delay, rid, nowISO } = X;

const ME = () => {
  const u = X.sessionUser();
  if (!u) throw new E('UNAUTHENTICATED', 'Your session has ended. Sign in again.');
  if (u.role !== 'driver') throw new E('FORBIDDEN', 'This area is only for driver accounts.');
  return u;
};
const dkey = (id) => `driver:${id}`;
const dstate = (id) => read(dkey(id), { availability: 'offline', confirmedAt: null, notifications: [] });
const approved = (u) => (u.driverStatus || 'approved') === 'approved';
const requireApproved = (u) => {
  if (approved(u)) return;
  const st = u.driverStatus;
  throw new E('ACCOUNT_NOT_APPROVED', st === 'suspended' ? 'Your driver account is suspended. You cannot see or accept assignments. Contact operations.' : st === 'rejected' ? 'Your driver application was not approved.' : 'Your driver account has not been approved yet. You cannot see or accept assignments.');
};

// ---------- reading the shared booking records ----------
function blobs() {
  const out = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i);
    if (k.startsWith(`${NS}data:`)) out.push({ key: k.slice(NS.length), d: JSON.parse(localStorage.getItem(k)) });
  }
  return out;
}
const customerName = (key, b) => b?.customer?.name || (read('users', []).find((u) => u.id === key.slice(5)) || {}).name || 'Customer';
const parseId = (jobId) => {
  const [bookingId, type] = String(jobId).split('~');
  if (!bookingId || !['pickup', 'delivery'].includes(type)) throw new E('NOT_FOUND', 'Job not found.');
  return { bookingId, type };
};
function locate(bookingId) {
  for (const blob of blobs()) {
    const b = blob.d.bookings.find((x) => x.id === bookingId);
    if (b) return { ...blob, b };
  }
  return null;
}
const offerFor = (b, type, me) => (b.offers || []).find((o) => o.job === type && o.driverId === me);

// ---------- phase (the authoritative job state, derived from the booking record) ----------
const AFTER_CENTER = ['received_at_center', 'service_in_progress', 'service_completed', 'delivery_driver_assigned', 'out_for_delivery', 'delivered'];
function phaseOf(b, type, me) {
  const offer = offerFor(b, type, me);
  if (type === 'pickup') {
    if (offer?.status === 'declined' && b.driver?.id !== me) return 'declined';
    if (b.status === 'cancelled') return b.driver?.id === me || offer ? 'cancelled' : null;
    if (!b.driver) return offer?.status === 'offered' && b.status === 'confirmed' ? 'offered' : null;
    if (b.driver.id !== me) return null;
    const j = b.pickupJob || {};
    if (AFTER_CENTER.includes(b.status) || j.handedOverAt) return 'handed_over';
    if (b.status === 'in_transit') return j.centerArrivedAt ? 'at_center' : 'to_center';
    if (b.status === 'picked_up') return j.collectedAt ? 'collected' : 'verified';
    if (b.status === 'driver_en_route') return !j.arrivedAt ? 'en_route' : !j.inspection ? 'arrived' : 'inspected';
    if (b.status === 'driver_assigned') return 'accepted';
    return null;
  }
  if (!b.delivery) return null;
  if (offer?.status === 'declined' && b.deliveryDriver?.id !== me) return 'declined';
  if (b.status === 'cancelled') return null;
  if (!b.deliveryDriver) return offer?.status === 'offered' && b.status === 'service_completed' ? 'offered' : null;
  if (b.deliveryDriver.id !== me) return null;
  const j = b.deliveryJob || {};
  if (b.status === 'delivery_driver_assigned') return 'accepted';
  if (b.status === 'out_for_delivery') return !j.arrivedAt ? 'en_route' : !j.inspection ? 'arrived' : 'inspected';
  if (b.status === 'delivered') return j.completedAt ? 'completed' : 'verified';
  return null;
}

const EVENT_LABEL = { offered: 'Offered', accepted: 'Accepted', declined: 'Declined', started: 'Journey started', arrived: 'Arrived', inspected: 'Vehicle condition recorded', verified: 'Handover verified with OTP', collected: 'Collection confirmed', center_arrived: 'Arrived at service center', handed_over: 'Handed over to service center', completed: 'Job completed' };
const logEvent = (b, type, event, me) => { (b.jobLog = b.jobLog || []).push({ job: type, event, at: nowISO(), by: me }); };

/** Builds the driver-facing job. Customer contact and the full address are withheld until the driver has accepted. */
function build(blob, b, type, me) {
  const phase = phaseOf(b, type, me);
  if (!phase) return null;
  const open = !['handed_over', 'completed', 'cancelled', 'declined'].includes(phase);
  const reveal = open && phase !== 'offered';
  // Finished jobs keep their addresses in history, but only for jobs this driver actually worked (never for declined offers).
  const worked = (type === 'pickup' ? b.driver?.id : b.deliveryDriver?.id) === me;
  const show = reveal || (!open && worked);
  const p = b.pickup;
  const jobData = (type === 'pickup' ? b.pickupJob : b.deliveryJob) || {};
  const hidden = 'Shown after you accept';
  const center = { name: b.center.name, address: b.center.address };
  const customerAddr = type === 'pickup' ? p : { address: b.delivery?.address, city: '', postalCode: '', landmark: '' };
  const log = (b.jobLog || []).filter((l) => l.job === type && l.by === me);
  const offer = offerFor(b, type, me);
  const hv = X.handoverView(blobAsD(blob), b, type);
  return {
    id: `${b.id}~${type}`, bookingId: b.id, reference: b.reference, type, phase,
    vehicle: { make: b.vehicle.make, model: b.vehicle.model, registration: b.vehicle.registration, type: b.vehicle.type },
    customer: reveal ? { name: customerName(blob.key, b), phone: p.phone } : null,
    origin: type === 'pickup'
      ? { name: 'Customer', address: show ? `${p.address}, ${p.city} ${p.postalCode}` : `${p.city} ${p.postalCode}`.trim() || hidden, landmark: reveal ? p.landmark : '', redacted: !show }
      : { name: center.name, address: center.address },
    destination: type === 'pickup'
      ? { name: center.name, address: center.address }
      : { name: 'Customer', address: show ? customerAddr.address : 'Shown after you accept', redacted: !show },
    schedule: type === 'pickup' ? { date: p.date, slot: p.slot } : { date: b.delivery?.date, slot: b.delivery?.slot },
    instructions: reveal ? [b.serviceNotes, p.instructions].filter(Boolean).join(' / ') : '',
    center,
    timestamps: { offeredAt: offer?.at, ...jobData },
    inspection: jobData.inspection || null,
    handover: { status: hv.status, verifiedAt: hv.verifiedAt, attemptsLeft: hv.attemptsLeft },
    history: log.map((l) => ({ event: l.event, label: EVENT_LABEL[l.event] || l.event, at: l.at })),
    updatedAt: b.updatedAt, demo: Boolean(b.demo),
  };
}
// handoverView expects the customer blob's data object (it reads d.otps)
const blobAsD = (blob) => blob.d;

function allJobs(me) {
  const out = [];
  for (const blob of blobs()) for (const b of blob.d.bookings) for (const type of ['pickup', 'delivery']) { const j = build(blob, b, type, me); if (j) out.push(j); }
  return out;
}
const groupOf = (phase) => (phase === 'offered' ? 'offers' : phase === 'accepted' ? 'assigned' : ['handed_over', 'completed'].includes(phase) ? 'completed' : phase === 'cancelled' ? 'cancelled' : phase === 'declined' ? 'declined' : 'in_progress');
const when = (j) => j.timestamps.completedAt || j.timestamps.handedOverAt || j.updatedAt;

function notify(me, job, type, message) {
  const s = dstate(me);
  s.notifications.unshift({ id: `n_${rid()}`, jobId: job.id, reference: job.reference, type, message, createdAt: nowISO(), read: false });
  write(dkey(me), s);
}

// ---------- the state machine (server side) ----------
const ALLOWED = {
  pickup: { offered: ['accept', 'decline'], accepted: ['start'], en_route: ['arrive'], arrived: ['inspect'], verified: ['confirm_collection'], collected: ['start_to_center'], to_center: ['arrive_center'], at_center: ['handover_center'] },
  delivery: { offered: ['accept', 'decline'], accepted: ['start'], en_route: ['arrive'], arrived: ['inspect'], verified: ['complete'] },
};

function validateInspection(i = {}) {
  const miss = [];
  if (!['good', 'minor', 'damage'].includes(i.exterior)) miss.push('exterior condition');
  if (!['none', 'present'].includes(i.scratches)) miss.push('scratches or dents');
  if (!['none', 'present'].includes(i.visibleDamage)) miss.push('visible damage');
  if (miss.length) throw new E('INVALID_INPUT', `Complete the required checks: ${miss.join(', ')}.`);
  if ((i.scratches === 'present' || i.visibleDamage === 'present' || i.exterior === 'damage') && !String(i.notes || '').trim()) throw new E('INVALID_INPUT', 'Describe the existing damage in the notes.');
  return { exterior: i.exterior, scratches: i.scratches, visibleDamage: i.visibleDamage, fuel: i.fuel || '', accessories: String(i.accessories || '').trim(), notes: String(i.notes || '').trim(), photos: [], at: nowISO() };
}

export const demoDriverAdapter = {
  mode: 'demo',

  availability: {
    async get() {
      await delay(120);
      const me = ME();
      const s = dstate(me.id);
      const onJob = allJobs(me.id).some((j) => groupOf(j.phase) === 'in_progress');
      return { state: onJob ? 'on_job' : s.availability, confirmedAt: s.confirmedAt, approved: approved(me) };
    },
    async set(online) {
      await delay(300);
      const me = ME();
      requireApproved(me);
      if (!online && allJobs(me.id).some((j) => groupOf(j.phase) === 'in_progress')) throw new E('ON_ACTIVE_JOB', 'You cannot go offline while a job is in progress. Complete or hand over the job first.');
      const s = dstate(me.id);
      s.availability = online ? 'online' : 'offline';
      s.confirmedAt = nowISO();
      write(dkey(me.id), s);
      return { state: s.availability, confirmedAt: s.confirmedAt, approved: true };
    },
  },

  jobs: {
    async stats() {
      await delay(150);
      const me = ME();
      requireApproved(me);
      const jobs = allJobs(me.id);
      const today = new Date().toISOString().slice(0, 10);
      const g = (k) => jobs.filter((j) => groupOf(j.phase) === k);
      return {
        assignedToday: jobs.filter((j) => ['assigned', 'in_progress'].includes(groupOf(j.phase)) && j.schedule.date === today).length,
        awaiting: g('offers').length, active: g('in_progress').length,
        completed: g('completed').length,
        completedToday: g('completed').filter((j) => (when(j) || '').slice(0, 10) === today).length,
        current: g('in_progress').sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0] || g('assigned')[0] || null,
        offers: g('offers'), upcoming: g('assigned'), recent: g('completed').sort((a, b) => (when(a) < when(b) ? 1 : -1)).slice(0, 3),
      };
    },
    async list({ group = '', query = '', groups = null, from = '', to = '', cursor = 0, limit = 8 } = {}) {
      await delay(180);
      const me = ME();
      requireApproved(me);
      const q = query.trim().toLowerCase();
      const items = allJobs(me.id)
        .filter((j) => (groups ? groups.includes(groupOf(j.phase)) : !group || groupOf(j.phase) === group))
        .filter((j) => !q || `${j.reference} ${j.vehicle.registration} ${j.vehicle.make} ${j.vehicle.model}`.toLowerCase().includes(q))
        .filter((j) => (!from || (when(j) || '').slice(0, 10) >= from) && (!to || (when(j) || '').slice(0, 10) <= to))
        .sort((a, b) => (when(a) < when(b) ? 1 : -1));
      return { items: items.slice(cursor, cursor + limit), total: items.length, nextCursor: cursor + limit < items.length ? cursor + limit : null };
    },
    async get(jobId) {
      await delay(120);
      const me = ME();
      requireApproved(me);
      const { bookingId, type } = parseId(jobId);
      const loc = locate(bookingId);
      const job = loc && build(loc, loc.b, type, me.id);
      // A job that belongs to someone else is indistinguishable from one that does not exist.
      if (!job) throw new E('NOT_FOUND', 'This job was not found, or it is not assigned to you.');
      return job;
    },

    /**
     * Every state change goes through here. `expectedPhase` is the phase the driver was looking at; if the job
     * has moved on, the request is rejected instead of overwriting newer state.
     */
    async transition(jobId, action, { expectedPhase, payload = {} } = {}) {
      await delay(350);
      const me = ME();
      requireApproved(me);
      const { bookingId, type } = parseId(jobId);
      const loc = locate(bookingId);
      if (!loc) throw new E('NOT_FOUND', 'This job was not found, or it is not assigned to you.');
      const { b, d, key } = loc;
      const phase = phaseOf(b, type, me.id);
      if (!phase) {
        const taken = (type === 'pickup' ? b.driver : b.deliveryDriver);
        if (action === 'accept' && taken && taken.id !== me.id) throw new E('ALREADY_TAKEN', 'Another driver has already accepted this job.');
        throw new E('NOT_FOUND', 'This job was not found, or it is not assigned to you.');
      }
      if (expectedPhase && expectedPhase !== phase) throw new E('STALE', 'This job has changed since you opened it. The latest state has been loaded.', { phase });
      if (!(ALLOWED[type][phase] || []).includes(action)) throw new E('INVALID_TRANSITION', `That step is not available while the job is "${phase.replace(/_/g, ' ')}".`);
      const J = (type === 'pickup' ? (b.pickupJob = b.pickupJob || {}) : (b.deliveryJob = b.deliveryJob || {}));
      const t = nowISO();

      if (action === 'accept') {
        if (type === 'pickup') {
          if (b.driver) throw new E('ALREADY_TAKEN', 'Another driver has already accepted this job.');
          b.driver = { id: me.id, name: me.name, phone: me.phone };
          X.setStatus(d, b, 'driver_assigned');
        } else {
          if (b.deliveryDriver) throw new E('ALREADY_TAKEN', 'Another driver has already accepted this job.');
          b.deliveryDriver = { id: me.id, name: me.name, phone: me.phone };
          X.setStatus(d, b, 'delivery_driver_assigned');
        }
        offerFor(b, type, me.id).status = 'accepted';
        J.acceptedAt = t; logEvent(b, type, 'accepted', me.id);
      } else if (action === 'decline') {
        if (!payload.reason) throw new E('INVALID_INPUT', 'Choose a reason for declining.');
        const o = offerFor(b, type, me.id);
        o.status = 'declined'; o.reason = payload.reason; o.at = t;
        logEvent(b, type, 'declined', me.id);
      } else if (action === 'start') {
        if (type === 'pickup') { X.setStatus(d, b, 'driver_en_route'); X.issueOtp(d, b, 'pickup'); }
        else { X.setStatus(d, b, 'out_for_delivery'); X.issueOtp(d, b, 'delivery'); }
        J.startedAt = t; logEvent(b, type, 'started', me.id);
      } else if (action === 'arrive') {
        J.arrivedAt = t; logEvent(b, type, 'arrived', me.id);
        X.addNote(d, b, 'driver_arrived', type === 'pickup' ? 'Your driver has arrived at the pickup point.' : 'Your delivery driver has arrived.');
      } else if (action === 'inspect') {
        J.inspection = validateInspection(payload); logEvent(b, type, 'inspected', me.id);
      } else if (action === 'confirm_collection') {
        J.collectedAt = t; logEvent(b, type, 'collected', me.id);
      } else if (action === 'start_to_center') {
        X.setStatus(d, b, 'in_transit'); J.toCenterAt = t; logEvent(b, type, 'started', me.id);
      } else if (action === 'arrive_center') {
        J.centerArrivedAt = t; logEvent(b, type, 'center_arrived', me.id);
        X.addNote(d, b, 'center_arrival', 'Your vehicle has arrived at the service center.');
      } else if (action === 'handover_center') {
        // The driver records their side only. The booking becomes "received" when the service center confirms receipt in its own portal.
        J.handedOverAt = t; logEvent(b, type, 'handed_over', me.id);
        X.addNote(d, b, 'driver_handover', 'Your driver handed the vehicle to the service center. Waiting for the center to confirm receipt.');
      } else if (action === 'complete') {
        J.completedAt = t; logEvent(b, type, 'completed', me.id);
      }
      write(key, d);
      const job = build({ key, d }, b, type, me.id);
      if (action === 'accept') notify(me.id, job, 'accepted', `You accepted ${job.reference}.`);
      if (action === 'complete' || action === 'handover_center') notify(me.id, job, 'completed', `${job.reference} is complete.`);
      return job;
    },
  },

  handover: {
    /** The code is checked by the same server-side function the customer portal uses (expiry, attempt limits). */
    async verify(jobId, code, { expectedPhase } = {}) {
      await delay(450);
      const me = ME();
      requireApproved(me);
      const { bookingId, type } = parseId(jobId);
      const loc = locate(bookingId);
      const phase = loc && phaseOf(loc.b, type, me.id);
      if (!phase) throw new E('NOT_FOUND', 'This job was not found, or it is not assigned to you.');
      if (expectedPhase && expectedPhase !== phase) throw new E('STALE', 'This job has changed since you opened it. The latest state has been loaded.', { phase });
      if (phase !== 'inspected') throw new E('PRECONDITION', 'Record the vehicle condition at the handover point before verifying the code.');
      if (!/^\d{6}$/.test(String(code))) throw new E('INVALID_INPUT', 'Enter the 6-digit code.');
      try { X.consumeOtp(loc.d, loc.b, type, code); } catch (e) { write(loc.key, loc.d); throw e; }
      logEvent(loc.b, type, 'verified', me.id);
      write(loc.key, loc.d);
      return build(loc, loc.b, type, me.id);
    },
  },

  notifications: {
    async list() {
      await delay(120);
      const me = ME();
      requireApproved(me);
      // Cancellations are discovered from the shared record, once per job.
      const s = dstate(me.id);
      for (const j of allJobs(me.id).filter((x) => x.phase === 'cancelled')) {
        if (!s.notifications.some((n) => n.id === `cancel:${j.id}`)) s.notifications.unshift({ id: `cancel:${j.id}`, jobId: j.id, reference: j.reference, type: 'cancelled', message: `${j.reference} was cancelled by the customer.`, createdAt: nowISO(), read: false });
      }
      write(dkey(me.id), s);
      return s.notifications;
    },
    async markRead(id) { const me = ME(); const s = dstate(me.id); const n = s.notifications.find((x) => x.id === id); if (n) n.read = true; write(dkey(me.id), s); },
    async markAllRead() { const me = ME(); const s = dstate(me.id); s.notifications.forEach((n) => (n.read = true)); write(dkey(me.id), s); },
  },

  profile: {
    async get() {
      await delay(120);
      const me = ME();
      const s = dstate(me.id);
      return { id: me.id, name: me.name, phone: me.phone || '', email: me.email, accountStatus: me.driverStatus || 'approved', serviceArea: me.serviceArea || null, availability: s.availability };
    },
  },

  /** Simulation tools. A real backend (dispatch/operations) assigns jobs; drivers never create their own. */
  demo: {
    async simulateOffer(type = 'pickup') {
      await delay(300);
      const me = ME();
      requireApproved(me);
      if (dstate(me.id).availability !== 'online') throw new E('OFFLINE', 'Go online first. Offers only reach drivers who are online.');
      for (const { key, d } of blobs()) {
        for (const b of d.bookings) {
          if (offerFor(b, type, me.id)) continue;
          const free = type === 'pickup' ? b.status === 'confirmed' && !b.driver : b.status === 'service_completed' && b.delivery && !b.deliveryDriver;
          if (!free) continue;
          (b.offers = b.offers || []).push({ job: type, driverId: me.id, status: 'offered', at: nowISO() });
          logEvent(b, type, 'offered', me.id);
          write(key, d);
          const job = build({ key, d }, b, type, me.id);
          notify(me.id, job, 'offer', `New ${type} offer: ${job.reference}.`);
          return job;
        }
      }
      throw new E('NOTHING_TO_OFFER', type === 'pickup' ? 'No unassigned booking to offer. Create a booking in the customer portal first.' : 'No delivery is waiting for a driver. Schedule a delivery on a completed booking in the customer portal first.');
    },
    async peekCode(jobId) {
      const me = ME();
      const { bookingId, type } = parseId(jobId);
      const loc = locate(bookingId);
      if (!loc || phaseOf(loc.b, type, me.id) !== 'inspected') return null;
      const o = loc.d.otps[`${bookingId}:${type}`];
      return o ? o.code : null;
    },
  },
};

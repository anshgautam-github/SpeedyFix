/**
 * ONE coherent demo world, written once and read by all four portals. The same booking is the same record everywhere:
 * the customer sees it in My Bookings, the service center sees it for its center, the driver sees it when assigned,
 * and the admin sees every booking. Change a status in one portal and the others show the same status.
 *
 * Frontend-only: this is mock data in the browser, not a shared backend. Nothing here is synchronized across
 * users or devices, and no real account, driver, center or customer is involved.
 */
import { NS, clearAll, nowISO, read, write } from './store';
import { CENTERS } from './centers';
import { allPersonaUsers } from './personas';

const hoursAgo = (h) => new Date(Date.now() - h * 36e5).toISOString();
const day = (n = 0) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const SLOT = '09:00 - 12:00';
const DRIVERS = {
  karthik: { id: 'u_driver_demo', name: 'Karthik S.', phone: '+91 90000 11111' },
  arun: { id: 'u_seed_driver', name: 'Arun P.', phone: '+91 90000 33333' },
};
const NOTE = {
  confirmed: 'Booking confirmed.', driver_assigned: 'A driver has been assigned to your pickup.', driver_en_route: 'Your driver is on the way. Verify the handover when they arrive.',
  picked_up: 'Your vehicle has been collected.', in_transit: 'Your vehicle is on its way to the service center.', received_at_center: 'Your vehicle was received by the service center.',
  service_in_progress: 'Service has started on your vehicle.', service_completed: 'Service is complete. Schedule delivery when you are ready.', delivered: 'Your vehicle has been delivered.', cancelled: 'Booking cancelled.',
};

const emptyBlob = () => ({ vehicles: [], bookings: [], notifications: [], otps: {}, idem: {} });

function writePlatformBase() {
  write('platform', {
    centers: { 'demo-c3': { approval: 'pending', status: 'active', at: nowISO() }, 'demo-c4': { approval: 'pending', status: 'active', at: nowISO() } },
    extraCenters: [{ id: 'demo-c4', name: 'Demo Garage D', address: '3 Prototype Park, Sample City', services: ['General servicing'], hours: null, demo: true, submittedAt: nowISO() }],
    audit: [], alertState: {}, seeded: true,
  });
  write('center:demo-c1', { settings: { contact: '+91 90000 66666', hours: 'Mon-Sat, 9:00 - 18:00', hourlyRate: 600 }, technicians: [{ id: 't_1', name: 'Ravi M.', phone: '', active: true }, { id: 't_2', name: 'Suresh K.', phone: '', active: true }, { id: 't_3', name: 'Imran A.', phone: '', active: true }], seen: {}, seeded: true });
  ['u_driver_demo', 'u_seed_driver', 'u_driver_meena'].forEach((id) => write(`driver:${id}`, { availability: 'online', confirmedAt: nowISO(), notifications: [] }));
}

function build() {
  const blobs = {};
  const blob = (uid) => (blobs[uid] = blobs[uid] || emptyBlob());
  const vehicle = (uid, id, make, model, year, type, registration) => { blob(uid).vehicles.push({ id, make, model, year, type, registration, notes: '', createdAt: hoursAgo(300), demo: true }); return { id, make, model, year, registration, type }; };
  const centerOf = (id) => CENTERS.find((c) => c.id === id);
  const booking = (uid, id, v, centerId, status, history, extra = {}) => {
    const c = centerOf(centerId);
    const b = {
      id, reference: `SF-DEMO-${10230 + Number(id.slice(6))}`,
      vehicleId: v.id, vehicle: { make: v.make, model: v.model, year: v.year, registration: v.registration, type: v.type }, serviceType: 'General servicing', serviceNotes: '', priority: 'normal',
      pickup: { address: '42 Lakeview Avenue', city: 'Sample City', postalCode: '560001', landmark: 'Opposite the park gate', phone: '9000000000', date: day(0), slot: SLOT, instructions: '' },
      centerId, center: { name: c.name, address: c.address }, status, driver: null, deliveryDriver: null, delivery: null, demo: true,
      statusHistory: history.map(([s, h]) => ({ status: s, at: hoursAgo(h) })), handovers: { pickup: { verifiedAt: null }, delivery: { verifiedAt: null } }, ...extra,
    };
    b.createdAt = b.statusHistory[0].at; b.updatedAt = b.statusHistory[b.statusHistory.length - 1].at;
    blob(uid).bookings.push(b);
    b.statusHistory.forEach((h) => blob(uid).notifications.push({ id: `n_${id}_${h.status}`, bookingId: id, reference: b.reference, type: h.status, message: NOTE[h.status] || h.status, createdAt: h.at, read: true }));
    return b;
  };
  const insp = (h) => ({ exterior: 'good', scratches: 'none', visibleDamage: 'none', fuel: 'Half', accessories: '', notes: '', photos: [], at: hoursAgo(h) });
  const receiving = (h) => ({ identityConfirmed: true, exterior: 'good', scratches: 'none', fuel: 'Half', accessories: '', notes: '', at: hoursAgo(h), by: 'u_center_mgr', byName: 'Anita Rao' });
  const wo = (b, status, tech, hist, labour = [], parts = []) => {
    b.workOrder = { id: `wo_${b.id}`, reference: `WO-DEMO-${b.reference.slice(-5)}`, status, technicianId: tech, createdAt: hoursAgo(hist[0][1]), startedAt: ['in_progress', 'waiting_parts', 'quality_check', 'completed'].includes(status) ? hoursAgo(hist[Math.min(3, hist.length - 1)][1]) : null, completedAt: status === 'completed' ? hoursAgo(hist[hist.length - 1][1]) : null, labour, parts, history: hist.map(([s, h]) => ({ status: s, at: hoursAgo(h) })) };
  };
  const lab = (id, t, hrs, desc) => ({ id, technicianId: t, hours: hrs, rate: 600, description: desc });
  const par = (id, desc, q, p) => ({ id, description: desc, qty: q, unitPrice: p });
  const log = (b, by, entries) => { b.jobLog = entries.map(([job, event, h]) => ({ job, event, at: hoursAgo(h), by })); };

  // --- Priya Raman (the customer preview persona) ---
  const creta = vehicle('u_cust_priya', 'v_priya_creta', 'Hyundai', 'Creta', 2021, 'SUV', 'KA01AB1234');
  const swift = vehicle('u_cust_priya', 'v_priya_swift', 'Maruti', 'Swift', 2018, 'Hatchback', 'KA05MN7788');
  const b1 = booking('u_cust_priya', 'b_demo1', creta, 'demo-c1', 'in_transit', [['confirmed', 6], ['driver_assigned', 5.5], ['driver_en_route', 4], ['picked_up', 3], ['in_transit', 2.5]],
    { driver: DRIVERS.arun, handovers: { pickup: { verifiedAt: hoursAgo(3) }, delivery: { verifiedAt: null } }, pickupJob: { acceptedAt: hoursAgo(5.5), startedAt: hoursAgo(4), arrivedAt: hoursAgo(3.4), inspection: insp(3.2), collectedAt: hoursAgo(2.9), toCenterAt: hoursAgo(2.5), centerArrivedAt: hoursAgo(0.3), handedOverAt: hoursAgo(0.25) } });
  log(b1, 'u_seed_driver', [['pickup', 'accepted', 5.5], ['pickup', 'started', 4], ['pickup', 'arrived', 3.4], ['pickup', 'inspected', 3.2], ['pickup', 'verified', 3], ['pickup', 'collected', 2.9], ['pickup', 'started', 2.5], ['pickup', 'center_arrived', 0.3], ['pickup', 'handed_over', 0.25]]);
  const b2 = booking('u_cust_priya', 'b_demo2', swift, 'demo-c1', 'delivered', [['confirmed', 240], ['driver_assigned', 239], ['driver_en_route', 238], ['picked_up', 237], ['in_transit', 236], ['received_at_center', 235], ['service_in_progress', 232], ['service_completed', 210], ['delivery_driver_assigned', 100], ['delivered', 98]],
    { driver: DRIVERS.arun, deliveryDriver: DRIVERS.arun, delivery: { date: day(-4), slot: '12:00 - 15:00', address: '42 Lakeview Avenue, Sample City', requestedBy: 'customer' }, receiving: receiving(235), handovers: { pickup: { verifiedAt: hoursAgo(237) }, delivery: { verifiedAt: hoursAgo(98) } },
      pickupJob: { handedOverAt: hoursAgo(235.5), centerArrivedAt: hoursAgo(235.6), collectedAt: hoursAgo(237) }, deliveryJob: { acceptedAt: hoursAgo(100), startedAt: hoursAgo(99), arrivedAt: hoursAgo(98.5), inspection: insp(98.4), completedAt: hoursAgo(97.9) } });
  wo(b2, 'completed', 't_1', [['new', 235], ['accepted', 234], ['assigned', 233], ['in_progress', 232], ['quality_check', 211], ['completed', 210]], [lab('l_b2', 't_1', 1, 'Inspection')], [par('p_b2', 'Cabin filter', 1, 450)]);
  log(b2, 'u_seed_driver', [['pickup', 'handed_over', 235.5], ['delivery', 'accepted', 100], ['delivery', 'started', 99], ['delivery', 'arrived', 98.5], ['delivery', 'inspected', 98.4], ['delivery', 'verified', 98], ['delivery', 'completed', 97.9]]);
  booking('u_cust_priya', 'b_demo3', creta, 'demo-c2', 'cancelled', [['confirmed', 500], ['cancelled', 499]]);

  // --- other customers ---
  const seltos = vehicle('u_cust_rahul', 'v_rahul_seltos', 'Kia', 'Seltos', 2022, 'SUV', 'TN10BX2046');
  const polo = vehicle('u_cust_rahul', 'v_rahul_polo', 'Volkswagen', 'Polo', 2019, 'Hatchback', 'KA04GH7788');
  booking('u_cust_rahul', 'b_demo4', seltos, 'demo-c1', 'confirmed', [['confirmed', 3]], { priority: 'urgent', serviceType: 'Repair and maintenance', serviceNotes: 'Brake noise at low speed' });
  booking('u_cust_rahul', 'b_demo9', polo, 'demo-c2', 'driver_assigned', [['confirmed', 2], ['driver_assigned', 1.5]], { driver: DRIVERS.karthik, pickupJob: { acceptedAt: hoursAgo(1.5) }, serviceType: 'Inspection', pickup: { address: '9 Garden Road', city: 'Sample City', postalCode: '560002', landmark: 'Near the bakery', phone: '9876500001', date: day(0), slot: '12:00 - 15:00', instructions: 'Call on arrival' } });
  const city = vehicle('u_cust_meena', 'v_meena_city', 'Honda', 'City', 2020, 'Sedan', 'KA01CD4455');
  const b5 = booking('u_cust_meena', 'b_demo5', city, 'demo-c1', 'service_in_progress', [['confirmed', 30], ['driver_assigned', 29], ['driver_en_route', 28], ['picked_up', 27], ['in_transit', 26], ['received_at_center', 25], ['service_in_progress', 24]], { driver: DRIVERS.arun, receiving: receiving(25), handovers: { pickup: { verifiedAt: hoursAgo(27) }, delivery: { verifiedAt: null } }, pickupJob: { handedOverAt: hoursAgo(25.2), collectedAt: hoursAgo(27) } });
  wo(b5, 'in_progress', 't_1', [['new', 25], ['accepted', 25], ['assigned', 24.5], ['in_progress', 24]], [lab('l_b5', 't_1', 1.5, 'Brake inspection')], [par('p_b5', 'Brake pads, front', 1, 1850)]);
  const nexon = vehicle('u_cust_imran', 'v_imran_nexon', 'Tata', 'Nexon', 2021, 'SUV', 'MH12XY5566');
  const b6 = booking('u_cust_imran', 'b_demo6', nexon, 'demo-c1', 'service_in_progress', [['confirmed', 60], ['driver_assigned', 59], ['driver_en_route', 58], ['picked_up', 57], ['in_transit', 56], ['received_at_center', 55], ['service_in_progress', 50]], { driver: DRIVERS.arun, receiving: receiving(55), handovers: { pickup: { verifiedAt: hoursAgo(57) }, delivery: { verifiedAt: null } }, pickupJob: { handedOverAt: hoursAgo(55.2), collectedAt: hoursAgo(57) } });
  wo(b6, 'waiting_parts', 't_2', [['new', 55], ['accepted', 54], ['assigned', 53], ['in_progress', 50], ['waiting_parts', 30]], [lab('l_b6', 't_2', 0.5, 'Diagnosis')]);
  const innova = vehicle('u_cust_divya', 'v_divya_innova', 'Toyota', 'Innova', 2017, 'MPV / Van', 'DL03CD9090');
  const i20 = vehicle('u_cust_divya', 'v_divya_i20', 'Hyundai', 'i20', 2023, 'Hatchback', 'KA02JK1122');
  const b7 = booking('u_cust_divya', 'b_demo7', innova, 'demo-c1', 'service_in_progress', [['confirmed', 50], ['driver_assigned', 49], ['driver_en_route', 48], ['picked_up', 47], ['in_transit', 46], ['received_at_center', 45], ['service_in_progress', 40]], { driver: DRIVERS.arun, receiving: receiving(45), handovers: { pickup: { verifiedAt: hoursAgo(47) }, delivery: { verifiedAt: null } }, pickupJob: { handedOverAt: hoursAgo(45.2), collectedAt: hoursAgo(47) } });
  wo(b7, 'quality_check', 't_3', [['new', 45], ['accepted', 44], ['assigned', 43], ['in_progress', 40], ['quality_check', 2]], [lab('l_b7', 't_3', 2, 'Full service')], [par('p_b7a', 'Oil filter', 1, 320), par('p_b7b', 'Engine oil, 4 L', 1, 2400)]);
  booking('u_cust_divya', 'b_demo10', i20, 'demo-c2', 'confirmed', [['confirmed', 0.2]], { offers: [{ job: 'pickup', driverId: 'u_driver_demo', status: 'offered', at: hoursAgo(0.1) }], serviceType: 'General servicing', pickup: { address: '15 Orchard Lane', city: 'Sample City', postalCode: '560003', landmark: 'Next to the pharmacy', phone: '9876500004', date: day(1), slot: SLOT, instructions: '' } });
  const baleno = vehicle('u_cust_suresh', 'v_suresh_baleno', 'Maruti', 'Baleno', 2020, 'Hatchback', 'KA09EF3344');
  const b8 = booking('u_cust_suresh', 'b_demo8', baleno, 'demo-c1', 'service_completed', [['confirmed', 80], ['driver_assigned', 79], ['driver_en_route', 78], ['picked_up', 77], ['in_transit', 76], ['received_at_center', 75], ['service_in_progress', 70], ['service_completed', 1]], { driver: DRIVERS.arun, receiving: receiving(75), handovers: { pickup: { verifiedAt: hoursAgo(77) }, delivery: { verifiedAt: null } }, pickupJob: { handedOverAt: hoursAgo(75.2), collectedAt: hoursAgo(77) } });
  wo(b8, 'completed', 't_1', [['new', 75], ['accepted', 74], ['assigned', 73], ['in_progress', 70], ['quality_check', 3], ['completed', 1]], [lab('l_b8', 't_1', 1, 'AC service')], [par('p_b8', 'Cabin filter', 1, 450)]);
  return blobs;
}

/** Writes persona accounts only (no bookings). Used by "Clear demo data" so empty states can be previewed. */
function writeUsers() { write('users', allPersonaUsers()); }

export function seedWorld() {
  clearAll();
  writeUsers();
  writePlatformBase();
  const blobs = build();
  Object.entries(blobs).forEach(([uid, d]) => write(`data:${uid}`, d));
  write('world', { mode: 'full', at: nowISO() });
}

export function clearWorld() {
  clearAll();
  writeUsers();
  write('platform', { centers: {}, extraCenters: [], audit: [], alertState: {}, seeded: false });
  write('world', { mode: 'empty', at: nowISO() });
}

/** First visit: load the demo world once. After "Clear demo data" the world stays empty until the user reloads it. */
export function ensureWorld() {
  if (!read('world', null)) seedWorld();
}
export const worldMode = () => read('world', null)?.mode || null;

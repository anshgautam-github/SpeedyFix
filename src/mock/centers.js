/** The service centers known to the demo. Approval state lives in the platform record (see seed.js and the admin services). */
export const CENTERS = [
  { id: 'demo-c1', name: 'Demo Service Center A', address: '12 Example Road, Sample City', services: ['General servicing', 'Inspection'], hours: 'Mon-Sat, 9:00 - 18:00' },
  { id: 'demo-c2', name: 'Demo Service Center B', address: '48 Illustration Street, Sample City', services: ['General servicing', 'Repair and maintenance', 'Inspection'], hours: 'Mon-Sat, 8:30 - 19:00' },
  { id: 'demo-c3', name: 'Demo Service Center C', address: '7 Placeholder Avenue, Sample City', services: ['Repair and maintenance', 'Other'], hours: null },
].map((c) => ({ ...c, demo: true }));

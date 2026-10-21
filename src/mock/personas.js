/**
 * Preview personas. These are NOT accounts and have no passwords. They exist so a portal can be previewed with demo
 * data. Choosing a persona is not authentication, and nothing here is a security boundary.
 */
const at = '2026-01-01T00:00:00.000Z';
export const PERSONAS = {
  customer: { id: 'u_cust_priya', role: 'customer', name: 'Priya Raman', email: 'priya.raman@customer.example', phone: '9876543210' },
  driver: { id: 'u_driver_demo', role: 'driver', name: 'Karthik S.', email: 'karthik.s@driver.example', phone: '+91 90000 11111', driverStatus: 'approved' },
  center: {
    manager: { id: 'u_center_mgr', role: 'center', staffRole: 'manager', centerId: 'demo-c1', name: 'Anita Rao', email: 'anita.rao@center.example' },
    advisor: { id: 'u_center_adv', role: 'center', staffRole: 'advisor', centerId: 'demo-c1', name: 'Vikram Shah', email: 'vikram.shah@center.example' },
  },
  admin: {
    super: { id: 'u_admin_demo', role: 'admin', adminLevel: 'super', name: 'Platform Admin', email: 'platform.admin@speedyfix.example' },
    operations: { id: 'u_admin_ops', role: 'admin', adminLevel: 'operations', name: 'Operations Lead', email: 'operations@speedyfix.example' },
  },
};

/** Other accounts that exist in the demo world (customers and drivers with data, but no preview entry). */
export const EXTRA_USERS = [
  { id: 'u_cust_rahul', role: 'customer', name: 'Rahul Menon', email: 'rahul.menon@customer.example', phone: '9876500001' },
  { id: 'u_cust_meena', role: 'customer', name: 'Meena Iyer', email: 'meena.iyer@customer.example', phone: '9876500002' },
  { id: 'u_cust_imran', role: 'customer', name: 'Imran Sheikh', email: 'imran.sheikh@customer.example', phone: '9876500003' },
  { id: 'u_cust_divya', role: 'customer', name: 'Divya Nair', email: 'divya.nair@customer.example', phone: '9876500004' },
  { id: 'u_cust_suresh', role: 'customer', name: 'Suresh Pillai', email: 'suresh.pillai@customer.example', phone: '9876500005' },
  { id: 'u_seed_driver', role: 'driver', name: 'Arun P.', email: 'arun.p@driver.example', phone: '+91 90000 33333', driverStatus: 'approved' },
  { id: 'u_driver_meena', role: 'driver', name: 'Meena R.', email: 'meena.r@driver.example', phone: '+91 90000 22222', driverStatus: 'approved' },
  { id: 'u_driver_farhan', role: 'driver', name: 'Farhan K.', email: 'farhan.k@driver.example', phone: '+91 90000 44444', driverStatus: 'pending' },
  { id: 'u_driver_lakshmi', role: 'driver', name: 'Lakshmi N.', email: 'lakshmi.n@driver.example', phone: '+91 90000 55555', driverStatus: 'suspended' },
];

export const allPersonaUsers = () => [
  PERSONAS.customer, PERSONAS.driver, PERSONAS.center.manager, PERSONAS.center.advisor, PERSONAS.admin.super, PERSONAS.admin.operations, ...EXTRA_USERS,
].map((u) => ({ preferredContact: 'phone', addresses: [], phone: '', ...u, createdAt: at }));

export function personaFor(portal, level) {
  if (portal === 'customer') return PERSONAS.customer;
  if (portal === 'driver') return PERSONAS.driver;
  if (portal === 'center') return PERSONAS.center[level || 'manager'];
  if (portal === 'admin') return PERSONAS.admin[level || 'super'];
  return null;
}

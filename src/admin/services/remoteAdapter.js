/**
 * REMOTE ADMIN ADAPTER (not connected). Implement each method against your backend; no endpoint is assumed.
 * Same signatures and return shapes as demoAdapter.js. See src/admin/README.md for the rules the server must enforce.
 */
import { ServiceError } from '../../portal/services/errors';

const todo = (name) => async () => {
  throw new ServiceError('NOT_IMPLEMENTED', `"${name}" is not connected yet. Implement it in src/admin/services/remoteAdapter.js.`);
};
const group = (name, methods) => Object.fromEntries(methods.map((m) => [m, todo(`${name}.${m}`)]));

export const remoteAdminAdapter = {
  mode: 'remote',
  context: group('context', ['get']),
  dashboard: group('dashboard', ['get']),
  users: group('users', ['list', 'get', 'setActive', 'changeRole', 'requestRecovery']),
  customers: group('customers', ['list']),
  drivers: group('drivers', ['list', 'setApproval']),
  centers: group('centers', ['list', 'get', 'setApproval', 'setStatus', 'updateInfo']),
  bookings: group('bookings', ['list', 'get', 'cancel', 'update', 'addNote']),
  dispatch: group('dispatch', ['list', 'eligibleDrivers', 'assign', 'offer']),
  vehicles: group('vehicles', ['list']),
  workOrders: group('workOrders', ['list']),
  handovers: group('handovers', ['list', 'reissue']),
  alerts: group('alerts', ['list', 'acknowledge', 'count']),
  reports: group('reports', ['get', 'exportBookings']),
  audit: group('audit', ['list']),
  settings: group('settings', ['get', 'update']),
  demo: null,
};

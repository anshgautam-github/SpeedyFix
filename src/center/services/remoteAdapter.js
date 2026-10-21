/**
 * REMOTE SERVICE-CENTER ADAPTER (not connected). Implement each method against your backend; no endpoint is assumed.
 * Same signatures and return shapes as demoAdapter.js. See src/center/README.md for the rules the server must enforce.
 */
import { ServiceError } from '../../portal/services/errors';

const todo = (name) => async () => {
  throw new ServiceError('NOT_IMPLEMENTED', `"${name}" is not connected yet. Implement it in src/center/services/remoteAdapter.js.`);
};
const group = (name, methods) => Object.fromEntries(methods.map((m) => [m, todo(`${name}.${m}`)]));

export const remoteCenterAdapter = {
  mode: 'remote',
  context: group('context', ['get']),
  dashboard: group('dashboard', ['get']),
  bookings: group('bookings', ['list', 'get', 'lookupVehicle', 'createPickup', 'update', 'cancel']),
  receiving: group('receiving', ['list', 'confirm']),
  workOrders: group('workOrders', ['list', 'get', 'transition', 'addLabour', 'removeLabour', 'addPart', 'removePart']),
  technicians: group('technicians', ['list', 'create', 'setActive']),
  deliveries: group('deliveries', ['list', 'request']),
  vehicles: group('vehicles', ['list']),
  reports: group('reports', ['get']),
  activity: group('activity', ['list', 'markSeen']),
  settings: group('settings', ['get', 'update']),
  demo: null,
};

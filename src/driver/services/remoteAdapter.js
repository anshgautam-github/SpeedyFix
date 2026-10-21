/**
 * REMOTE DRIVER ADAPTER (not connected). Implement each method against your backend; no endpoint is assumed.
 * Same signatures and return shapes as demoAdapter.js. See src/driver/README.md for the server-side rules.
 */
import { ServiceError } from '../../portal/services/errors';

const todo = (name) => async () => {
  throw new ServiceError('NOT_IMPLEMENTED', `"${name}" is not connected yet. Implement it in src/driver/services/remoteAdapter.js.`);
};

export const remoteDriverAdapter = {
  mode: 'remote',
  availability: { get: todo('availability.get'), set: todo('availability.set') },
  jobs: { stats: todo('jobs.stats'), list: todo('jobs.list'), get: todo('jobs.get'), transition: todo('jobs.transition') },
  handover: { verify: todo('handover.verify') },
  notifications: { list: todo('notifications.list'), markRead: todo('notifications.markRead'), markAllRead: todo('notifications.markAllRead') },
  profile: { get: todo('profile.get') },
  demo: null,
};

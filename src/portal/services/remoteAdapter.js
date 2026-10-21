/**
 * REMOTE ADAPTER (not connected).
 *
 * This is the single place to connect the portal to your real backend. Every method below has the same
 * signature as the demo adapter (see demoAdapter.js for the exact shapes of the data it returns). No endpoint
 * is assumed: implement each one against your own API or database, using your existing auth provider, and
 * reject with `new ServiceError(code, message)` on failure.
 *
 * Server-side requirements (do not rely on this UI for them):
 *  - Every query is scoped to the authenticated customer; never trust a customer id sent by the browser.
 *  - bookings.cancel / scheduleDelivery enforce status rules; bookings.create is idempotent per key.
 *  - handover.verify checks the code on the server (expiry, attempt limits). OTP codes never reach the client
 *    except to the customer who is meant to receive them.
 *  - Booking statuses are mapped to the keys in src/portal/domain/status.js.
 */
import { ServiceError } from './errors';

const todo = (name) => async () => {
  throw new ServiceError('NOT_IMPLEMENTED', `"${name}" is not connected yet. Implement it in src/portal/services/remoteAdapter.js.`);
};

export const remoteAdapter = {
  mode: 'remote',
  auth: {
    getSession: async () => null, // return { user } from your auth provider when signed in
    subscribe: () => () => {}, // call the callback when the provider's session changes
    signIn: todo('auth.signIn'),
    signUp: todo('auth.signUp'),
    signOut: todo('auth.signOut'),
    changePassword: todo('auth.changePassword'),
  },
  profile: { get: todo('profile.get'), update: todo('profile.update') },
  vehicles: { list: todo('vehicles.list'), create: todo('vehicles.create'), update: todo('vehicles.update'), remove: todo('vehicles.remove') },
  centers: { list: todo('centers.list') },
  bookings: {
    serviceTypes: todo('bookings.serviceTypes'),
    list: todo('bookings.list'),
    summary: todo('bookings.summary'),
    get: todo('bookings.get'),
    create: todo('bookings.create'),
    cancel: todo('bookings.cancel'),
    scheduleDelivery: todo('bookings.scheduleDelivery'),
  },
  tracking: { get: todo('tracking.get') },
  handover: { verify: todo('handover.verify'), resend: todo('handover.resend') },
  serviceProgress: { get: todo('serviceProgress.get') },
  notifications: { list: todo('notifications.list'), markRead: todo('notifications.markRead'), markAllRead: todo('notifications.markAllRead') },
  demo: null,
};

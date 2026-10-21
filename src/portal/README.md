# Customer portal (src/portal)

Routes: `/login`, `/signup`, `/customer/dashboard`, `/customer/vehicles`, `/customer/bookings`, `/customer/bookings/new`,
`/customer/bookings/:bookingId`, `/customer/tracking[/:bookingId]`, `/customer/notifications`, `/customer/profile`, `/customer/help`.

Add `{portalRoutes()}` (from `src/portal/routes.jsx`) inside your existing `<Routes>`. Needs `react-router-dom` v6.

## Modes
- `demo` (default): `services/demoAdapter.js`. Data lives in this browser's localStorage. Amber "Demo" labels appear wherever data or
  behaviour is simulated.
- `remote`: set `VITE_PORTAL_MODE=remote`. `services/remoteAdapter.js` is a stub: every method rejects with NOT_IMPLEMENTED and the UI
  shows "Backend not connected". Implement each method against your backend. Nothing in a screen needs to change.

## Service contract (what remoteAdapter must provide)
| Module | Methods |
| --- | --- |
| auth | getSession, subscribe, signIn, signUp, signOut, changePassword |
| profile | get, update |
| vehicles | list, create, update, remove |
| centers | list |
| bookings | serviceTypes, list({tab,query,vehicleId,cursor,limit}), summary, get, create(payload, idempotencyKey), cancel, scheduleDelivery |
| tracking | get (returns booking, lastUpdated, liveLocation = null when there is no GPS) |
| handover | verify(bookingId, 'pickup' | 'delivery', code), resend |
| serviceProgress | get (null until the center has the vehicle) |
| notifications | list, markRead, markAllRead |

Return shapes: see the objects built in `demoAdapter.js`. Map your statuses to the keys in `domain/status.js`.

## Server-side rules the backend must enforce (the UI only hints at them)
- Every read and write is scoped to the authenticated customer. Never trust a customer id from the browser (with Supabase: RLS
  policies on vehicles, bookings and notifications keyed on `auth.uid()`).
- `cancel` only before the pickup starts; `scheduleDelivery` only after service is completed and only once.
- `create` is idempotent per key; reject unknown vehicle/center and past dates.
- OTP codes are generated, delivered, expired and attempt-limited on the server. The browser only submits a code.
- A vehicle with an open booking cannot be removed.

## What is real vs simulated in demo mode
Real in the UI and logic: routing and guards, form validation, wizard, duplicate-submit protection, status-dependent actions,
cancel/OTP/vehicle rules (enforced inside the demo "server" functions), notifications read state, persistence in the browser.
Simulated: personas (there are no accounts or passwords), service centers, drivers, status progress (use "Simulate the next update"
on the tracking page), OTP codes (revealed on screen), service progress, delivery slots. Not available: live GPS, SMS/email/push,
payments, maps.

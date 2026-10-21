# Frontend mock layer (src/mock)

Speedy Fix has no backend yet. Everything you see in the four portals comes from this layer, so the screens agree with each other.

- `store.js`: browser storage helpers. Per browser only. It is not shared between users or devices.
- `seed.js`: `seedWorld()` writes ONE demo dataset (customers, vehicles, 10 bookings in different states, drivers, centers,
  work orders, technicians). `clearWorld()` keeps only the personas so empty states can be previewed. Reset and Clear are in the preview banner.
- `personas.js`: the preview personas (customer, driver, service center manager and advisor, super admin and operations).
  They are NOT accounts, have no passwords, and are not a security boundary.
- `centers.js`: the demo service centers.

The same booking record is read by all portals (customer, service center, driver, admin) through their own service module
(`src/*/services`). When the backend exists, replace each `demoAdapter.js` with a real client; screens do not change.

## Authentication
Not built. Sign-in, Google sign-in, sign-up and password reset validate the form and then report "not available yet". Nothing is
stored, no session is created, and the password is never kept. "Preview with demo data" is the only way in, and it is labelled as not a sign-in.

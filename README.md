# Speedy Fix landing page

React + Vite + Tailwind 3 + GSAP (ScrollTrigger, ScrollToPlugin) + Framer Motion + Lucide.

## Run it
    npm install
    npm run dev

## Add it to an existing app
Everything is under `src/landing/`. Mount `LandingPage` on a route and import nothing else.
- Merge `theme.extend` from `tailwind.config.js` (colors `midnight`, `navy`, `volt`, `silver`, `paper`, `ok`; fonts `display`, `sans`) and make sure `content` covers `./src/**/*.{js,jsx}`.
- Copy the two Google Fonts links (Archivo, Instrument Sans) from `index.html`.
- `landing.css` is imported by `LandingPage.jsx`. It sets `overflow-x: clip` on html/body; check it suits your other pages.
- Keep your own React version if it is 18 or 19.

## Fill in before launch
`src/landing/config.js`: contact person, email, phone, WhatsApp. Empty values are not rendered. Until one is set,
"Become a Partner" jumps to the contact area, which shows a developer notice in dev only.

## Customer portal
See `src/portal/README.md`. It runs in demo mode by default; connect your backend in `src/portal/services/remoteAdapter.js`.

## Driver portal
See `src/driver/README.md`. Same demo/remote split; sign in at `/login` ("Explore the driver portal" in demo mode).

## Service center portal
See `src/center/README.md`. Same demo/remote split; sign in at `/login` ("Explore the service center portal" in demo mode).

## Super Admin portal
See `src/admin/README.md`. Same demo/remote split; sign in at `/login` ("Explore the admin portal" in demo mode).

## Frontend-only status
There is no backend and no authentication yet. See `src/mock/README.md`. Run `npm install && npm run dev`, then open `/login` (customer),
`/driver/login`, `/service-center/login` or `/admin/login` and use **Preview with demo data** to explore a portal. Sign-in, Google sign-in,
sign-up and password reset are UI-only and say so.

## Where things are
- `journey/CarJourneySection.jsx`: pinned stage and the master timeline (T 0 to 107). Scene timing lives in each `scenes/*Scene.jsx` (`animateX` functions).
- `journey/world/`: road path and stops (`geometry.js`), SVG world (`World.jsx`), parallax layers.
- `components/Car.jsx`: the SVG car. `JourneyStatic.jsx`: reduced-motion version of the journey.
- Journey length: `end` in `CarJourneySection.jsx` (6.6 screens desktop, 4.6 mobile).

## Notes
- All names, the vehicle number and rupee amounts on screen are sample data and labelled as such.
- Not tested with real GSAP/ScrollTrigger at the time of writing. First things to check: pin start/end, scrub feel, and
  resize behaviour.

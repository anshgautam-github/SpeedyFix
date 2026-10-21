# Super Admin portal (src/admin)

Routes: `/admin/dashboard`, `bookings`, `bookings/:bookingId`, `assignments`, `journeys`, `handovers`, `work-orders`, `vehicles`, `drivers`,
`service-centers`, `service-centers/:centerId`, `customers`, `users`, `users/:userId`, `notifications`, `reports`, `audit-logs`, `settings`.
Mounted by `src/portal/routes.jsx` (`adminRoutes()`), sharing the portal's auth provider. Sign-in is the existing `/login`; signed-in users
without the admin role see an access-denied page.

## Modes
- `demo` (default): `services/demoAdapter.js` reads and writes the SAME simulated records as the customer, driver and center adapters, so admin
  decisions bind every portal (suspended drivers and centers are blocked, unapproved centers cannot be booked, deactivated users cannot sign in,
  assignments appear in the driver's list and on the customer's booking). Everything is stored in this browser.
- `remote`: `VITE_PORTAL_MODE=remote` uses `services/remoteAdapter.js` (stub). Implement each method; no endpoint is assumed.

## Service contract
| Module | Methods |
| --- | --- |
| context | get (admin, level, permissions, centers) |
| dashboard | get(filters) |
| users | list, get, setActive(id, active, reason), changeRole(id, role, reason), requestRecovery |
| customers | list |
| drivers | list, setApproval(id, approved/rejected/suspended, reason) |
| centers | list, get, setApproval, setStatus(active/suspended, reason), updateInfo(contact, hours, reason) |
| bookings | list, get, cancel(id, reason), update(id, patch, reason), addNote |
| dispatch | list({view}), eligibleDrivers(jobId), assign(jobId, driverId, {reason, expectedDriverId}), offer(jobId, driverId) |
| vehicles, workOrders | list (read-only) |
| handovers | list, reissue(jobId, reason) |
| alerts | list, acknowledge, count |
| reports | get({from,to}), exportBookings({from,to}) |
| audit | list (there is deliberately no update or delete) |
| settings | get, update(next, reason) |

## What the backend must enforce (the UI only hints)
1. Identity and administrator level come from the verified session. A role can only be set by an existing super admin or a service process,
   never by the client; nobody can change their own role or deactivate themselves; the last active super admin cannot be removed.
2. Every sensitive action (approve/reject/suspend, deactivate, cancel, correct, reassign, settings, handover recovery) requires a reason and
   writes an append-only audit row in the same transaction, with actor, before and after values. Never log passwords, tokens or OTP codes.
3. Assignment is atomic: compare the expected current driver, check the driver is approved, active, online (if required) and under the active-job
   limit, then update the booking, the assignment and the status history together. Reject stale requests. Reassignment resets the old driver's
   progress and issues a fresh handover.
4. Admins can never verify a handover or read a code. Recovery issues a NEW code to the customer for a locked or expired handover only.
5. Center and driver approval states are enforced in their own APIs (not only in this UI) and in booking creation.
6. Reports and exports are scoped to what the admin may see; the CSV export excludes customer personal data. Exports are audited.
7. Work orders are read-only for admins unless a separate, audited permission is added.

## Suggested Supabase shape (a sketch: not run, schema was not inspected, adapt to your existing tables)
```sql
create table admin_users (user_id uuid primary key references auth.users, level text not null check (level in ('super','operations')), active boolean not null default true);
alter table drivers add column approval text not null default 'pending' check (approval in ('pending','approved','rejected','suspended'));
alter table service_centers add column approval text not null default 'pending', add column status text not null default 'active';
create table audit_log (id bigserial primary key, at timestamptz not null default now(), actor uuid not null, action text not null, entity text, entity_id text,
  reason text, before jsonb, after jsonb);
revoke update, delete on audit_log from authenticated, anon;               -- append-only
alter table audit_log enable row level security;
create policy super_reads_audit on audit_log for select using (exists (select 1 from admin_users a where a.user_id = auth.uid() and a.level = 'super' and a.active));
-- No direct write policies for admins on bookings, drivers or centers. Writes go through SECURITY DEFINER functions that check admin level, require a
-- reason, perform the change and insert the audit row in one transaction, e.g.
--   admin_assign_driver(p_job text, p_driver uuid, p_expected_driver uuid, p_reason text)   -- row lock on the booking; checks eligibility
--   admin_set_driver_approval(p_driver uuid, p_decision text, p_reason text)
--   admin_set_center_status(p_center uuid, p_status text, p_reason text)
--   admin_reissue_handover_code(p_job text, p_reason text)                                  -- new hashed code; never returns it to the admin
-- Service-role keys stay on the server. Role tables are writable only by the service role.
```
Not built: live GPS or distance/time estimates (no mapping integration), SMS/email/push delivery, driver identity or licence verification,
admin editing of work orders, pricing/commission/payout controls, creating user logins.

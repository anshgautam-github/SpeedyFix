# Driver portal (src/driver)

Routes: `/driver/dashboard`, `/driver/jobs`, `/driver/jobs/:jobId`, `/driver/navigation/:jobId`, `/driver/handover/:jobId`,
`/driver/history`, `/driver/notifications`, `/driver/profile`. Mounted by `src/portal/routes.jsx` (`driverRoutes()`), so it shares the
portal's auth provider. Sign-in is the existing `/login`; users are sent to the home for their role.

## Modes
- `demo` (default): `services/demoAdapter.js` reads and writes the SAME simulated booking records as the customer portal's demo adapter,
  so a driver action changes what the customer sees. Everything is stored in this browser.
- `remote`: `VITE_PORTAL_MODE=remote` uses `services/remoteAdapter.js` (stub). Implement each method; no endpoint is assumed.

## Service contract
| Module | Methods |
| --- | --- |
| availability | get, set(online) |
| jobs | stats, list({group,groups,query,from,to,cursor,limit}), get(jobId), transition(jobId, action, {expectedPhase, payload}) |
| handover | verify(jobId, code, {expectedPhase}) |
| notifications | list, markRead, markAllRead |
| profile | get |

Actions: accept, decline(reason), start, arrive, inspect(checklist), confirm_collection, start_to_center, arrive_center, handover_center, complete.
OTP verification is separate (`handover.verify`) because it must be checked on the server. Phase names: `domain/jobs.js`.

## What the backend must enforce (the UI only hints)
1. Identity and role come from the verified session. A driver role can only be set by an admin/service process, never by a client form.
2. A driver reads only jobs offered or assigned to their own account. Another driver's job looks like "not found".
3. Offers: accept is atomic ("first accepted wins", reject with ALREADY_TAKEN); decline requires a reason; drivers cannot assign themselves.
4. Transitions follow a state machine, reject out-of-order steps, and reject a request whose `expectedPhase` is no longer current.
5. Pickup/delivery cannot complete without (a) a saved condition record and (b) a successful server-side OTP check. Codes are hashed,
   expire, and are attempt-limited. The browser never receives the correct code.
6. Customer phone and full address are returned only after acceptance and only while the job is open.
7. Unapproved or suspended drivers get no assignments (ACCOUNT_NOT_APPROVED). Going offline during an active job is refused.
8. Customer, driver and service-center portals read the same booking record, so one event updates all three.

## Suggested Supabase shape (a sketch: not run, schema was not inspected, adapt to your existing tables)
Reuse any existing bookings, profiles, assignments and status-history tables first. If missing, you would need:
```sql
create table driver_profiles (user_id uuid primary key references auth.users, status text not null default 'pending'
  check (status in ('pending','approved','suspended')), availability text not null default 'offline', service_area text);
create table job_assignments (id uuid primary key default gen_random_uuid(), booking_id uuid not null, leg text not null check (leg in ('pickup','delivery')),
  driver_id uuid references auth.users, offered_to uuid references auth.users, phase text not null, phase_version int not null default 0,
  unique (booking_id, leg));
create table handover_codes (booking_id uuid, leg text, code_hash text not null, expires_at timestamptz not null, attempts int not null default 0,
  verified_at timestamptz, primary key (booking_id, leg));
create table condition_records (id uuid primary key default gen_random_uuid(), assignment_id uuid references job_assignments, data jsonb not null, created_at timestamptz default now());
-- RLS: drivers see only rows where driver_id = auth.uid() (or offered_to = auth.uid() with redacted columns via a view).
alter table job_assignments enable row level security;
create policy driver_reads_own on job_assignments for select using (driver_id = auth.uid() or offered_to = auth.uid());
-- No direct UPDATE policy for drivers. All writes go through SECURITY DEFINER functions, for example:
--   driver_transition(p_assignment uuid, p_action text, p_expected_phase text, p_payload jsonb)
--   driver_verify_handover(p_assignment uuid, p_code text)    -- compares a hash, enforces expiry and attempts, same transaction as the status change
-- Roles live in a table writable only by the service role; storage buckets for photos need per-assignment policies.
```
Not built: photo upload (no storage integration exists), live GPS, push/SMS/email, earnings or ratings (no business model supplied).

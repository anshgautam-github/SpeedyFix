# Service center portal (src/center)

Routes: `/service-center/dashboard`, `bookings`, `bookings/new`, `bookings/:bookingId`, `receiving`, `vehicles`, `work-orders`,
`work-orders/:workOrderId`, `technicians`, `deliveries`, `reports`, `profile`, `settings`. Mounted by `src/portal/routes.jsx`
(`centerRoutes()`), sharing the portal's auth provider. Sign-in is the existing `/login`. Signed-in users without the center role
see an access-denied page.

## Modes
- `demo` (default): `services/demoAdapter.js` reads and writes the SAME simulated booking records as the customer and driver demo
  adapters, so one booking connects all three portals. Everything is stored in this browser.
- `remote`: `VITE_PORTAL_MODE=remote` uses `services/remoteAdapter.js` (stub). Implement each method; no endpoint is assumed.

## Service contract
| Module | Methods |
| --- | --- |
| context | get (staff member, center, permissions) |
| dashboard | get |
| bookings | list, get, lookupVehicle(registration), createPickup(payload, idempotencyKey), update, cancel |
| receiving | list, confirm(bookingId, checklist) |
| workOrders | list, get, transition(id, action, {expectedStatus, payload}), addLabour, removeLabour, addPart, removePart |
| technicians | list, create, setActive |
| deliveries | list({stage}), request(bookingId, {date, slot, address, notes}, idempotencyKey) |
| vehicles | list |
| reports | get |
| activity | list, markSeen |
| settings | get, update |

Return shapes: see `demoAdapter.js`. Work-order actions: accept, assign, start, hold_parts, resume, complete_service, pass_qc, fail_qc, cancel.

## Rules the backend must enforce (the UI only hints)
1. Every query and write is scoped to the staff member's own center. Another center's records look like "not found".
2. Roles: manager (everything), advisor (bookings, receiving, work orders except assigning technicians, deliveries, reports), technician
   (only their own assigned work orders). Roles and center membership are set by an administrator, never by the client.
3. Work-order transitions follow the state machine, reject stale requests (`expectedStatus`), need labour recorded before servicing is
   completed, and only the quality-check step can complete a work order. Labour and parts are locked after completion.
4. A vehicle is "received" only when staff confirm it AND the driver has recorded arrival. Receiving creates exactly one work order per
   booking. Staff cannot mark a handover verified or a vehicle delivered: those are driver and OTP results.
5. Delivery can be requested only when the work order is completed and no delivery exists; idempotent per key.
6. Booking creation is idempotent per key and refuses a second open booking for the same registration at a center.
7. Numeric validation (hours, rates, quantities, prices) and totals are computed on the server from stored values.
8. Important changes append to an audit trail (who, what, when). Customers do not see internal work-order notes.

## Suggested Supabase shape (a sketch: not run, schema was not inspected, adapt to your existing tables)
Reuse existing bookings, vehicles, service-center, work-order, technician and status-history tables first. If you must add:
```sql
create table center_staff (user_id uuid primary key references auth.users, center_id uuid not null, staff_role text not null
  check (staff_role in ('manager','advisor','technician')), technician_id uuid, active boolean not null default true);
create table work_orders (id uuid primary key default gen_random_uuid(), booking_id uuid not null unique, center_id uuid not null,
  status text not null, technician_id uuid, started_at timestamptz, completed_at timestamptz, version int not null default 0);   -- unique(booking_id): one work order per visit
create table labour_entries (id uuid primary key default gen_random_uuid(), work_order_id uuid references work_orders, technician_id uuid,
  hours numeric(6,2) check (hours > 0), rate numeric(10,2) check (rate >= 0), description text);
create table part_entries (id uuid primary key default gen_random_uuid(), work_order_id uuid references work_orders, description text not null,
  qty int check (qty > 0), unit_price numeric(12,2) check (unit_price >= 0));
create table audit_log (id bigserial primary key, center_id uuid, actor uuid, action text, entity text, entity_id uuid, at timestamptz default now());
-- RLS: rows visible only where center_id = (select center_id from center_staff where user_id = auth.uid() and active)
alter table work_orders enable row level security;
create policy center_reads_own on work_orders for select using (center_id = (select center_id from center_staff where user_id = auth.uid() and active));
-- No direct INSERT/UPDATE policies for staff. Writes go through SECURITY DEFINER functions that check role, center, expected version and state, e.g.
--   center_receive_vehicle(p_booking uuid, p_checklist jsonb)   -- requires driver arrival; creates the work order; updates booking status; audits
--   center_wo_transition(p_wo uuid, p_action text, p_expected_status text, p_payload jsonb)
--   center_request_delivery(p_booking uuid, p_date date, p_slot text, p_address text, p_key text)
-- Service-role keys stay on the server. Photo storage needs per-center bucket policies.
```
Not built: photo upload (no storage integration), map coordinates, invoicing or payments (labour plus parts are workshop cost records only),
staff login creation, a separate technician portal.

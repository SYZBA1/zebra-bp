
## Expert Booking System

Build a complete booking + payment workflow for the Expertise feature, with a dedicated expert login area and admin oversight.

### 1. Database (migration)

New tables:
- **experts** — `user_id` (links to auth.users), `name`, `title`, `industry`, `bio`, `tags[]`, `price_etb`, `years_experience`, `rating`, `approval_rate`, `verified`, `online`, `accent`, `initials`, `appointments_count`. Seeded from existing `src/lib/experts-data.ts` (seed rows have null `user_id` until claimed).
- **expert_bookings** — `user_id` (booker), `expert_id`, `expert_user_id`, `topic`, `description`, `preferred_date`, `preferred_time`, `amount_etb`, `payment_method` (telebirr/cbe/stripe), `transaction_ref`, `status` (pending_payment / pending_approval / confirmed / rejected / completed), `admin_note`, `created_at`.
- Extend **app_role** enum with `'expert'`.

RLS:
- experts: public SELECT; admin write; expert can update own row.
- expert_bookings: booker sees own; expert sees rows where `expert_user_id = auth.uid()`; admin sees all + can update.

### 2. Expert authentication

- `/expert/login` — sign-in/sign-up page (email + password + Google), assigns `expert` role on signup via edge function (or self-claim flow gated by admin approval).
- `ExpertRoute.tsx` guard checking `has_role(uid, 'expert')`.
- `/expert` layout with sidebar: Dashboard, Bookings, Profile.
- **ExpertDashboard** — stats (pending bookings, earnings, rating).
- **ExpertBookings** — list of bookings assigned to them; accept/reject/mark complete.
- **ExpertProfile** — edit bio, price, availability toggle (online/offline), tags.

### 3. Booking + payment flow (user side)

- Refactor `ExpertCard` "Book Now" to open new `BookExpertDialog`.
- Step 1: form (topic, description, preferred date/time) — same shape as `AppointmentForm`.
- Step 2: payment screen mirroring `PremiumCheckoutDialog` (Telebirr / CBE / Stripe placeholder + ZEBRA account info + transaction ID input).
- Submit creates `expert_bookings` row with `status='pending_approval'`, plus a `notifications` row for admin and for the expert.

### 4. Admin side

- New `/admin/bookings` page (`AdminBookings.tsx`) listing all expert bookings: approve / reject, view transaction ref, mark paid → triggers booking confirmation.
- Add nav entry in `AdminLayout`.

### 5. Notifications

- On booking insert: insert `notifications` rows for the expert (`expert_user_id`) and for all admins (use a security-definer function or trigger).
- Expert dashboard polls/subscribes to `notifications` and `expert_bookings` via Supabase Realtime.

### 6. Files

**New:**
- `supabase/migrations/<ts>_expert_booking.sql`
- `src/pages/ExpertLogin.tsx`
- `src/pages/expert/ExpertLayout.tsx`, `ExpertDashboard.tsx`, `ExpertBookings.tsx`, `ExpertProfile.tsx`
- `src/components/ExpertRoute.tsx`
- `src/components/expertise/BookExpertDialog.tsx`
- `src/pages/admin/AdminBookings.tsx`

**Edited:**
- `src/App.tsx` — register routes.
- `src/components/expertise/ExpertCard.tsx` — wire dialog.
- `src/pages/Expertise.tsx`, `src/components/ExpertiseSection.tsx` — replace toast with dialog; pull from DB instead of static array (fall back to seed if empty).
- `src/pages/admin/AdminLayout.tsx` — add Bookings nav link.

### Notes / assumptions
- Payment is **manual transaction-ID submission** with admin verification (same pattern as Marketplace). No live payment gateway integration.
- Experts self-register on `/expert/login`; admin must verify them before they appear in the public directory (`verified=true`).
- The static `experts-data.ts` is seeded into the DB so existing UI keeps working immediately.

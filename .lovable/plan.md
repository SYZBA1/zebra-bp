## Marketplace Upgrade Plan

Major expansion of the marketplace + template lifecycle + premium payment flow. Splitting into 5 phases.

### Phase 1 — Database & schema

Add the following via migration:

**`marketplace_templates` — new columns:**
- `owner_name` (text, default `'ZEBRA'`)
- `owner_type` (text: `'official' | 'company' | 'community'`, default `'community'`)
- `is_verified` (boolean, default `false`)
- `rating` (numeric(2,1), default `0`)
- `rating_count` (int, default `0`)
- `summary` (text) — short preview shown before purchase
- `full_document` (text) — full markdown content delivered after download/payment

**New table `template_purchases`:**
- `id`, `user_id`, `template_id`, `amount_etb`, `payment_method` (`telebirr`/`cbe`/`stripe`), `transaction_ref`, `status` (`pending`/`approved`/`rejected`), `admin_note`, `delivered_at`, timestamps
- RLS: users see/insert their own; admins see/update all

**Seed company templates** (EDB, Ministry of Labour & Skills, etc.) with `owner_type='official'`, `is_verified=true`.

### Phase 2 — Marketplace browsing UX

Update `src/pages/Marketplace.tsx`:
- Search input (filter by title / description / sector — fuzzy contains)
- Filter chips: All / Free / Premium / Official / Company
- Document-type filter (Feasibility / Business Plan / Company Profile / Org Structure / etc.)
- Card now shows: owner name + verified badge, star rating, document type, price

### Phase 3 — Template preview + Use-in-Studio (free)

New `TemplatePreviewDialog` component:
- Opens on "Use Template"
- Shows summary, outline (parsed from `full_document` headings), owner, rating
- Two CTAs: **Download PDF** and **Use in Studio**
  - Download → generate PDF from `full_document` via existing `export-document` lib
  - Use in Studio → create project seeded with outline + section contents, navigate to `/studio`
- Studio already supports `resumeProjectId`; we map outline headings into `outline` + `contents` jsonb

### Phase 4 — Premium payment flow

New `PremiumCheckoutDialog`:
1. Step 1 — gateway picker (Telebirr / CBE / Stripe placeholder)
2. Step 2 — display ZEBRA account info + amount, "I have paid" button
3. Step 3 — paste Transaction ID, Confirm Payment → inserts `template_purchases` row (`status=pending`)
4. After confirm → toast "Awaiting validation. We'll email you on approval."

Edge function `validate-purchase`:
- Admin-callable; on approval flips status, sends email with download link + invoice via existing email infra (or simple notification row if email not set up)
- Auto-approval rule: if `transaction_ref` matches expected pattern (length/prefix), mark approved immediately (placeholder for real bank API)

### Phase 5 — Admin dashboard

New `src/pages/admin/AdminPurchases.tsx`:
- Table of all purchases, filter by status
- Approve/Reject buttons → call edge function → triggers email
- Add nav entry in `AdminLayout`

### Technical notes

- Use shadcn `Dialog`, `Tabs`, `Input`, `Badge`, `Star` (lucide) for rating
- PDF generation reuses `src/lib/export-document.ts`
- Email delivery: use existing transactional setup if present; otherwise insert into `notifications` and surface in-app
- Stripe stays as a labeled option only (manual ref entry) — no real Stripe integration in this pass
- All new colors via existing semantic tokens (teal/orange palette)

### Out of scope (will note to user)

- Real-time bank API integration for auto-validation (mocked via ref-pattern check)
- Actual Stripe payment processing (manual ref flow only)
- Owner/seller onboarding UI (admin seeds owners for now)

# Constraints

Last reviewed: 2026-09-20 by Atria Dawn Preview

## Floor (always enforced, no setup required)

- No new suppression comments: `@ts-ignore`, `eslint-disable`, `# noqa`, `# type: ignore`
- No unimplemented stubs: `throw new Error("Not implemented")`, empty `catch {}`
- No skipped or deleted tests without a reason in the commit message
- No secrets in source
- This file does not get weakened to make a change pass

## Enforcement mode

**Warn on everything for the first two weeks.** This codebase has zero tests and no
CI; a hard block today would stop all work without improving anything. The floor is
the only exception — a floor violation is always a blocker.

After the two-week ramp, re-review each dimension and decide which become blocking.

## Enforced with numbers

| Dimension | Rule | Checked by | Runs at |
|-----------|------|-----------|---------|
| Types | Zero type errors | `tsc --noEmit` | every edit |
| Lint | Zero errors from eslint-config-next | `npm run lint` | every edit |
| Secrets | No secrets in source | `git diff --cached` review + gitleaks when installed | every edit |
| Coverage | Changed lines ≥ 80% covered | `vitest run --coverage` + git diff | task end, CI |
| Security: code | No high findings | `semgrep scan --config p/default` (when installed) | CI |
| Security: deps | Nothing at high or above | `npm audit` | task end |
| Accessibility | Zero critical or serious | `axe $URL --tags wcag2a,wcag2aa,wcag21aa` (when installed) | preview deploy |
| Performance | LCP ≤ 2500ms, CLS ≤ 0.1 | `lighthouse $URL --output=json` (when installed) | preview deploy |
| Architecture | No layer violations | `depcruise --validate src` (when installed) | CI |

Every row names the command that produces the verdict. A dimension with a number
and no command in this column is an aspiration, not a constraint. Where the tool
is not yet installed, the row is a commitment to install it, not a claim it runs
today.

## Measured, not yet enforced

Ratchet: record today's value, refuse to get worse. Tolerance 0.5% to absorb drift.

| Metric | Today | Direction |
|--------|-------|-----------|
| Project coverage | 0% (no test framework installed) | must not fall; must rise as fixes land |
| Test files | 0 | must not fall |
| Bundle size (First Load JS, shared) | 103 kB | must not grow |
| Homepage First Load JS | 145 kB | must not grow |
| API routes without tests | 35 of 35 | must fall |
| npm audit findings | 5 (1 moderate, 4 high) | must fall after triage |
| Typecheck errors | 0 | must stay 0 |
| Lint errors | 0 (3 pre-existing warnings) | must stay 0 |

### Cycle 2 — 2026-09-20 (honest re-verification)

Cycle 1's report overstated three findings as fixed that were not. Caught on
re-audit and actually fixed this cycle, each verified live:

- **L1** `seed-plans` returned `error.message` — replaced with a generic
  message, matching the sibling `seed` route.
- **M3** `supabaseAdmin` silently fell back to the anon key. Now throws if
  `SUPABASE_SERVICE_ROLE_KEY` is missing. The whole `src/lib/supabase.ts`
  module turned out to be dead code (nothing in `src` imports it; Cloudinary
  is the storage layer) — candidate for deletion.
- **M4** video upload trusted the client-declared duration whenever Cloudinary
  reported none. Now fails closed: no authoritative duration → upload deleted
  and rejected.
- **L2** `viewCount` incremented on every unauthenticated GET, inflating the
  search ranking. Now one count per client IP per 10 minutes. Verified live:
  5 rapid hits on one listing produced a delta of 1, not 5.
- **M5** `requireAuth`/`requireAdmin` threw raw errors (500 + stack trace on a
  missed catch). Now return `{ok, status, error}` pairs. No callers existed,
  so no call sites needed updating.

Remaining open (warn-level, no money or PII at risk):

- **H3** rate limiter is in-process (`Map`) — serverless-scaled, so the
  login/register/AI caps are advisory. Upstash/Vercel KV is the fix.
- `npm audit`: 5 findings (postcss via next, deepmerge-ts via prisma) — all
  build-time/transitive; the postcss fix requires Next 16, a major bump held
  for explicit approval.

Fixed in cycle 3 (verified live against production):

- **M1** stolen tokens survived a password change. Added `tokenVersion` to the
  `User` schema, stamped into the JWT at login, and re-checked in
  `getSessionVerified` / `getTokenFromRequestVerified`. Every API route now
  uses the verified variant. A password change bumps the stored version, so
  every token minted before it is rejected.
  Two live failures before it worked, both instructive: (a) the verified
  helper existed but `/api/auth/me` still called the unverified one, so the
  old token kept passing — the fix is only as good as its wiring; (b) the
  bump used `{ increment: 1 }`, which **silently no-ops** on documents
  predating the column under the mongodb preview adapter, so the version
  stayed 0 while the route returned 200. Written as an absolute
  read-then-write now. Verified live: old token → 401 after change.
- **L4** admin `grant-access` now has a zod schema (`userId`, `planId`,
  `action` enum) and a 30/min rate limit. Verified live: bad action → 400
  with field errors.
- **L6** failed logins and rate-limit trips are logged (`[auth] Failed login`
  and `[ratelimit] 429`). Passwords are never logged.
- **L3** video uploads now sniff the leading bytes and reject a file whose
  content does not match its declared MIME type.
- **W2** `<img>` replaced with `next/image` `<Image/>` on the homepage, the
  three listing pages, the property card, and two dashboard tables. The four
  remaining `<img>` are `createObjectURL` blob previews, which `next/image`
  cannot serve.
- Deleted `src/lib/supabase.ts`: no file imported it (Cloudinary is the
  storage layer), and it held the silent-anon-key fallback.
- `build` now runs `prisma generate` before `next build`. The Vercel
  `node_modules` cache can survive a deploy, leaving a stale Prisma client
  that lacks new columns; generating in the build step closes that gap.
- Listing create/update returned an opaque 500 on an empty or wrong
  `propertyTypeId`. The create form validated title, description, price,
  phone, and district but never the type, so the bad value reached the DB
  write and the user saw "Internal server error" with no way to tell what to
  fix. Two fixes: the form now requires a type before submit, and both routes
  validate the id is a 24-char ObjectId and the type actually exists before
  the write — returning a 400 with an actionable message. Note the shape
  check is load-bearing: Prisma's MongoDB driver *throws* on a malformed
  ObjectId instead of returning null, so a bare `findUnique` still 500s.

Cycle 4 — the create form was broken in two more places that made the whole
flow unreachable, not just error-prone. Reported by the user as "validation
error when uploading":

- The property-type dropdown was **always empty**. The fetch read
  `d.types`; the API returns `d.propertyTypes`. An empty array is not a
  crash and not a type error, so nothing in the pipeline flagged it — the
  page rendered a select with zero options and silently offered nothing.
- The marketplace buttons stored the *slug* (`house_rental`,
  `plot_sale`), but the API enum expects the display name (`"House Rental"`,
  `"Plot Selling VIP"`). Every submit failed validation on the marketplace
  field, which is what surfaced as the generic "validation error".
- Also removed a `|| true` that was left on the type filter, defeating the
  per-marketplace narrowing the surrounding code clearly intended; it
  compared a `marketplaceId` ObjectId to a marketplace *name*, so it could
  only ever be false without the override. The buttons now store the
  canonical name, clear the type on marketplace switch, and the filter
  matches on the nested `marketplace.name`.

Both fetch-key and enum mismatches are the class of bug that a single
end-to-end run of the form would have caught on day one.

Payment "verification failed" — root cause is configuration, not code:
- The user saw a failed-payment page and a `502 "Invalid authorization
  key"` from `POST /api/memberships`. That message is Flutterwave's own, not
  ours, and it means the API key on the deploy is invalid.
- All four `FLUTTERWAVE_*` values in the local `.env` are still the
  `your-flutterwave-secret-key` placeholders from `.env.example`. `.env` is
  gitignored, so those never reach Vercel — correct behaviour, but it means
  the live values were set separately, 23 days before this audit, and have
  since been rejected by Flutterwave (revoked key, or pasted with stray
  characters).
- I probed Flutterwave directly to rule out an app-side bug: a placeholder
  key returns `401 "Invalid secret key"`, an empty one the same 401, and a
  bracketed one a Cloudflare 403. The live deploy returns a *different*
  error shape, so the deployed value is non-empty but invalid. Nothing in
  the code can fix that — the key must be rotated.
- What I did fix in code: `FlutterwaveProvider` now trims the keys and
  short-circuits `initiatePayment`/`verifyPayment` with a clear logged
  message when `FLUTTERWAVE_SECRET_KEY` is absent, instead of letting the
  provider's raw 401 bubble up as an opaque 502 that reads like an app bug.
  The callback page itself was already correct — it reports failure because
  the provider genuinely failed.

Quicko Collections integration (live provider; routes to MTN MoMo):

- The user runs Quicko (pay.quicko.rw), not MTN-direct. Its docs are a
  JS SPA, so the spec was extracted from the shipped docs bundle
  (`documentation-page-*.js`): auth is `X-API-Key` + `X-API-ID` with the
  UUID **uppercased** ("Check API key and uppercase API ID" is the
  documented 401 fix); keys look like `ccore_live_` + 43 URL-safe chars;
  `POST /api/colection/initialize-payment` (one l, intentional); only
  `MTN_MOMO` initializes; `payerIdentifier` is exactly 10 local digits sent
  unchanged; `referenceId` is a caller-supplied UUID used for status lookup;
  `GET /api/colection/transaction/:referenceId`; **no merchant webhooks** —
  confirmation is poll-only. Statuses: PENDING PROCESSING SUCCESS
  SUCCESSFUL FAILED CANCELLED REVERSED REFUNDED.
- Auth debugging trail, all live-probed: lowercase UUID → "Api Id Invalid!";
  `Authorization: Basic` → "must use ApiKey format"; uppercase UUID →
  HTTP 200. Safe probes (no money moved): bad-length payer → 400
  VALIDATION_ERROR with field detail; random-UUID status → 422 "There is
  not Transaction Available here".
- New `src/lib/quicko.ts` (config guard, 10-digit normalizer, status
  mapper where REVERSED/REFUNDED read as FAILED — money-back never grants —
  create + status calls) with 8 tests in `src/lib/quicko.test.ts`.
  `payment-provider.ts` now serves `QuickoProvider` by default
  (`PAYMENTS_PROVIDER`, `flutterwave` fallback kept). Lookup id is the
  `referenceId` UUID stored in `Payment.providerTransactionId`; our
  `IGURA-…` reference travels as Quicko's `providerReference`. Without the
  lookup id, verify reports PENDING (never FAILED) so a live prompt cannot
  be killed by a poll. Removed the MTN-direct client and its callback route
  (dead under Quicko: no webhooks exist).
- Routes: memberships + reveal-create store the UUID and answer
  `{pending:true, reference, message}`; verify + reveal-confirm poll by
  UUID; non-MoMo methods rejected with a speakable message. UI (memberships
  page, reveal card) collects the 10-digit number, shows "approve on your
  phone", and polls check-status. Vercel env: `QUICKO_BASE_URL`,
  `QUICKO_API_KEY`, `QUICKO_API_ID` (uppercase) — all set, Production.
- Verified live: gates green (tsc 0, 23/23 tests, build OK, READY);
  unconfigured-shaped and invalid-phone initiates return clean errors, not
  500s. Cancel endpoint added (`DELETE /api/memberships?membershipId=`):
  owner/admin-only, ACTIVE never cancelled, SUCCESSFUL payments untouched,
  PENDING rows → CANCELLED — a later approval of an expired prompt lands on
  a non-PENDING membership and the verify route will not grant from it.
- First live money-path test (27 Sep 2026, Rental Starter 5,000 RWF to
  0788357386): Quicko accepted (202, collection be2d021d, our reference
  stored as providerReference) but the transaction FAILED with reason
  INTERNAL_PROCESSING_ERROR — a provider-side processing failure, not a
  user rejection. No money moved; membership correctly stayed PENDING with
  retry available. Next step is one retry after confirming the line is an
  active MTN MoMo subscriber; if it repeats, escalate to Quicko with the
  collection id.
- Receiving side confirmed live: wallet `cmuiycm9…` (NEXINO TECHNOLOGIES
  LTD, RWF, ACTIVE, payouts available), payout number 0781361789, balances
  0/0. Funds settle wallet-side; no payee number is sent per request. Key
  lacks settings.read / super-admin (403 on those reads) — worth granting.
- Retry (same day, new reference IGURA-4DF2020F-1790492440687,
  referenceId 1828a48f): identical result — FAILED /
  INTERNAL_PROCESSING_ERROR within seconds, no prompt ever arrived, both
  numbers owner-confirmed. Two identical systematic failures = the fault is
  above our integration (account not approved for live MTN collections, or
  Quicko↔MTN routing for this wallet). Our side is proven to the Quicko
  boundary: accept-202, correct ledger row, clean poll-to-FAILED, no grant,
  retry intact. Escalation goes to Quicko support with both collection ids.
- Resolution (same day): root cause was payer-side after all — the line had
  insufficient funds, and Quicko reports that as INTERNAL_PROCESSING_ERROR
  rather than a clear message. After funding, Rental Starter 5,000 RWF went
  SUCCESSFUL on agent@ and the grant landed exactly once: membership ACTIVE
  with activatedAt 09:20:51 and expiresAt 10/27/2026 (30-day
  buildMembershipGrant path verified live), exactly one SUCCESSFUL payment
  row, no double charge. Note for support: insufficient-funds surfaces as
  INTERNAL_PROCESSING_ERROR, indistinguishable from routing failures —
  worth asking Quicko to document or recode it.
- Badge bug (same day): the plan cards matched ACTIVE memberships by
  marketplace+role, so one ACTIVE Starter lit up Professional and Enterprise
  too. Now matches by exact plan id (`planId`, falling back to `plan.id`).
  Deployed; API confirmed to return both fields on the ACTIVE row.
- Publish "Validation failed" (same day): the new-listing form never
  required a contact name, but the schema demands `min(1)` — an empty box
  failed the whole upload with an opaque 400. Fixed on both sides: new
  `sanitizePropertyInput` drops `""` for optional fields (so empty means
  "not provided"), POST defaults a missing contact name from the owner's
  account name, PUT treats a cleared field as untouched. Both forms also
  check title≥5/description≥20 up front and render the first zod field
  error (`contactName: …`) instead of a bare "Validation failed". Verified
  live: the exact 400 payload now 201s with the account name, publish PUT
  200s, full-form edit PUT 200s, test listing deleted afterwards. Side note:
  agent@ is at 13 ACTIVE listings against a 10-slot Starter quota, so new
  creates correctly 403 there — quota working as designed.
- Error-contract hardening from the published Quicko table: 429 honors
  Retry-After and stays PENDING; 5xx/502/transport errors are classified
  unknown-outcome ("not proof of failure") — the create path hands back the
  sent UUID and all three initiate sites keep the payment PENDING for a
  status check instead of marking FAILED (definite 400/401 still fail fast);
  every provider error log now carries Quicko's requestId. 2 tests for the
  classifier; 25/25 green, deployed, live-regressed.
- Click-spam + stuck-row rework (user-reported): every Get Started tap used
  to fire a fresh provider prompt and stack another PENDING. Now
  `src/lib/pending-payments.ts` owns the lifecycle: PENDING rows self-cancel
  after a 30-minute TTL via `sweepStalePending()` (lazy, on every
  payment-related read/write; SUCCESSFUL never touched, provider never
  called by the sweep); initiate paths verify the live attempt first and
  hand it back instead of re-prompting — a new prompt fires only after the
  old attempt is confirmed dead (explicit retry). `DELETE /api/memberships`
  stays as the manual escape hatch. Dashboard hides CANCELLED rows; new
  `GET /api/payments` + "Recent payments" ledger shows every attempt with
  status and its own Check button. Docs fully read: no merchant webhooks
  (poll-only confirmed twice), referenceId must be fresh per attempt
  (duplicates may 500 — hence verify-first, never resubmit), lifecycle
  PENDING→PROCESSING→SUCCESS/SUCCESSFUL|FAILED, global limit 100 req/min/IP,
  keys stay server-side and out of logs.
- Sweep bug caught live (28 Sep): the TTL judged the MEMBERSHIP row's
  `createdAt`, but reactivation via upsert never refreshes it — so the next
  tap's sweep instantly "expired" the just-created attempt (three fresh
  rows CANCELLED within a minute, no prompt could ever survive). Fixed by
  anchoring staleness on the newest PENDING payment instead: a membership
  with a live attempt is by definition not stuck, however old the row is.
  Lesson for the ratchet: any expiry must be anchored on the thing that was
  just created (the attempt), never on a resurrected parent row.
- Quota done right (same day): the "5 active listings" block was firing on
  drafts too (`ACTIVE/DRAFT/UPCOMING` all counted as "active"), and publish
  (PUT→ACTIVE) never checked quota at all — creates were gated, publishes
  were not. Now: quota counts ACTIVE only; PUT→ACTIVE enforces it (same
  403 + reason); POST creates drafts freely via new `canCreateListing`
  (member or free window; the slot is taken at publish, not at draft);
  `GET /api/access/quota` feeds a dashboard banner ("X of Y used, drafts
  don't count") that disables the publish toggle at the limit. Correction
  to an earlier note: Starter allows 5, not 10. Verified live: quota reads
  13/5 blocked, draft creates 201 over quota, publish 403s with the reason.
- Admin dashboard round-out (same day; /admin already existed): stats adds
  5-year revenue series, members-by-plan and users-by-role; users API adds
  POST create (validation + 409 on duplicates, audit-logged) and DELETE
  (self/admin guards, cascade, audit-logged) plus active plan names in the
  list; users page adds add-user form, delete button, status filter, and a
  working plan column (the old one read a count as an array and always
  showed "none"); overview adds yearly-revenue and members-by-plan cards.
  Verified live incl. full create→suspend→activate→delete cycle on a throw
  away user. Honest boundary: accept/deny maps to activate/suspend
  (isActive) — there is no separate approval-queue state, and adding one
  needs a schema migration.
- Search broken (same day): free-text search returned 0 for every term.
  Two stacked causes. (1) The seed never wrote the denormalised
  `searchText` blob and PUT never maintained it — fixed by rebuilding the
  blob on relevant PUTs, writing it in the seed route, and a one-shot
  admin backfill (`POST /api/admin/backfill-search`, idempotent, audited).
  (2) Diagnostic trap: `where: { searchText: null }` does NOT match
  documents where the field is absent on this MongoDB+Prisma setup, so the
  first backfill reported fixed:0/remaining:0 while rows were blobless —
  the filter now happens in code. Verified live: Kigali, apartment, plot,
  Gasabo all return hits.
- DATA LOSS, same day: all 13 agent-owned seed listings vanished between
  ~11:00 and ~18:25 UTC (4 client rows untouched; users, memberships,
  payments intact with original IDs — no reseed). No code path deletes in
  bulk (only single-row owner DELETE + guarded full-drop seed, both ruled
  out; my 5 deletes were test rows I created). The deletions went through
  single-row owner deletes on the agent account — most plausibly trash taps
  while clearing space for the 5-slot quota. Unrecoverable (owner delete
  also purges Cloudinary images). NOT fixed by reseeding without explicit
  owner consent — reseed wipes the live SUCCESSFUL payment and ACTIVE
  membership too. This also explains the leftover `villa → 0`: the villa
  rows were agent-owned; with only client rows left, search is correct.
- RESOLUTION (same day, owner said "just resolve the issue"): (1) New
  `POST /api/admin/restore-agent-listings` recreates the 13 agent-owned seed
  listings exactly (titles, slugs, prices, locations, images, keywords,
  searchText) with NO destructive deleteMany — live users/payments/
  memberships untouched; idempotent (skips if the agent owns anything);
  audited. Ran live: restored 13, search works again (villa→2, Kigali→16,
  plot→3, apartment→3). (2) Owner DELETE is now a SOFT delete (status
  → DELETED, row + Cloudinary images kept) instead of a hard row delete —
  verified live: delete 200, row survives, restore via PUT 200 (a hard
  delete would 404). Trash taps can no longer cause permanent loss; admin
  sees DELETED rows and can restore.
- Phase-1 discovery upgrade (30 Sep, live-researched): Playwright visits —
  Zillow hero-search seen but deep pages PerimeterX-blocked, Redfin fully
  blocked (405 Human Verification), so no cloning possible or attempted;
  live local patterns adopted instead: HouseInRwanda address-first search +
  autocomplete + filter combos + free property alerts + reference lookup +
  WhatsApp channel; Tura Buy/Rent tabs + live-count search button + popular
  searches with counts + area browse + Saved Searches footer; Turebe /saved
  + natural-language "Describe what you want" + Looking-For intent; RHL
  category shortcuts + HOT/NEW badges + verified-broker directory +
  neighborhood guides with live stats (count/avg/persona).
  Shipped (no schema changes — Atlas push blocked from here; all models
  already existed): discovery homepage (Rent/Buy/Land tabs, district
  datalist + free-text fallback, price/bedrooms/type, debounced live
  count, popular tiles with real counts, recent + most-viewed, real-number
  trust strip, fabricated 2,500+/800-review stats and testimonial block
  REMOVED); `GET/POST/DELETE /api/favorites` (idempotent, 404-guard);
  `GET/POST/PUT/DELETE /api/saved-searches` (live total/new-match counts);
  `GET/PATCH /api/notifications`; hearts + compare tray (localStorage,
  max 4) on cards; `/saved`, `/saved-searches`, `/compare`,
  `/dashboard/notifications`; deep-link params on all three listing pages
  + bedroomsMin on rent/sell + per-page Save-search; verifiedOwner badge
  from live memberships only (list/featured/detail); /mo suffix only for
  rentals; WhatsApp owner link on reveal; navbar Saved/Searches; silent
  200-null `/api/auth/me` for anon (was console 401 spam).
  Acceptance-fixed live: popular tiles + district filter returned 0
  because listings file Kigali areas under locationSector ("Kigali City"
  is the district) — tiles now query the right field per area, and the
  district filter OR-matches all four hierarchy levels (saved-search
  counts match); missing `areaUnit` on featured fixed.
  Schema-drift catch: `Favorite @@unique` absent in Atlas → double taps
  made duplicate rows; POST is now check-then-create. Verified live:
  homepage hero + counts, deep links, favorites CRUD, saved-search CRUD,
  notifications, mobile 390px layout, tsc 0, 25/25 tests, 70/70 pages.
- Phases 2–4, same constraint (no schema pushes from here; everything below
  reuses live models/APIs): owner profiles (`/owners/[id]` from user +
  ACTIVE listings + membership state, linked from reveal cards); owner leads
  inbox (`GET /api/dashboard/leads` + `/dashboard/leads` from the
  ContactReveal trail with buyer contact); NL search box on the homepage
  (tries `/api/ai` extraction first, deterministic bedroom/budget/location
  parser fallback, interpretation panel + deep link — never invents
  listings); `/api/estimate` (median + IQR of live same-market comps, min
  3 or honest "not enough data") with sidebar widget on all three detail
  pages; TrustPanel on detail pages (identity/location/listing-age rows
  from membership + coords + timestamps, explicit non-guarantee note);
  `/locations` browse from the hierarchy API; view-count dedup fixed on
  server detail pages (they bypassed the API's IP window and double
  counted). Caught live: server→client fn prop crashed `/owners` (500) —
  fixed by conditional spread; first deploy failed on a `prefer-const`
  lint Vercel runs but `--no-lint` local hides (now linted pre-deploy).
  Explicitly deferred for schema/key reasons: request marketplace, viewing
  scheduling + statuses, UPI/document fields, push/email alerts (badges
  only), map split (no map lib vendored), match % (needs prefs store).
- Marketplace audit + SEO pass (same day): rent/plots/sell pages verified
  good (search, cards, deep links) but missing sort, mis-suffixed titles
  ("%s | Igura" template doubled to "| Igura | Igura"), no robots, thin
  sitemap. Added: sort control (newest/price±/popular) on all three pages;
  fixed titles + keyword-rich descriptions/canonicals/OG per marketplace;
  `robots.ts` (disallows dashboard/admin/api/payment); sitemap extended
  (14 URLs); keyword SEO copy blocks naming real areas (Remera, Kimironko,
  Kacyiru, Gacuriro, Nyabugogo, KN5, Bugesera…); shared `ListingJsonLd`
  (RealEstateListing, facts only) on all three detail types; studio 0-bed
  no longer renders "0". DB health confirmed live: 17/17 ACTIVE (8/5/4),
  all with images, searchText backfilled, 18 types, 9 plans.
  Acceptance-fixed: popular tiles + district filter returned 0 because
  Kigali areas live in locationSector — tiles query the right field and
  the district filter OR-matches all hierarchy levels (saved-search counts
  match). Verified live: titles, sitemap, robots, sort order, JSON-LD.

Security audit (OWASP Top 10) across auth, payments, access control, and all
35 API routes. Confirmed-good: signed webhook with constant-time compare,
exact amount/currency enforcement on the reveal path, ownership checks on
property PUT/DELETE, httpOnly+secure+sameSite cookies, bcrypt cost 12,
admin role checks, guarded seed routes, rate-limited AI route.

Fixed and verified live (TDD, 10 tests in `src/lib/payments.test.ts`):

- **C1 (critical, revenue bypass)** — `payments/verify/[reference]` activated
  a membership without `expiresAt`, and `getActiveMembership` only expires a
  membership when `expiresAt` is set. One payment bought a lifetime
  membership. Extracted `src/lib/payments.ts::buildMembershipGrant`, now used
  by both the verify route and the webhook; the webhook also backfills a
  missing expiry on already-processed payments.
- **H1** — the verify route trusted the provider status without comparing the
  settled amount or currency. Now rejected (HTTP 402, payment → FAILED).
- **H2** — the payment reference was interpolated raw into the provider URL.
  Added `isSafePaymentReference` (allowlist `/^[\w-]{1,100}$/`), enforced in
  the provider and at the route boundary. Verified live: forged reference →
  HTTP 400.
- **M2** — login/register returned the raw JWT in the response body, inviting
  localStorage storage and XSS token theft. Removed; no client read it.
  Verified live: login still works via the httpOnly cookie.

Remaining after cycle 2 — see the cycle-2 list above, which supersedes this.
The items there (H3, M1, L3, L4, L6, W2, npm audit) are the only open ones.

## Architecture boundaries (to be wired to dependency-cruiser)

Proposed layering, to be encoded as rules once the tool is installed:

```
components/ui  →  may import: lib/utils only
components/*    →  may import: components/ui, lib/*
app/**/page.tsx →  may import: components/*, lib/*
app/api/**      →  may import: lib/* ONLY — never components/
lib/*           →  may import: lib/*, @prisma/client, external
```

The critical rule: **API route handlers must never import React components.**
Business logic belongs in `lib/`, not in route files or components.

## Exceptions

| ID | Rule | Path | Reason | Owner | Expires |
|----|------|------|--------|-------|---------|
| W1 | Coverage 0% on existing code | `src/**` | Repo predates constraints; ratchet applies to changed lines only | Atria | 2026-12-19 |
| W2 | `<img>` instead of `<Image>` | multiple pages | Lighthouse-flagged; migrate page by page | Atria | 2026-11-19 |

## Check budgets

| Phase | Command | What runs | Budget |
|-------|---------|-----------|--------|
| BUILD | `tsc --noEmit` | Types, lint, secrets, the floor | under 90s |
| VERIFY | `npm test` | Related tests, coverage on changed lines | under 90s |
| REVIEW | `npm run lint && npm audit` | Everything, plus the guards below | minutes |
| SHIP | `npx vercel --prod` | Direction checks, no regressions | CI |

## Guard the bar

Watch for these five moves in every diff:

1. The threshold moved — a budget lowered, a check removed from the fast stage
2. A test got easier — `.skip` added, a test file deleted, assertions pulled out
3. A checker got silenced — new `@ts-ignore` or `eslint-disable`
4. Work is unfinished — a stub that throws, an empty `catch`, a `TODO`
5. An exception appeared — a new row in the Exceptions table nobody discussed

Tightening the bar should be silent; loosening it should be loud.

## External opinion

At least one constraint must be external (not judged by this project's own tests):
Lighthouse, axe-core, and `npm audit` all read outside databases. Coverage is the
genuinely circular one — it is measured, not enforced, until an external review
confirms the tests assert real behavior.

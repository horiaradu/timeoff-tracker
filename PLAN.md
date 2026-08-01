# Timeoff Tracker — Implementation Plan

Self-contained handoff document. An agent picking up any phase should be able to work from this file plus the reference documents in `docs/` without additional context.

## 1. What we are building

A personal-leave tracking app for SC SMILECLOUD SRL employees. A logged-in user can:

- Track their timeoffs (list + calendar view) and see remaining vacation days for the year.
- Create a new timeoff entry, which is validated against their remaining allowance.
- Download a generated PDF leave request ("cerere concediu de odihna") for any entry, matching the company template.

### Reference documents (do not modify)

- `docs/model.docx` — the company template. One page, font **Cambria** 12pt, no diacritics.
- `docs/example1.pdf`, `docs/example2.pdf` — filled examples showing the exact target layout, including the signature image placement.

### Locked decisions

| Decision     | Choice                                                                                                                                                                                                                                        |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework    | Next.js (App Router, TypeScript, `src/` dir), Tailwind CSS                                                                                                                                                                                    |
| Hosting      | Vercel Hobby (free tier) — all server code must fit its limits                                                                                                                                                                                |
| Auth         | Auth.js (NextAuth v5) with Google provider, **restricted to verified `@smilecloud.com` emails**                                                                                                                                               |
| Users        | Multi-user: every user has their own profile, signature, allowances, timeoffs                                                                                                                                                                 |
| Database     | Neon Postgres (Vercel Marketplace) + Drizzle ORM (`drizzle-orm/neon-http` driver)                                                                                                                                                             |
| PDF          | Generated on demand with `@react-pdf/renderer` in a route handler. **Not** headless Chrome (too heavy for Vercel free), **not** docx conversion (needs LibreOffice). Nothing is stored — PDFs are regenerated from DB data on every download. |
| Signature    | Drawn in-app on a canvas signature pad (settings page), saved as PNG data URL in the DB                                                                                                                                                       |
| Fonts in PDF | **Caladea** (OFL-licensed, metric-compatible with Cambria). Bundle regular + bold TTFs in the repo. Do not bundle Cambria (Microsoft license).                                                                                                |
| Versioning   | Local git repo, commit at least once per phase. No AI-attribution trailers in commit messages.                                                                                                                                                |

### Out of scope (explicitly)

- No approval workflow — "Aprobat administrator:" stays blank on the PDF; approval happens on paper.
- No half-days; whole days only.
- No email notifications, no admin role, no reporting.
- No PDF storage; always generated on demand.

## 2. Architecture overview

```
src/
  app/
    (protected)/
      page.tsx                 # Dashboard: remaining days + timeoff list
      new/page.tsx             # Create timeoff form
      timeoffs/[id]/edit/page.tsx
      calendar/page.tsx        # Month-grid calendar
      settings/page.tsx        # Profile, signature pad, allowances
    api/auth/[...nextauth]/route.ts
    api/timeoffs/[id]/pdf/route.ts   # GET -> generated PDF
    login/page.tsx             # Public sign-in page
  auth.ts                      # Auth.js config
  middleware.ts                # Redirect unauthenticated -> /login
  db/
    index.ts                   # Drizzle client (neon-http)
    schema.ts
  lib/
    holidays.ts                # Romanian legal holidays (computed)
    workdays.ts                # Working-day math, per-year charge split
    validation.ts              # Timeoff validation (balance, overlap)
  actions/
    timeoffs.ts                # Server actions: create/update/delete
    profile.ts                 # Server actions: profile, signature, allowances
  pdf/
    LeaveRequest.tsx           # react-pdf document component
    fonts/                     # Caladea-Regular.ttf, Caladea-Bold.ttf
```

- All data access happens in server components / server actions / route handlers, always scoped to the session user's id. No client ever passes a `userId`.
- Input validation with `zod` at every server action boundary.
- Dates are stored as Postgres `date` (no time component, no timezone math). Display format everywhere: `dd.MM.yyyy`.

## 3. Database schema

Postgres via Drizzle. Migrations with `drizzle-kit`.

```
users
  id          uuid pk default gen_random_uuid()
  email       text unique not null
  name        text
  created_at  timestamptz default now()

profiles                      -- 1:1 with users, created/edited on settings page
  user_id     uuid pk references users(id) on delete cascade
  full_name   text not null           -- "Ion Popescu"
  ci_series   text not null           -- "XX"
  ci_number   text not null           -- "123456"
  cnp         text not null           -- "1234567890123"
  city        text not null           -- "Timisoara"
  job_title   text not null           -- "programator"
  signature_png text                  -- PNG data URL from the signature pad; nullable until drawn
  updated_at  timestamptz default now()

allowances
  id          uuid pk default gen_random_uuid()
  user_id     uuid references users(id) on delete cascade
  year        int not null
  days        int not null            -- total vacation days for that year
  unique (user_id, year)

timeoffs
  id           uuid pk default gen_random_uuid()
  user_id      uuid references users(id) on delete cascade
  start_date   date not null
  end_date     date not null          -- inclusive; check start_date <= end_date
  working_days int not null           -- computed at write time (deterministic, holidays don't change)
  request_date date not null          -- printed as "Data:" on the PDF; defaults to creation day, user-editable
  created_at   timestamptz default now()
```

## 4. Domain logic (the part that must be exactly right)

### 4.1 Romanian legal holidays — `lib/holidays.ts`

Computed in code for any year, no external API. `legalHolidays(year): { date: Date; name: string }[]`

**Fixed dates (every year):**

| Date           | Name                                              |
| -------------- | ------------------------------------------------- |
| Jan 1, Jan 2   | Anul Nou                                          |
| Jan 6          | Boboteaza _(legal holiday only from 2024 onward)_ |
| Jan 7          | Sf. Ioan Botezatorul _(only from 2024 onward)_    |
| Jan 24         | Unirea Principatelor Romane                       |
| May 1          | Ziua Muncii                                       |
| Jun 1          | Ziua Copilului                                    |
| Aug 15         | Adormirea Maicii Domnului                         |
| Nov 30         | Sf. Andrei                                        |
| Dec 1          | Ziua Nationala                                    |
| Dec 25, Dec 26 | Craciunul                                         |

**Movable (Orthodox Easter–dependent):** Vinerea Mare (Easter − 2 days), Pastele (Easter Sunday), a doua zi de Paste (Easter + 1), Rusaliile (Easter + 49), a doua zi de Rusalii (Easter + 50).

**Orthodox Easter (Meeus Julian algorithm + Julian→Gregorian offset, valid 1900–2099):**

```
a = year % 4;  b = year % 7;  c = year % 19
d = (19c + 15) % 30
e = (2a + 4b - d + 34) % 7
month = (d + e + 114) / 31        // integer division; 3 = March, 4 = April
day   = ((d + e + 114) % 31) + 1
// (month, day) is the JULIAN calendar date; add 13 days for the Gregorian date
```

**Test vectors (Gregorian Orthodox Easter Sunday) — must pass:** 2024-05-05, 2025-04-20, 2026-04-12, 2027-05-02, 2028-04-16.

### 4.2 Working days — `lib/workdays.ts`

- `workingDays(start, end): number` — count of days in the inclusive range that are Mon–Fri **and** not a legal holiday.
- `chargesByYear(start, end): Map<number, number>` — same count, split by calendar year (an entry spanning New Year charges each day to its own year).

### 4.3 Validation — `lib/validation.ts`

Reject a create/update when:

1. `start > end`, or the range's working-day count is 0 (e.g. a weekend-only range).
2. The range overlaps any existing timeoff of the same user (excluding the entry being edited).
3. For any year touched by the range: `chargesByYear[year] > allowance(year) − alreadyUsed(year)`. If no allowance row exists for a touched year, reject with a message telling the user to set it in Settings.

Every rejection returns a human-readable message shown in the form.

## 5. Auth

- Auth.js v5, Google provider, JWT session strategy (no DB adapter).
- In the `signIn` callback accept only: `profile.email_verified === true` **and** `profile.email` ends with `@smilecloud.com`. Pass `hd: "smilecloud.com"` in the provider's authorization params (UX hint only — the callback check is the enforcement).
- On first successful sign-in, upsert the `users` row by email; put `users.id` into the JWT so server code reads the id from the session.
- `middleware.ts` redirects unauthenticated requests to `/login` (excluding `/login`, `/api/auth/*`, static assets).
- Rejected domain → `/login?error=domain` showing "Use your @smilecloud.com account."

**Env vars:** `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `DATABASE_URL`. Never read or commit `.env*` files; reference secrets by name only.

## 6. UI screens

Tailwind, simple and clean; no component library required. All screens behind auth.

### 6.1 Dashboard `/`

- Header card: "**N of M** vacation days remaining in {currentYear}" (link to Settings if no allowance defined).
- Table of all timeoffs, newest first: period, working days, request date, actions: **Download PDF**, Edit, Delete (confirm dialog).
- Download is a plain link to `/api/timeoffs/{id}/pdf`.
- Empty state pointing to "New timeoff".
- If profile or signature is missing, show a banner: PDFs can't be generated until Settings is completed.

### 6.2 New / Edit timeoff `/new`, `/timeoffs/[id]/edit`

- Fields: start date, end date, request date (defaults to today).
- Live summary as dates change: "**X working days** will be used (Y remaining in {year})" — weekends/holidays excluded; list which holidays fall in the range.
- Server-side validation errors rendered in the form.

### 6.3 Calendar `/calendar`

- Custom month grid (no calendar library), Mon-first weeks, prev/next month + "today" navigation.
- Timeoff days highlighted; legal holidays marked with their name; weekends visually muted.

### 6.4 Settings `/settings`

- **Profile**: full name, CI series, CI number, CNP, city, job title.
- **Signature**: canvas signature pad (use the `signature_pad` npm package), shows current saved signature, draw → save as PNG data URL, option to clear/redraw.
- **Allowances**: rows of year → days, editable, add-next-year button. Deleting an allowance is not needed (YAGNI).

## 7. PDF generation

`GET /api/timeoffs/[id]/pdf` (Node runtime, not edge): load timeoff + profile of the session user (404 if not theirs), render with `@react-pdf/renderer`'s `renderToBuffer`, respond `application/pdf` with `Content-Disposition: attachment; filename="cerere-concediu-{start_date ISO}.pdf"`. Return a clear 409 if profile or signature is missing.

### Document spec (`src/pdf/LeaveRequest.tsx`)

Match `docs/example1.pdf` visually. A4, Caladea 12pt, black on white, generous margins (docx uses ~2.5cm side margins; title sits roughly a third down the page). No diacritics anywhere (matches template). All dates `dd.MM.yyyy`.

Blocks top to bottom:

1. Title, centered: `CATRE SC SMILECLOUD SRL,`
2. Body paragraph, justified, first-line indent:
   `Subsemnatul, {fullName}, avand CI cu seria {ciSeries}, numarul {ciNumber}, CNP {cnp}, domiciliat in localitatea {city}, angajat al SC SMILECLOUD SRL in functia de {jobTitle} solicit concediu de odihna in data/perioada de {period}`
   where `{period}` is `“dd.MM.yyyy - dd.MM.yyyy”`, or a single `dd.MM.yyyy` when start = end. Use clean values — the stray dots in the template (`XX..`, `123456.,`) are fill-in artifacts, not punctuation to reproduce.
3. `Va multumesc,` aligned toward the right.
4. Two-column block: left `{city}`, right `{fullName}` with the signature PNG rendered below the name (see examples: signature overlaps the space under the name, roughly 90×45pt).
5. Left, below: `Data: {requestDate}`
6. Lower left, after vertical space: `Aprobat administrator:`

The example PDFs contain a date inconsistency (`17.04.2026 - 21.04.2025`) — that is a typo in the manually filled examples. The app always prints consistent dates.

## 8. Work phases

Each phase is one handoff unit with acceptance criteria. Commit at the end of each phase (plain descriptive message, e.g. `Add Romanian holiday and working-day logic`).

### Phase 0 — Scaffold _(no dependencies)_

- `git init` (approved by Horia). `.gitignore` must cover `.env*`, `node_modules`, `.next`.
- `create-next-app`: TypeScript, App Router, Tailwind, ESLint, `src/` dir, no import alias surprises (`@/*` default is fine).
- Add prettier + config, `format` script. Add `vitest` and a `test` script.
- **Accept:** `npm run build` and `npm run lint` pass; initial commit exists.

### Phase 1 — Database _(needs 0)_

- Drizzle + `drizzle-kit` + `@neondatabase/serverless`; schema from §3; migration generated and applied; `db:generate` / `db:migrate` scripts.
- `src/db/index.ts` exports a drizzle client from `DATABASE_URL`.
- **Accept:** migration applies cleanly against a Neon database; `drizzle-kit generate` produces no diff afterwards.

### Phase 2 — Auth _(needs 1)_

- Everything in §5, plus a minimal `/login` page with a "Sign in with Google" button and the domain-error message.
- **Accept:** unauthenticated visit to `/` redirects to `/login`; (manual) non-smilecloud Google account is rejected; first sign-in creates a `users` row.

### Phase 3 — Domain logic _(needs 0 only — parallelizable with 1–2)_

- §4 modules with vitest coverage: Easter test vectors, fixed holidays incl. Jan 6/7 only ≥2024, weekend/holiday exclusion, year-boundary split, overlap and balance validation rules (validation DB access injected/mocked or structured so pure parts are testable).
- **Accept:** `npm test` passes; every rule in §4 has at least one test.

### Phase 4 — Timeoff + profile server actions _(needs 1, 2, 3)_

- `actions/timeoffs.ts`: create/update/delete with zod parsing, session check, §4.3 validation, `working_days` computed server-side.
- `actions/profile.ts`: upsert profile, save signature (validate it is a PNG data URL, cap size ~200KB), upsert allowance (year sanity-checked, days 0–100).
- **Accept:** build passes; actions revalidate the affected pages.

### Phase 5 — UI _(needs 4)_

- §6 screens. Server components for reads, the live working-days summary in the form may compute client-side using `lib/holidays`/`lib/workdays` (pure functions, safe on the client).
- **Accept:** full flow works locally: set up profile + signature + allowance → create timeoff → see it on dashboard and calendar → edit → delete. Validation errors visible in the form.

### Phase 6 — PDF _(needs 4; parallelizable with 5)_

- §7. Download Caladea regular+bold TTFs into `src/pdf/fonts/` (SIL OFL — keep the license file alongside).
- **Accept:** downloaded PDF opens in a viewer and visually matches `docs/example1.pdf` (layout, font feel, signature placement); filename correct; other users' ids return 404.

### Phase 7 — Finish & deploy prep _(needs all)_

- Run prettier on everything, fix lint, `npm run build`, `npm test` — all green.
- `README.md`: local setup (env vars, migrate, dev), deployment steps (§9), where the reference docs live.
- **Accept:** fresh-clone instructions in README actually work.

## 9. Manual steps (Horia — cannot be done by agents)

1. **Google OAuth client** (GCP console → Credentials → OAuth client ID, type Web):
   - Authorized origins: `http://localhost:3000` and the Vercel production URL.
   - Redirect URIs: `http://localhost:3000/api/auth/callback/google` and `https://<prod-domain>/api/auth/callback/google`.
   - Provides `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.
2. **Neon**: install from the Vercel Marketplace on the project (injects `DATABASE_URL`), and put the same URL in local `.env.local`.
3. **Vercel project**: import the repo, set `AUTH_SECRET` (`openssl rand -base64 32`), `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`.
4. Run the DB migration against Neon (`npm run db:migrate`) once `DATABASE_URL` exists.

## 10. Conventions for agents working on this repo

- Smallest reasonable change; simple over clever; YAGNI.
- Names describe purpose, never implementation or history (no `New*`, `Legacy*`, `*Wrapper`).
- No comments about what changed or used to be; comments only for what/why of current code.
- Never read or commit `.env*` files; secrets by env-var name only.
- Before declaring a phase done: prettier, lint, build, and tests must actually be run and pass — not assumed.
- Commit frequently; concise descriptive messages; **no** `Co-Authored-By`/AI trailers.

# Time off

Tracks vacation days for SC SMILECLOUD SRL staff and generates the printable leave
request ("cerere concediu de odihna") for each booking.

- Book, edit and delete time off, with a list and a month calendar.
- Weekends and Romanian legal holidays never use up allowance.
- A booking is refused when it exceeds the days left for the year, or overlaps another one.
- Download a filled, signed PDF request for any booking, or email it from your own Gmail.
- Each booking keeps an out-of-office event on your calendar and an entry on the team calendar.
- Google sign-in, restricted to verified `@smilecloud.com` accounts.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS · Auth.js v5 · Neon Postgres with
Drizzle · `@react-pdf/renderer` · deployed on Vercel.

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill it in, see below
npm run db:migrate           # needs DATABASE_URL
npm run dev
```

`.env.local` needs four values:

| Variable             | Where it comes from                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------- |
| `DATABASE_URL`       | Neon connection string. With the Vercel project linked: `npx vercel env pull .env.local` |
| `AUTH_SECRET`        | `openssl rand -base64 32`                                                                |
| `AUTH_GOOGLE_ID`     | Google Cloud console, OAuth client (see below)                                           |
| `AUTH_GOOGLE_SECRET` | same OAuth client                                                                        |

| `FIELD_ENCRYPTION_KEY` | `openssl rand -base64 32`. **Required** — saving a profile or an allowance fails without it. Lose it and the encrypted data is unrecoverable. |

Error reporting is optional and off until a DSN is given:

| Variable                 | Where it comes from                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry project → Client Keys. Empty switches reporting off entirely.                 |
| `SENTRY_ORG`             | Sentry organisation slug. Only needed to upload source maps at build.                |
| `SENTRY_PROJECT`         | Sentry project slug, same.                                                           |
| `SENTRY_AUTH_TOKEN`      | Sentry → Settings → Developer Settings → Organization Tokens. Set it on Vercel only. |

The Sentry integration at `vercel.com/integrations/sentry` sets all four of these on the
Vercel project by itself, which is the least work and keeps the token out of your hands.

### Google OAuth client

Google Cloud console → APIs & Services → Credentials → Create OAuth client ID → Web
application:

- Authorised JavaScript origin: `http://localhost:3000` (plus the production URL)
- Authorised redirect URI: `http://localhost:3000/api/auth/callback/google` (plus
  `https://<prod-domain>/api/auth/callback/google`)

Sign-in additionally requires the Google account's email to be verified and to end in
`@smilecloud.com`; anything else is rejected with a message on the login page.

Emailing a request and syncing the calendar both act as the signed-in user, which needs
more than sign-in alone:

- **Enable** the **Gmail API** and the **Google Calendar API** in the same Cloud project
  (APIs &amp; Services → Library). Without this, sign-in works and the feature fails with a 403.
- **Declare the scopes** on the OAuth consent screen (Data access):
  `https://www.googleapis.com/auth/gmail.send` and
  `https://www.googleapis.com/auth/calendar.events`. The app is Internal, so no Google review
  is needed, but an undeclared scope can be refused outright.
- **Sign out and in again** after any scope change. Google only returns the refresh token the
  app stores on a fresh consent, and without it these features report that and do nothing.

The team calendar is identified in `src/lib/calendar.ts`.

### Encrypted fields

Identity details and day counts are encrypted with AES-256-GCM before they reach the
database, so a dump, a backup or the Neon browser shows only ciphertext. Encrypted:
`profiles.full_name`, `ci_series`, `ci_number`, `cnp`, `city`, `job_title`, `signature_png`,
`last_recipient`, `allowances.days`, and `users.google_refresh_token`.

The app holds the key, so it can still read everything at request time — this protects
against the database leaking, not against whoever controls the deployment.

Because `days` is encrypted it is stored as text and its range is checked in the app
instead of by a database constraint. Nothing sorts or filters on an encrypted column;
balances are all computed in JavaScript.

`decrypt` returns anything not in its `v1:` format untouched, which is what lets rows
written before encryption keep working. To encrypt what is already stored:

```bash
npx tsx scripts/encrypt-existing.ts           # dry run, lists what would change
npx tsx scripts/encrypt-existing.ts --apply
```

It is safe to run repeatedly: a value already encrypted is skipped.

### Monitoring

Vercel Analytics needs turning on in the project's **Analytics** tab; it only records on
deployed pages, never on localhost. Sentry reports server and browser errors once
`NEXT_PUBLIC_SENTRY_DSN` is set, and stays completely inert without it. Neither collects
personal data: `sendDefaultPii` is off and session replay is deliberately not enabled, so
signatures and ID details never leave the app. Browser reports go through `/monitoring`,
a tunnel that keeps ad blockers from silently dropping them.

> If port 3000 is taken, run `npx next dev -p 3100` and register that port's origin and
> callback URL in the OAuth client as well — the callback URL must match exactly.

## Deploying

1. Push the repository and import it into Vercel.
2. Add the Neon integration from the Vercel Marketplace; it injects `DATABASE_URL`.
3. Set `AUTH_SECRET`, `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` in the project's
   environment variables.
4. Add the production callback URL to the Google OAuth client.
5. Run `npm run db:migrate` once against the production database.

## Commands

| Command               | What it does                                       |
| --------------------- | -------------------------------------------------- |
| `npm run dev`         | Development server                                 |
| `npm run build`       | Production build (also type-checks)                |
| `npm test`            | Unit tests for the date, holiday and balance rules |
| `npm run lint`        | ESLint                                             |
| `npm run format`      | Prettier over the repo                             |
| `npm run db:generate` | Write a migration after editing `src/db/schema.ts` |
| `npm run db:migrate`  | Apply pending migrations                           |
| `npm run db:studio`   | Browse the database                                |

## Layout

```
src/
  app/(protected)/   dashboard, new/edit booking, calendar, settings
  app/api/           auth endpoints and the PDF route
  actions/           server actions (bookings, profile, sign-out)
  db/                Drizzle schema, client and queries
  lib/               dates, Romanian holidays, working days, balance rules
  pdf/               the leave request document and its bundled font
  proxy.ts           sends signed-out visitors to /login
```

Business rules live in `src/lib` as pure functions and are the part covered by tests.
Every page, action and route handler re-checks the session itself; the proxy redirect is
only a first pass.

## Reference documents

`docs/` holds the company Word template and two filled examples that the generated PDF
reproduces. It is deliberately **not** committed — those files contain personal data (ID
series and number, CNP). Keep a local copy if you need to compare the output.

## Notes

- The PDF uses Caladea, an open font metrically compatible with the template's Cambria,
  which cannot be redistributed.
- Legal holidays are computed in code, including Orthodox Easter, so any year works
  without an external service. Boboteaza and Sfantul Ioan count only from 2024, when they
  became legal holidays.
- Nothing about the approval step is modelled: "Aprobat administrator" is left blank to be
  signed on paper.

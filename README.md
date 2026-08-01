# Time off

Tracks vacation days for SC SMILECLOUD SRL staff and generates the printable leave
request ("cerere concediu de odihna") for each booking.

- Book, edit and delete time off, with a list and a month calendar.
- Weekends and Romanian legal holidays never use up allowance.
- A booking is refused when it exceeds the days left for the year, or overlaps another one.
- Download a filled, signed PDF request for any booking.
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

### Google OAuth client

Google Cloud console → APIs & Services → Credentials → Create OAuth client ID → Web
application:

- Authorised JavaScript origin: `http://localhost:3000` (plus the production URL)
- Authorised redirect URI: `http://localhost:3000/api/auth/callback/google` (plus
  `https://<prod-domain>/api/auth/callback/google`)

Sign-in additionally requires the Google account's email to be verified and to end in
`@smilecloud.com`; anything else is rejected with a message on the login page.

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

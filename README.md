# CalSite Safety

Safer Sites. Smarter Compliance.

CalSite Safety is a multi-tenant workspace for California contractors to keep jobsite safety records and a source-linked requirement register. It is operational software, not a legal opinion, a Cal/OSHA filing service, or a compliance score.

Guidance in the product is labeled as guidance. A license number stored in the app is not treated as a valid license. Requirements stay `potentially applicable` or `pending qualified review` until someone at the company records a reason.

## Stack

| Piece | Choice |
| --- | --- |
| App | Next.js App Router, React, TypeScript |
| UI | Tailwind CSS, mobile-first, English and Spanish |
| Database | PostgreSQL with Prisma migrations |
| Auth | Auth.js (NextAuth v5) email and password. Passwords are bcrypt hashes. Sessions are JWTs (12 hours). Authorization reads the membership row on each request |
| Validation | Zod on every mutation |
| Tests | Vitest against a real Postgres database |

Auth.js is self-hosted. There is no Clerk account and no OAuth provider in this release. Server Actions rely on Next.js same-origin checks. Cookies are `SameSite=Lax`. Document downloads are authenticated and scoped to the company.

## What works

- Sign up, sign in, sign out, company workspace, roles: admin, safety manager, worker
- Projects and jobsites, including city, county, and an explicit jurisdiction confirmation
- Employees, project crew, and redacted contact details for workers
- Tailgate meetings with attendance checkboxes and a printable record
- Training records. Blank expiration means no expiration was entered
- Inspections, field prompts, findings, and corrective actions
- Incident reports. Workers see only their own. Investigation notes are limited to admins and safety managers
- Project file library (PDF, JPEG, PNG, WEBP, plain text). The default store is Postgres, 8 MB per file, isolated by company. `DOCUMENT_STORAGE=object` fails closed until bucket variables exist, and this build does not upload to a bucket yet.
- IIPP element workspace mapped to the headings in the DIR convenience copy of 8 CCR §3203
- Regulatory source registry and requirement catalog for the sections reviewed on November 2, 2026
- Company or project applicability determinations, evidence links, and a manual review flag that does not download a page
- Audit log for admins
- Demonstration company seed

## What this release does not do

- Live CSLB, DIR, weather, or geocoding lookups
- Agency filings, certified payroll, prevailing-wage calculations, or e-signatures that claim to be sworn
- A numeric compliance score
- City, county, fire-district, or school-district ordinances
- Most of Title 8. Partial summaries now include §1730, §1541.1, §5141.1, and §1532.1. Asbestos, §1731, §1724, and §5144 are still unread
- Automated regulatory crawling. Change detection compares catalog text only when called in code and is not scheduled
- Billing, live object-storage uploads, and invitation email. `getMailer()` records that nothing was sent
- A distributed login rate limiter. Failed sign-ins are counted in Postgres for 15 minutes
- Playwright in CI. Critical paths are covered in Vitest against Postgres
- Wage rates, certified-payroll submission, and apprentice ratios. The public-works screen stores pointers and drafts only

## Phase 3 additions

- Public-works records with a dated registration note, an optional company file, a determination id, and an apprenticeship note. Certified payroll rows are drafts with `submittedToAgency` forced false. No dollar rates.
- Partial Title 8 entries for §1731, §1510, §1529, and excavation appendices A–C. Appendix tables were not copied.
- The DIR registration webpage's fee sentence is stored as an excerpt. It is not treated as a statute, and typing a number still does not verify registration.
- Company heat and wildfire-smoke plans tied to the existing catalog codes. The smoke plan asks how the company will check the AQI. The app does not.
- Page CSP is set in middleware with a per-request script nonce and `strict-dynamic`. Styles still allow inline CSS.

`npm audit` has no critical findings after moving to Auth.js 5.0.0-beta.32 and Vitest 5.1.0. Five high findings remain, and each published fix is a major upgrade (Prisma 7, Next.js 16, or Zod 4) that this release does not take. Those packages stay on the versions the app is tested against.

## Phase 2 additions

- Company qualified-review notes for the partially read Title 8 entries. The note does not edit the catalog and is not a certification.
- Manual CSLB and DIR checks can attach a company file. The timestamp is the server clock. No status means CalSite verified the number.
- Permit records and city-source notes start empty. A city name does not load an ordinance.
- Password changes and "End sessions" increment a session version so older JWTs stop at the next request.
- A content-security policy sets `frame-ancestors 'none'` and `object-src 'none'`. Scripts still allow `'unsafe-inline'` because this release has no nonce.

The in-app Guidance page and the regulatory catalog list these gaps in the product, not only here.

## Local setup

Requirements: Node.js 22, PostgreSQL 16.

```bash
cp .env.example .env
# Edit AUTH_SECRET. Keep DEMO_PASSWORD only for the local demo.
docker compose up -d   # or use a Postgres you already run
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Create the test database once if it does not exist:

```bash
createdb calsite_test
# or: psql -c "CREATE DATABASE calsite_test OWNER calsite;"
```

`docker compose` creates the `calsite` database and user. Create `calsite_test` the same way before `npm test`. The app database and the test database are separate so tests do not wipe the demo company.

### Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | App Postgres connection |
| `TEST_DATABASE_URL` | Postgres used by Vitest. Defaults to `calsite_test` on localhost |
| `AUTH_SECRET` | Auth.js session secret. Required. Use a long random value |
| `DEMO_PASSWORD` | Password for the three seeded demo users. Required only to seed |
| `DEMO_LOGIN_HINT` | Set to `true` to show the demo hint on the sign-in page |
| `ALLOW_DEMO_SEED` | Must be `true` to run the seed when `NODE_ENV=production`. Do not do that with real records |

Demo emails after seeding:

- `demo.admin@calsite.example`
- `demo.safety@calsite.example`
- `demo.worker@calsite.example`

The password is whatever you set as `DEMO_PASSWORD`. The example value is `change-me-demo-only-10`. The seeded company is marked as demonstration data.

### Scripts

```bash
npm run dev          # next dev
npm test             # vitest, migrates TEST_DATABASE_URL first
npm run typecheck
npm run lint
npm run build
npm run db:deploy    # prisma migrate deploy
npm run db:seed
```

## Deploy

The app is a Next.js server app. Netlify detects Next.js from this repo (`netlify.toml` sets Node 22 and `npm run build`). Any Node host works the same way.

1. Provision Postgres (Neon, RDS, [Netlify Database](https://docs.netlify.com/build/data-and-storage/netlify-database/), or another provider).
2. Set `DATABASE_URL` and `AUTH_SECRET` in the host. Leave `DEMO_LOGIN_HINT` unset.
3. Build with `npm run build`.
4. From a trusted machine, run `npx prisma migrate deploy` against that database before sending real traffic.
5. Do not run `npm run db:seed` on a production database.

Files live in Postgres, so more than one server instance can read them. There is no local upload disk. Larger plan sets should move to object storage later. Netlify Blobs is a fit for files, not for these relational records.

## Regulatory updates

Catalog rows are seed data in `prisma/catalog.ts`, reviewed against DIR HTML convenience copies on November 2, 2026. DIR says those copies are not warranted current. To update a requirement: edit the catalog, keep the official URL, set `reviewStatus`, say what was not read, and do not add a penalty, fee, or deadline that was not in the source. Re-run the seed. Flagging a source in the app creates a review row and does not fetch the page.

Qualified safety, legal, labor, or engineering review is still required before anyone relies on a requirement, an IIPP, a fall-protection plan, or a public-works determination.

## Security notes

- Passwords are hashed with bcrypt. The hash is never returned to the client.
- Every tenant query filters on `organizationId`. A missing row and another company's row both return not found.
- Workers cannot create projects, inspections, or roster attendance. They can report an incident and acknowledge their own meeting when their employee email matches.
- Closing a corrective action or an incident requires an evidence or investigation note.
- Audit events are append-only in the application. There is no edit API. The database owner can still change rows, so this is not a tamper-proof ledger.
- Dependency audit reports known issues in the Next.js and ESLint tree. They are recorded in the pull request and were not force-upgraded.

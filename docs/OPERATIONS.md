# Operations

This is the runbook for a host the Owner controls. The repository does not contain production credentials, and this file does not mean a live site is already deployed.

## Health check

`GET /api/health` is public. It runs `SELECT 1` and returns:

```json
{ "ok": true, "db": "up", "version": null }
```

`version` is `GIT_SHA`, `COMMIT_REF`, or `APP_VERSION` when that value is a short token. The body does not include the database URL or `AUTH_SECRET`. A database error returns HTTP 503 with `"db": "down"` and no driver message. The response sets `Cache-Control: no-store`.

## Migrate order

1. Set `DATABASE_URL` and `AUTH_SECRET` on the host.
2. Build with `npm run build`.
3. From a trusted machine, run `npx prisma migrate deploy` against that database before sending traffic.
4. Do not run `npm run db:seed` on a database that holds real companies. The seed writes the demonstration company, demo users, and sample records. `NODE_ENV=production` refuses the seed unless `ALLOW_DEMO_SEED=true`. Leave that unset.

## Backup and restore

Use the Postgres provider's snapshots if you have them. Also take a logical dump:

```bash
pg_dump --format=custom --no-owner --file=calsite.dump "$DATABASE_URL"
```

Files uploaded in this build are rows in `safety_documents.content_bytes`. A database dump is the file backup. Object storage is not in use. Restoring only a bucket would not restore these files, and restoring only the dump does restore them.

Restore into an empty database, then run migrations if the dump is older than the app:

```bash
createdb calsite_restore
pg_restore --no-owner --dbname=calsite_restore calsite.dump
DATABASE_URL="postgresql://.../calsite_restore" npx prisma migrate deploy
```

Check `GET /api/health` on the app pointed at the restored database before you switch traffic. Keep the previous snapshot until a person signs in and opens one known project.

## Rotate AUTH_SECRET

1. Set a new long random `AUTH_SECRET` and restart the app.
2. Existing JWTs stop verifying, so people sign in again.
3. To end sessions without waiting for that restart, an admin can use "End sessions" or change the password. Both increment `sessionVersion`. The next request with the old token is sent to `/sign-in?revoked=1`.

Changing `AUTH_SECRET` does not rewrite password hashes.

## Logs

Unexpected server errors and failed sign-ins write one JSON line to stderr. The line has an event name. Emails are reduced to a first character and a domain. Passwords, tokens, and secrets are dropped. Failed sign-ins are still counted in `login_attempts` for 15 minutes.

This build does not send those lines to Sentry. `SENTRY_DSN` is not read. Point the host's log drain or error tracker at stderr.

## What was checked for accessibility

The app shell has a skip link, a header, navigation, and a main region. Sign-in, sign-up, and the home page use the same skip link and a main region. Text fields on those forms have labels. Keyboard focus uses a visible outline. This is not a WCAG certification, and it was not a full audit of every screen.

## Pilot checklist

Use a company you created with sign-up, not the demonstration seed, unless you are on a local machine.

- [ ] Sign up a new company and sign in
- [ ] Create a project with city and county
- [ ] Record a tailgate meeting and open its print view
- [ ] Record an inspection
- [ ] Record an incident
- [ ] Add a permit record without marking it issued unless you also enter a note or file
- [ ] Create an evidence packet and open its print view. Confirm the footer says it is not a Cal/OSHA filing
- [ ] Attach a contract file, type a clause quote, and accept it with a reason. Confirm a task appears and the quote stayed the sentence you typed
- [ ] Open `GET /api/health` and confirm `ok` is true
- [ ] Enroll one worker for Crew Sign on a phone, then revoke it if this was only a trial
- [ ] Open a project kiosk, run one tailgate where each person signs, and download the PDF

## Crew Sign

### Enrollment

1. Sign in as an admin. Open the worker. Choose **Enroll for Crew Sign**.
2. Hand the phone to that worker. They read the consent, tick **I agree**, draw a signature, type their own name, and choose a 4 to 6 digit PIN. They enter the PIN twice.
3. You stay on the page as the witness. The record stores your name and the time. The worker's PIN is hashed. The consent PDF is stored with the signature event.
4. Tell the worker that a paper signature sheet is always available.
5. To stop a PIN from working, an admin uses **Revoke Crew Sign** on that enrollment. Revoking does not delete the consent event.

Do not enroll a real person in the demonstration company.

### Kiosk link

1. Open the project. Choose **Open kiosk** or **Rotate kiosk link**.
2. Copy the URL from that screen and print the QR poster before you leave the page. The token is not stored. Only its SHA-256 is stored.
3. Rotating or disabling the link makes the previous URL return not found.
4. Each person on the crew taps their own name. Nobody types another person's name or PIN.

### Chain verify

`GET /api/sign/verify/:recordId` is available to an admin or a safety manager. It recomputes every event hash in the company and checks that the hashes form one chain. The same check is on **Verify signature chain** in the app. A changed field fails the check. The database trigger `signature_events_no_update_delete` rejects updates and deletes, so a correction is a new void row.

### Signed files and export

Finished records are stored in `signed_record_pdfs`. The bytes and `sha256` are written when the PDF is built. `exported_at` stays null. A filing agent is the only writer of that column. Read the list from `v_signed_export` (`id`, `project_name`, `project_code`, `record_type`, `record_date`, `file_name`, `sha256`, `completed_at`).

A paper original uploaded from the kiosk is a `safety_documents` row with category `PAPER_SCAN_INBOX` and a `paper_originals` row. The project shows **Signed original on paper - scan** plus the file name when one is attached to a meeting.

### Netlify site protection

This site uses Netlify Team SSO on all deploys. The kiosk URL has to be reachable by a phone that is not signed into the team. Set the site protection to non-production deploys only, so production is public and preview deploys stay behind the team login. Do not change that setting from this repository. This change is made in the Netlify UI by a person who administers the site. Leave production environment variables as they are. Apply `prisma/migrations/20261124230000_crew_sign` only after the migration has been reviewed. Do not run it against production as part of opening the pull request.

`SIGNING_P12_BASE64` and `SIGNING_P12_PASSWORD` are reserved for a later PAdES step. This release stores the PDF and its SHA-256 and does not sign the PDF with a certificate.

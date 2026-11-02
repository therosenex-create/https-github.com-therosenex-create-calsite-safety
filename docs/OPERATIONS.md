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

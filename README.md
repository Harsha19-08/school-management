# School Platform — D.A.S Public School & St Mary's High School

One Next.js 16 + MongoDB app serving **two schools** with strict server-side separation. Roles: super admin, school admin, teacher, student, parent.
Design follows the master prompt (DM Serif Display + Manrope + JetBrains Mono; per-school colour themes switched by `data-school`).

## Quick start

```bash
cp .env.example .env.local      # then set AUTH_SECRET (openssl rand -base64 48) and MONGODB_URI
docker compose up -d            # local MongoDB 7 as a single-node replica set
npm install
npm run seed                    # synthetic demo data, local DB only
npm run dev                     # http://localhost:3000
```

`.env.local` already exists in a fresh checkout of this build with a random `AUTH_SECRET`; replace it for any real deployment.

The seed clears and recreates all collections. It refuses non-local MongoDB URLs by default. To intentionally seed an Atlas database, set `SEED_ALLOW_REMOTE=true` in `.env.local` before running `npm run seed`. For `mongodb+srv://` URLs, the app uses `MONGODB_DNS_SERVERS` (default: `8.8.8.8,1.1.1.1`) to avoid local DNS resolvers that reject Atlas SRV lookups.

### Demo accounts (after `npm run seed`, password `Demo@12345` unless `SEED_PASSWORD` is set)

| Role | D.A.S | St Mary's |
|---|---|---|
| Super admin | super@demo.test (both schools, switcher in top bar) | |
| School admin | admin@das.demo.test | admin@stm.demo.test |
| Teacher | teacher1@das.demo.test | teacher1@stm.demo.test |
| Student | student1@das.demo.test | student1@stm.demo.test |
| Parent | parent1@das.demo.test | parent1@stm.demo.test |

The seed refuses to run when `NODE_ENV=production` and requires `SEED_ALLOW_REMOTE=true` for non-local URIs. All names are generated.

## Commands

| | |
|---|---|
| `npm run dev` / `build` / `start` | run the app |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | unit tests (no database needed) |
| `MONGODB_URI_TEST=mongodb://127.0.0.1:27017/school_test npm run test:integration` | DB-backed ledger tests (wipes that DB) |

## What is built

- **Auth**: email/username + password, httpOnly SameSite=Lax JWT cookie, token-version session invalidation, login lockout + rate limits, password reset / account activation links, change password, super-admin school switch.
- **Isolation**: every query is scoped by a `schoolId` derived on the server from a verified membership — never from the request. Cross-school ids return 404. Teachers are limited to their assigned sections/subjects; students to themselves; parents to linked children.
- **Admin**: dashboard (real aggregates), platform overview (super admin), students (CRUD, transfer, status, portal logins, CSV), admissions (state machine, duplicate detection, atomic enrolment), academics (years, classes, sections, subjects, teachers + assignments, timetable with clash check), attendance (mark/edit window/reports), exams (create, open marks, publish, audited corrections, report cards + PDF), fees (categories, structures, idempotent generation, cash/bank/cheque collection, concessions, reversals, PDF receipts, outstanding & collection CSVs), events, notices, documents (private storage, magic-byte validation, soft delete), reports, settings (school, roles with a staff-only ceiling, users, audit log).
- **Teacher portal**: dashboard, classes, attendance, marks entry, assignments + grading, timetable, notices, profile/password.
- **Student & parent portals** (mobile-first, bottom navigation): home, attendance calendar, timetable, assignments (text submissions with deadline/resubmission rules), published results only, fees + receipts, notices/events/documents, child switcher for parents.
- **Money**: integer paise only; append-only ledger; atomic overpayment gate; per-school gap-free receipt counter; idempotency keys; reversals instead of edits.

## Honest limitations

- **Not run against a live MongoDB in the build environment** (no Docker/Mongo available there). Everything was type-checked, linted, production-built (`next build`) and the 37 unit tests pass, but the **DB integration tests were skipped** and the seed script has never executed. Run `npm run seed` and the integration tests on your machine and report any failures.
- **No end-to-end browser tests** were run; screens were not visually reviewed in a browser.
- **Online payments are not implemented.** Fees are collected by staff (cash/bank/cheque). The schema and HMAC verification helper exist for a future Razorpay integration, but there is no checkout or webhook route, and no client can mark a payment successful.
- **Email and SMS are not configured.** In-app notifications are real; email/SMS delivery is recorded as `not_configured` and the UI says so. Reset/activation links are shown to admins (and, in development only, on the forgot-password page) because nothing can email them.
- Rate limiting is in-memory (single instance). Use Redis for multi-instance deployments.
- File storage is local disk (`STORAGE_DIR`, default `.storage`, outside `public`). Use object storage in production.
- Assignment submissions are text only (no file attachments yet). Late fees are shown as accrued information, not auto-charged.
- `MONGODB_TRANSACTIONS=true` enables transactions where code uses them (replica set required); the admission enrolment path uses a compare-and-set claim plus cleanup instead and does not depend on them.

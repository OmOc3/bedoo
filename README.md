# Mawqi3 — إدارة محطات الطعوم

Mawqi3 is an Arabic RTL bait station management system for pest control companies. It helps field technicians submit station inspection reports by QR code, while supervisors and managers review operations from role-protected dashboards.

Brand identity rules live in `BRAND.md`.

## Tech Stack

- Next.js 15 App Router
- React 19
- TypeScript strict mode
- Firebase Auth, Firestore, Storage
- Firebase Admin SDK for all server mutations
- Gemini API for manager operational insights
- Zod 4.1
- React Hook Form
- Tailwind CSS 3.4
- qrcode
- Expo SDK 55 mobile companion app in `mobile/`

## Roles

- `technician` فني: opens `/scan`, scans station QR links, submits reports for active stations.
- `supervisor` مشرف: opens `/dashboard/supervisor`, reads station/report activity, reviews reports, exports CSV.
- `manager` مدير: opens `/dashboard/manager`, manages stations, reviews reports, manages users, exports CSV.

## Routes

- `/login`: team login.
- `/unauthorized`: access denied.
- `/scan`: QR scan instructions and manual station entry.
- `/station/[stationId]/report`: technician report form.
- `/dashboard/supervisor`: supervisor summary dashboard.
- `/dashboard/supervisor/tasks`: operational tasks for pending reviews and stations needing follow-up.
- `/dashboard/supervisor/reports`: supervisor report list and filters.
- `/dashboard/manager`: manager summary dashboard.
- `/dashboard/manager/tasks`: operational tasks for pending reviews, stale stations, and inactive stations.
- `/dashboard/manager/stations`: station list.
- `/dashboard/manager/stations/new`: create station.
- `/dashboard/manager/stations/[stationId]`: station details and QR code.
- `/dashboard/manager/stations/[stationId]/edit`: edit station.
- `/dashboard/manager/reports`: manager report list and review actions.
- `/dashboard/manager/analytics`: zone, technician, status analytics, and optional Gemini operational summary.
- `/dashboard/manager/audit`: read-only audit log viewer with filters.
- `/dashboard/manager/users`: user role, active status, and mobile access code management.
- `/offline`: offline fallback for installed PWA usage.
- `/manifest.webmanifest`: PWA manifest.
- `/api/auth/login`: login endpoint.
- `/api/auth/session`: session cookie endpoint.
- `/api/mobile/me`: authenticated mobile profile endpoint.
- `/api/mobile/reports`: latest 50 technician reports, ordered by Firestore query.
- `/api/mobile/web-session`: one-time handoff from the Expo app to the web dashboard for managers and supervisors.
- `/api/reports/export`: CSV export for managers and supervisors.
- `/api/reports/[id]/photos`: signed report photo URLs for an authorized report only.

## Environment Variables

Copy `.env.example` to `.env.local` and fill the values. Do not commit real secrets.

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_BASE_URL` (required in production, must be HTTPS)
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`
- `AUTH_SESSION_SECRET` (minimum 32 characters)
- `SESSION_MAX_AGE_SECONDS` (positive integer)
- `GEMINI_API_KEY`
- `EXPO_PUBLIC_MAWQI3_WEB_BASE_URL`

Server-only environment variables are validated centrally in `lib/env/server.ts`. Production startup fails early when required values are missing or invalid. QR report links use `NEXT_PUBLIC_BASE_URL` in production and only infer request headers during development.

## Run Locally

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
npm run mobile:start
npm run mobile:web
```

`npm run build` requires valid Firebase and auth environment variables. Missing environment variables should be fixed in local deployment configuration, not with fake values in code.

To create demo users in a local/demo Firebase project:

```bash
ALLOW_DEMO_SEED=true npm run seed:users
```

The seed script refuses to run with `NODE_ENV=production`, refuses production-like project IDs unless explicitly overridden, and prints random one-time demo passwords instead of using fixed passwords.

## Firebase Setup

1. Create a Firebase project.
2. Enable Firebase Auth with email/password.
3. Create Firestore.
4. Create user documents in `users/{uid}` with `uid`, `email`, `displayName`, `role`, `createdAt`, and `isActive`.
5. Deploy Firestore rules:

```bash
firebase deploy --only firestore:rules
```

6. Deploy Firestore indexes:

```bash
firebase deploy --only firestore:indexes
```

7. Deploy Storage rules:

```bash
firebase deploy --only storage
```

## MVP Features

- Secure login with session cookies and signed role cookies.
- Role-based middleware protection.
- Manager station CRUD with generated QR links.
- Technician report submission from station QR links.
- Supervisor dashboard and filtered report list.
- Manager dashboard, report review, and user management with generated mobile access codes.
- CSV export for reports.
- CSV export is bounded to the last 90 days by default and a maximum of 5,000 rows. Narrow filters/date range when the API returns `EXPORT_TOO_LARGE`.
- Optional before/after report photo upload through Admin SDK and locked Storage rules.
- Report list pages show photo counts only; signed Storage URLs are generated lazily through `/api/reports/[id]/photos`.
- Optional station GPS coordinates.
- Station health indicators based on active state, visit recency, and report count.
- Today tasks pages for managers and supervisors.
- Manager analytics by zone, technician, and status frequency over a bounded default 90-day range.
- Gemini-powered manager insights with bounded summarized inputs and local fallback when `GEMINI_API_KEY` is not configured.
- Light/dark mode identity across the web app.
- Expo mobile companion app with native QR scanning and local drafts for technicians, plus secure web dashboard handoff for managers and supervisors.
- PWA manifest and offline fallback page.
- Audit logs for station, report, and user mutations.
- Firestore client writes locked by default.

## Known Limitations

- Firebase Auth user creation is available from the manager users screen and guarded demo seeding.
- Web PWA offline support is limited to `/offline` and `/scan`; full offline report drafting/sync is handled by the Expo mobile app.
- GPS coordinates are entered manually. Map picker/display is not implemented yet.
- No push notifications.
- Mobile drafts store only station/report draft data locally and do not store Admin SDK or Gemini secrets.
- Mobile sign-in uses Firebase Auth directly with email and access code. On a real phone, set `EXPO_PUBLIC_MAWQI3_WEB_BASE_URL` to a reachable LAN or deployed HTTPS address for manager/supervisor portal handoff and report sync.

## Quality Gate

CI is defined in `.github/workflows/ci.yml` and runs:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm ci --prefix mobile
npm run mobile:lint
npm run mobile:typecheck
```

Unit tests cover server env parsing, stable report cursors, report validation, CSV escaping/export helpers, and report image content validation.

## Security Notes

- Production CSP removes `unsafe-eval`. `unsafe-inline` remains for scripts/styles to preserve the early theme bootstrap in `app/layout.tsx` and framework style behavior; replacing it with a nonce/hash is the next hardening step.
- Production QR/base URL generation never trusts request host headers. Header inference is development-only.
- Report photo Storage paths are not exposed in list pages; signed URLs are generated per report after role/session authorization.

## Production Readiness Checklist

- Set `AUTH_SESSION_SECRET` to a unique 32+ character secret.
- Set `SESSION_MAX_AGE_SECONDS` intentionally for the deployment.
- Set `NEXT_PUBLIC_BASE_URL` to the deployed HTTPS origin before creating/updating stations.
- Deploy `firestore.rules`, `storage.rules`, and `firestore.indexes.json`.
- Keep demo seeding disabled unless targeting a local/demo Firebase project.
- Monitor CSV export failures and narrow date ranges before increasing limits.
- For large analytics needs, consider materialized stats documents and a backfill job.
- Confirm Expo `EXPO_PUBLIC_MAWQI3_WEB_BASE_URL` points to the deployed web origin for real devices.

## Next Recommended Tasks

1. Add map picker and map display for station coordinates.
2. Add Firebase Auth user invite flow when account creation policy is approved.
3. Add push notifications for pending review reports.
4. Add authenticated native report submission API for the Expo app.
5. Add richer analytics trends by date range.
6. Add configurable station follow-up thresholds.

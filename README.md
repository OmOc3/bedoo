# EcoPest — إدارة محطات الطعوم

EcoPest is an Arabic RTL bait station management system for pest control teams. Technicians submit station inspection reports by QR code, while supervisors and managers review operations from role-protected dashboards.

Brand identity rules live in `BRAND.md`.

## Tech Stack

- Next.js 15 App Router
- React 19
- TypeScript strict mode
- Better Auth email/password sessions and role administration
- SQLite/libSQL with Drizzle ORM
- Gemini API for optional manager operational insights
- Zod 4.1, React Hook Form, Tailwind CSS 3.4, qrcode
- Expo SDK 55 mobile companion app in `mobile/`

## Roles

- `technician` فني: opens `/scan`, scans station QR links, submits reports for active stations.
- `supervisor` مشرف: opens `/dashboard/supervisor`, reads station/report activity, reviews reports, exports CSV.
- `manager` مدير: opens `/dashboard/manager`, manages stations, reviews reports, manages users, exports CSV.

## Routes

- `/login`: team login.
- `/api/auth/[...all]`: Better Auth endpoints, including `/api/auth/sign-in/email` and `/api/auth/sign-out`.
- `/api/auth/login`: compatibility login wrapper used by the web form.
- `/api/auth/session`: compatibility logout endpoint; legacy token session creation returns `410`.
- `/api/mobile/me`: authenticated mobile profile endpoint.
- `/api/mobile/reports`: latest technician reports.
- `/api/mobile/web-session`: one-time handoff from the Expo app to the web dashboard.
- `/api/reports/export`: CSV export for managers and supervisors.
- `/api/reports/[id]/photos`: currently returns no external photo URLs because storage is outside this phase.

## Environment Variables

Copy `.env.example` to `.env.local` and fill the values. Do not commit real secrets.

- `DATABASE_URL` defaults to `file:./data/ecopest.db`; use `libsql://...` in production.
- `DATABASE_AUTH_TOKEN` for hosted libSQL/Turso.
- `BETTER_AUTH_SECRET` minimum 32 characters.
- `BETTER_AUTH_URL` deployment origin.
- `AUTH_ROLE_COOKIE_SECRET` minimum 32 characters; falls back to auth secret when omitted.
- `SESSION_MAX_AGE_SECONDS` positive integer.
- `NEXT_PUBLIC_BASE_URL` required in production and must be HTTPS.
- `SEED_MANAGER_EMAIL`, `SEED_MANAGER_PASSWORD`, `SEED_MANAGER_NAME` for `npm run db:seed`.
- `GEMINI_API_KEY` optional.
- `EXPO_PUBLIC_ECOPEST_WEB_BASE_URL` points the Expo app at the web backend.

Server-only environment variables are validated centrally in `lib/env/server.ts`. QR report links use `NEXT_PUBLIC_BASE_URL` in production and only infer request headers during development.

## Run Locally

```bash
npm install
npm run db:generate
npm run db:migrate
SEED_MANAGER_EMAIL=manager@example.com SEED_MANAGER_PASSWORD='change-me-12345' SEED_MANAGER_NAME='مدير النظام' npm run db:seed
npm run dev
```

Quality checks:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run mobile:lint
npm run mobile:typecheck
```

## MVP Features

- Better Auth login with session cookies and signed role cookies.
- Role-based middleware protection through `requireRole(...)`.
- Manager station CRUD with generated QR links.
- Technician report submission from station QR links.
- SQL transaction for mobile/web report submission, station counters, and audit logs.
- Supervisor dashboard and filtered report list.
- Manager dashboard, report review, and user management with generated mobile access codes.
- CSV export for reports, bounded by date/range limits.
- Optional station GPS coordinates.
- Station health indicators based on active state, visit recency, and report count.
- Manager analytics and optional Gemini-powered operational summary.
- Expo mobile companion app with native QR scanning, secure Better Auth session storage, local drafts, and web dashboard handoff.
- PWA manifest and offline fallback page.

## Known Limitations

- Data starts from a clean SQL database; there is no legacy data migration.
- Photo upload/storage is outside this phase. Add a local/S3 adapter when that feature returns.
- Web PWA offline support is limited to `/offline` and `/scan`; full offline report drafting/sync is handled by the Expo mobile app.
- GPS coordinates are entered manually. Map picker/display is not implemented yet.
- No push notifications.

## Production Checklist

- Set `BETTER_AUTH_SECRET` and `AUTH_ROLE_COOKIE_SECRET` to unique 32+ character secrets.
- Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_BASE_URL` to the deployed HTTPS origin.
- Set `DATABASE_URL` and `DATABASE_AUTH_TOKEN` for hosted libSQL/Turso.
- Run migrations before serving traffic.
- Seed the first manager once, then rotate/remove seed env values.
- Confirm Expo `EXPO_PUBLIC_ECOPEST_WEB_BASE_URL` points to the deployed web origin for real devices.

## Next Recommended Tasks

1. Add local/S3 photo storage adapter for report images.
2. Add map picker and map display for station coordinates.
3. Add push notifications for pending review reports.
4. Add richer analytics trends by date range.
5. Add configurable station follow-up thresholds.

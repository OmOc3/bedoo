# Bedoo — إدارة محطات الطعوم

Bedoo is an Arabic RTL bait station management system for pest control companies. It helps field technicians submit station inspection reports by QR code, while supervisors and managers review operations from role-protected dashboards.

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
- `/dashboard/manager/users`: user role and active status management.
- `/offline`: offline fallback for installed PWA usage.
- `/manifest.webmanifest`: PWA manifest.
- `/api/auth/login`: login endpoint.
- `/api/auth/session`: session cookie endpoint.
- `/api/reports/export`: CSV export for managers and supervisors.

## Environment Variables

Copy `.env.example` to `.env.local` and fill the values. Do not commit real secrets.

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_BASE_URL`
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`
- `ROLE_COOKIE_SECRET`
- `SESSION_MAX_AGE_SECONDS`
- `GEMINI_API_KEY`
- `EXPO_PUBLIC_BEDOO_WEB_BASE_URL`

## Run Locally

```bash
npm install
npm run dev
npm run seed:users
npm run typecheck
npm run lint
npm run build
npm run mobile:start
npm run mobile:web
```

`npm run build` requires valid Firebase and auth environment variables. Missing environment variables should be fixed in local deployment configuration, not with fake values in code.

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
- Manager dashboard, report review, and user management.
- CSV export for reports.
- Optional before/after report photo upload through Admin SDK and locked Storage rules.
- Optional station GPS coordinates.
- Station health indicators based on active state, visit recency, and report count.
- Today tasks pages for managers and supervisors.
- Manager analytics by zone, technician, and status frequency.
- Gemini-powered manager insights with local fallback when `GEMINI_API_KEY` is not configured.
- Light/dark mode identity across the web app.
- Expo mobile companion app for field technicians with native QR scanning and local drafts.
- PWA manifest and offline fallback page.
- Audit logs for station, report, and user mutations.
- Firestore client writes locked by default.

## Known Limitations

- Firebase Auth user creation is available from the manager users screen and from `npm run seed:users`.
- Demo users can be bootstrapped with `npm run seed:users`.
- GPS coordinates are entered manually. Map picker/display is not implemented yet.
- No push notifications.
- Offline mode is a fallback shell only. Report submission still requires network connectivity.
- Mobile drafts store only station/report draft data locally and do not store Admin SDK, Gemini, or session secrets.

## Next Recommended Tasks

1. Add map picker and map display for station coordinates.
2. Add Firebase Auth user invite flow when account creation policy is approved.
3. Add push notifications for pending review reports.
4. Add authenticated native report submission API for the Expo app.
5. Add richer analytics trends by date range.
6. Add configurable station follow-up thresholds.

# AGENTS.md — EcoPest إيكوبست

This file is for AI coding agents working in this repository. Read it before editing files.

## Project Identity

| Key | Value |
|-----|-------|
| Name | EcoPest — إدارة محطات الطعوم |
| Purpose | Arabic RTL bait station management system for pest control field teams |
| Language | TypeScript strict mode, Arabic UI strings |
| Direction | RTL throughout (`dir="rtl"`) |

## Current Stack

- Next.js 15 App Router, React 19, TypeScript strict mode
- Better Auth for email/password sessions and role administration
- SQLite/libSQL with Drizzle ORM
- Zod 4.1, React Hook Form, Tailwind CSS 3.4, qrcode
- Expo mobile companion app using Better Auth Expo client and `expo-secure-store`

## Architecture Rules

- Server Components: data fetching, auth checks, SQL reads.
- Client Components: forms, interactivity, `useRouter`, `useFormStatus`.
- All protected mutations go through Server Actions or API routes that call `requireRole(...)` / `requireBearerRole(...)`.
- Never trust `uid`, `role`, `createdBy`, `updatedBy`, or reviewer fields from client input. Read them from the session.
- Database access lives behind Drizzle repositories in `lib/db/repositories.ts`.
- Every mutation writes an audit log through `writeAuditLog(...)` or the repository equivalent.
- No `any` types. Use `unknown` and narrow.
- All forms use React Hook Form + Zod resolver unless they are single-button actions.

## Auth Model

Roles are:

- `technician` فني: `/scan`
- `supervisor` مشرف: `/dashboard/supervisor`
- `manager` مدير: `/dashboard/manager`

Route protection:

- `/scan`: public to view
- `/station/[id]/report`: technician, manager
- `/dashboard/supervisor/*`: supervisor, manager
- `/dashboard/manager/*`: manager only
- `/api/reports/export`: manager, supervisor

Keep `requireRole(...)` as the main authorization boundary for protected pages and actions.

## Database

Local development uses `DATABASE_URL=file:./data/ecopest.db`. Hosted deployments can use `libsql://...` with `DATABASE_AUTH_TOKEN`.

Main tables:

- Better Auth: `user`, `session`, `account`, `verification`, `rateLimit`
- App data: `stations`, `reports`, `report_statuses`, `audit_logs`, `mobile_web_sessions`

Report submission must stay transactional:

1. Create report.
2. Insert report statuses.
3. Update station counters/last visit.
4. Write audit log.

## Environment

Required/important vars are documented in `.env.example`:

- `DATABASE_URL`
- `DATABASE_AUTH_TOKEN`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `AUTH_ROLE_COOKIE_SECRET`
- `SESSION_MAX_AGE_SECONDS`
- `NEXT_PUBLIC_BASE_URL`
- `SEED_MANAGER_EMAIL`
- `SEED_MANAGER_PASSWORD`
- `SEED_MANAGER_NAME`
- `EXPO_PUBLIC_ECOPEST_WEB_BASE_URL`

Never hardcode secrets or deployment origins.

## Commands

Run after meaningful backend changes:

```bash
npm run typecheck
npm run lint
npm run build
```

Database commands:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

Mobile checks:

```bash
npm run mobile:lint
npm run mobile:typecheck
```

## UI Conventions

- Arabic RTL by default.
- Tajawal font for Arabic text.
- Prefer logical Tailwind utilities: `ps-`, `pe-`, `ms-`, `me-`.
- No hardcoded hex colors in new UI; use Tailwind classes.
- Data-fetching pages should have `loading.tsx` and `error.tsx` siblings.
- Active badges: `bg-green-100 text-green-800`.
- Inactive badges: `bg-gray-100 text-gray-600`.
- Review statuses:
  - `pending`: `bg-yellow-100 text-yellow-800`
  - `reviewed`: `bg-green-100 text-green-800`
  - `rejected`: `bg-red-100 text-red-800`

## Known Limitations

- Data starts from a clean SQL database; no legacy data migration.
- Photo upload/storage is outside the current phase.
- GPS coordinates are optional and not displayed on a map yet.
- No push notifications.
- No full web offline mode beyond the existing fallback paths.

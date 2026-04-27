# EcoPest Architecture Notes

## Shared Contracts

Shared role names, report statuses, review statuses, and common labels are centralized for the web app in `lib/shared/constants.ts`. Web validation and UI labels import these constants instead of duplicating enum values.

The Expo app currently keeps a synced copy under `mobile/src/lib/sync/*` because the repository is not configured as an npm workspace and Metro can be sensitive to importing TypeScript outside the mobile project root. A safe next step is to create a small workspace package, for example `packages/shared`, and configure both Next.js and Expo/Metro to consume it.

Recommended migration path:

1. Move `lib/shared/constants.ts` into `packages/shared/src/constants.ts`.
2. Add workspace configuration for the root and mobile package.
3. Update Next.js imports to use the shared package.
4. Configure Expo Metro/TypeScript aliases for the shared package.
5. Add CI checks that typecheck both web and mobile after shared package changes.

## Offline Boundary

The web PWA service worker intentionally caches only `/offline` and `/scan`. It does not cache protected dashboard data or report submissions. Full field offline drafting and later sync are handled by the Expo mobile app.

## Analytics Boundary

Dashboards use SQL aggregate queries for summary cards. Analytics and AI insights default to a bounded 90-day report range and explicit result limits. For very large production datasets, introduce materialized stats tables and a backfill script instead of increasing page query limits.

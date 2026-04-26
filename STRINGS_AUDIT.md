# Strings Audit

Date: 2026-04-26

Web source: `lib/i18n.ts`  
Mobile source: `mobile/src/lib/i18n.ts`

## Result

Remaining gaps: none.

The audit compared every web i18n key against both mobile Arabic and English string trees. All 59 web keys are present in mobile.

## Notes

- Mobile includes additional field-app strings for tabs, home, drafts, reports, history, settings, offline messaging, and mobile validation.
- Status labels are shared through `mobile/src/lib/sync/status-options.ts` and match the web `StatusOption` values and English labels.
- Brand and legal keys are present in both web and mobile i18n files.

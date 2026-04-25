export const SESSION_COOKIE_NAME = "bedoo_session";
export const ROLE_COOKIE_NAME = "bedoo_role";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5;
export const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;
export const LOGIN_RATE_LIMIT_COLLECTION = "authRateLimits";
export const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5;
export const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

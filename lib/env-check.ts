import "server-only";

const REQUIRED_SERVER_VARS = ["BETTER_AUTH_SECRET"] as const;

export function assertEnv(): void {
  const missing =
    process.env.NODE_ENV === "production" ? REQUIRED_SERVER_VARS.filter((key) => !process.env[key]) : [];

  if (missing.length > 0) {
    console.error("[env-check] Missing required env vars:", missing);
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  const shortSecrets = (process.env.NODE_ENV === "production" ? ["BETTER_AUTH_SECRET"] : []).filter((key) => {
    const value = process.env[key];

    return !value || value.length < 32;
  });

  if (shortSecrets.length > 0) {
    console.error("[env-check] Auth secrets missing or too short:", shortSecrets);
    throw new Error(`${shortSecrets.join(", ")} must be at least 32 characters.`);
  }
}

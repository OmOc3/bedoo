import { z } from "zod";

const envSchema = z
  .object({
    AUTH_ROLE_COOKIE_SECRET: z.string().min(32, "AUTH_ROLE_COOKIE_SECRET must be at least 32 characters.").optional(),
    AUTH_SESSION_SECRET: z.string().min(32, "AUTH_SESSION_SECRET must be at least 32 characters.").optional(),
    BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters.").optional(),
    BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL must be a valid URL.").optional(),
    DATABASE_AUTH_TOKEN: z.string().optional(),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required.").default("file:./data/mawqi3.db"),
    NEXT_PUBLIC_BASE_URL: z.string().optional(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    ROLE_COOKIE_SECRET: z.string().min(32, "ROLE_COOKIE_SECRET must be at least 32 characters.").optional(),
    SEED_MANAGER_EMAIL: z.string().email().optional(),
    SEED_MANAGER_NAME: z.string().min(1).optional(),
    SEED_MANAGER_PASSWORD: z.string().min(8).optional(),
    SESSION_MAX_AGE_SECONDS: z.coerce
      .number()
      .int("SESSION_MAX_AGE_SECONDS must be an integer.")
      .positive("SESSION_MAX_AGE_SECONDS must be positive.")
      .default(432000),
  })
  .superRefine((env, context) => {
    if (env.NODE_ENV !== "production") {
      return;
    }

    if (!env.BETTER_AUTH_SECRET && !env.AUTH_SESSION_SECRET) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "BETTER_AUTH_SECRET is required in production.",
        path: ["BETTER_AUTH_SECRET"],
      });
    }

    if (!env.NEXT_PUBLIC_BASE_URL) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "NEXT_PUBLIC_BASE_URL is required in production.",
        path: ["NEXT_PUBLIC_BASE_URL"],
      });
      return;
    }

    try {
      const url = new URL(env.NEXT_PUBLIC_BASE_URL);

      if (url.protocol !== "https:") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "NEXT_PUBLIC_BASE_URL must use https in production.",
          path: ["NEXT_PUBLIC_BASE_URL"],
        });
      }
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "NEXT_PUBLIC_BASE_URL must be a valid URL.",
        path: ["NEXT_PUBLIC_BASE_URL"],
      });
    }
  });

export type ServerEnv = z.infer<typeof envSchema>;

export function parseServerEnv(input: NodeJS.ProcessEnv): ServerEnv {
  const parsed = envSchema.safeParse(input);

  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");

    throw new Error(`Invalid server environment: ${message}`);
  }

  return parsed.data;
}

import { z } from "zod";

const envSchema = z
  .object({
    AUTH_ROLE_COOKIE_SECRET: z.string().min(32, "AUTH_ROLE_COOKIE_SECRET must be at least 32 characters.").optional(),
    AUTH_SESSION_SECRET: z.string().min(32, "AUTH_SESSION_SECRET must be at least 32 characters.").optional(),
    BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters.").optional(),
    BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL must be a valid URL.").optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_STATION_FOLDER: z.string().optional(),
    DATABASE_AUTH_TOKEN: z.string().optional(),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required.").default("file:./data/ecopest.db"),
    NEXT_PUBLIC_BASE_URL: z.string().optional(),
    NEXT_PHASE: z.string().optional(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    ROLE_COOKIE_SECRET: z.string().min(32, "ROLE_COOKIE_SECRET must be at least 32 characters.").optional(),
    SESSION_MAX_AGE_SECONDS: z.coerce
      .number()
      .int("SESSION_MAX_AGE_SECONDS must be an integer.")
      .positive("SESSION_MAX_AGE_SECONDS must be positive.")
      .default(432000),
    VERCEL_URL: z.string().optional(),
  })
  .superRefine((env, context) => {
    if (env.NODE_ENV !== "production" || env.NEXT_PHASE === "phase-production-build") {
      return;
    }

    if (!env.BETTER_AUTH_SECRET && !env.AUTH_SESSION_SECRET) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "BETTER_AUTH_SECRET is required in production.",
        path: ["BETTER_AUTH_SECRET"],
      });
    }

    if (!env.BETTER_AUTH_URL) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "BETTER_AUTH_URL is required in production.",
        path: ["BETTER_AUTH_URL"],
      });
    } else {
      try {
        const authUrl = new URL(env.BETTER_AUTH_URL);

        if (authUrl.protocol !== "https:") {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "BETTER_AUTH_URL must use https in production.",
            path: ["BETTER_AUTH_URL"],
          });
        }
      } catch {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "BETTER_AUTH_URL must be a valid URL.",
          path: ["BETTER_AUTH_URL"],
        });
      }
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

    if (env.DATABASE_URL.startsWith("file:")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "DATABASE_URL must use hosted libSQL/Turso in production; file: SQLite is local-only.",
        path: ["DATABASE_URL"],
      });
    }

    if (
      (env.DATABASE_URL.startsWith("libsql://") || env.DATABASE_URL.startsWith("turso://")) &&
      !env.DATABASE_AUTH_TOKEN
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "DATABASE_AUTH_TOKEN is required for hosted libSQL/Turso in production.",
        path: ["DATABASE_AUTH_TOKEN"],
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

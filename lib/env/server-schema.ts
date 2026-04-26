import { z } from "zod";

const envSchema = z
  .object({
    AUTH_SESSION_SECRET: z.string().min(32, "AUTH_SESSION_SECRET must be at least 32 characters."),
    FIREBASE_ADMIN_CLIENT_EMAIL: z.string().min(1, "FIREBASE_ADMIN_CLIENT_EMAIL is required."),
    FIREBASE_ADMIN_PRIVATE_KEY: z.string().min(1, "FIREBASE_ADMIN_PRIVATE_KEY is required."),
    FIREBASE_ADMIN_PROJECT_ID: z.string().min(1, "FIREBASE_ADMIN_PROJECT_ID is required."),
    NEXT_PUBLIC_BASE_URL: z.string().optional(),
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().optional(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    SESSION_MAX_AGE_SECONDS: z.coerce
      .number()
      .int("SESSION_MAX_AGE_SECONDS must be an integer.")
      .positive("SESSION_MAX_AGE_SECONDS must be positive."),
  })
  .superRefine((env, context) => {
    if (env.NODE_ENV !== "production") {
      return;
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

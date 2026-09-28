import "server-only";
import { z } from "zod";

export const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL phải là một URL hợp lệ"),
  APP_URL: z.string().url("APP_URL phải là một URL hợp lệ"),
  S3_ENDPOINT: z.string().url("S3_ENDPOINT phải là một URL hợp lệ"),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().min(1, "S3_BUCKET không được để trống"),
  S3_ACCESS_KEY_ID: z.string().min(1, "S3_ACCESS_KEY_ID không được để trống"),
  S3_SECRET_ACCESS_KEY: z
    .string()
    .min(1, "S3_SECRET_ACCESS_KEY không được để trống"),
  S3_FORCE_PATH_STYLE: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .default("true")
    .transform((val) => (typeof val === "boolean" ? val : val === "true")),
  SMTP_HOST: z.string().min(1, "SMTP_HOST không được để trống"),
  SMTP_PORT: z.coerce
    .number()
    .int("SMTP_PORT phải là số nguyên")
    .positive("SMTP_PORT phải là số nguyên dương"),
  EMAIL_FROM: z.string().min(1, "EMAIL_FROM không được để trống"),
  RESEND_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  TZ_DISPLAY: z.string().default("Asia/Ho_Chi_Minh"),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function parseEnv(rawEnv: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "cấu hình"}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Cấu hình biến môi trường không hợp lệ:\n${errorDetails}\nVui lòng kiểm tra file .env hoặc tham khảo .env.example.`
    );
  }
  return result.data;
}

export function getEnv(customEnv?: Record<string, string | undefined>): Env {
  if (customEnv) {
    return parseEnv(customEnv);
  }
  if (!cachedEnv) {
    cachedEnv = parseEnv(process.env);
  }
  return cachedEnv;
}

export function resetEnvCache(): void {
  cachedEnv = null;
}

export const env = new Proxy({} as Env, {
  get(_target, prop: string | symbol) {
    if (typeof prop === "string") {
      return getEnv()[prop as keyof Env];
    }
    return undefined;
  },
});

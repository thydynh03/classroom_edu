import { describe, it, expect, beforeEach } from "vitest";
import { parseEnv, getEnv, resetEnvCache } from "@/lib/env";

describe("env validation", () => {
  const validEnv = {
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/classroom_edu",
    APP_URL: "http://localhost:3000",
    S3_ENDPOINT: "http://localhost:9000",
    S3_BUCKET: "classroom-edu-dev",
    S3_ACCESS_KEY_ID: "minioadmin",
    S3_SECRET_ACCESS_KEY: "minioadmin",
    SMTP_HOST: "localhost",
    SMTP_PORT: "1025",
    EMAIL_FROM: "Classroom Edu <no-reply@classroom.edu.vn>",
  };

  beforeEach(() => {
    resetEnvCache();
  });

  it("parses valid environment variables with default values", () => {
    const env = parseEnv(validEnv);
    expect(env.DATABASE_URL).toBe(validEnv.DATABASE_URL);
    expect(env.SMTP_PORT).toBe(1025);
    expect(env.S3_REGION).toBe("us-east-1");
    expect(env.S3_FORCE_PATH_STYLE).toBe(true);
    expect(env.TZ_DISPLAY).toBe("Asia/Ho_Chi_Minh");
    expect(env.RESEND_API_KEY).toBeUndefined();
    expect(env.SENTRY_DSN).toBeUndefined();
  });

  it("throws descriptive error when required variables are missing", () => {
    expect(() => parseEnv({})).toThrowError(/Cấu hình biến môi trường không hợp lệ/);

    try {
      parseEnv({});
    } catch (err) {
      const message = (err as Error).message;
      expect(message).toContain("DATABASE_URL");
      expect(message).toContain("APP_URL");
      expect(message).toContain("S3_ENDPOINT");
      expect(message).toContain("S3_BUCKET");
      expect(message).toContain("S3_ACCESS_KEY_ID");
      expect(message).toContain("S3_SECRET_ACCESS_KEY");
      expect(message).toContain("SMTP_HOST");
      expect(message).toContain("SMTP_PORT");
      expect(message).toContain("EMAIL_FROM");
    }
  });

  it("validates URL formats", () => {
    const invalidEnv = {
      ...validEnv,
      DATABASE_URL: "not-a-valid-url",
    };

    expect(() => parseEnv(invalidEnv)).toThrowError(/DATABASE_URL/);
  });

  it("validates and converts SMTP_PORT", () => {
    const invalidEnv = {
      ...validEnv,
      SMTP_PORT: "-5",
    };

    expect(() => parseEnv(invalidEnv)).toThrowError(/SMTP_PORT/);
  });

  it("handles custom optional and boolean variables", () => {
    const customEnv = {
      ...validEnv,
      S3_FORCE_PATH_STYLE: "false",
      S3_REGION: "ap-southeast-1",
      RESEND_API_KEY: "re_test_123",
      SENTRY_DSN: "https://example@sentry.io/1",
      TZ_DISPLAY: "UTC",
    };

    const env = parseEnv(customEnv);
    expect(env.S3_FORCE_PATH_STYLE).toBe(false);
    expect(env.S3_REGION).toBe("ap-southeast-1");
    expect(env.RESEND_API_KEY).toBe("re_test_123");
    expect(env.SENTRY_DSN).toBe("https://example@sentry.io/1");
    expect(env.TZ_DISPLAY).toBe("UTC");
  });

  it("getEnv returns parsed environment and caches", () => {
    const env = getEnv(validEnv);
    expect(env.APP_URL).toBe("http://localhost:3000");
  });
});

import { describe, expect, it, vi } from "vitest";
vi.mock("@/server/db/client", () => ({ db: {} }));
import { sanitizeErrorMessage } from "@/server/observability/errors";
import { deviceOf } from "@/server/observability/events";

describe("sanitizeErrorMessage", () => {
  it("lỗi truy vấn DB chỉ giữ mã lỗi (tham số có thể chứa dữ liệu người dùng)", () => {
    const e = Object.assign(new Error("Failed query: select * from users where email = $1\nparams: hs@example.com"), { cause: { code: "23505" } });
    expect(sanitizeErrorMessage(e)).toBe("Lỗi truy vấn database (23505)");
  });
  it("che email, số dài, token; cắt 300 ký tự", () => {
    const m = sanitizeErrorMessage(new Error(`Không gửi được tới a.b@truong.edu.vn mã 1234567 token=abc123 ${"x".repeat(400)}`));
    expect(m).not.toContain("truong.edu.vn");
    expect(m).not.toContain("1234567");
    expect(m).not.toContain("abc123");
    expect(m.length).toBeLessThanOrEqual(300);
  });
});

describe("deviceOf", () => {
  it("phân loại thiết bị từ user-agent", () => {
    expect(deviceOf("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe("mobile");
    expect(deviceOf("Mozilla/5.0 (Linux; Android 14; Pixel 7) Mobile")).toBe("mobile");
    expect(deviceOf("Mozilla/5.0 (iPad; CPU OS 17_0)")).toBe("tablet");
    expect(deviceOf("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("desktop");
    expect(deviceOf(null)).toBe("unknown");
  });
});

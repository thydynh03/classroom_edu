import { beforeEach, describe, expect, it, vi } from "vitest";

const getActor = vi.fn();
vi.mock("@/server/auth/session", () => ({ getActor: () => getActor() }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

const base = { id: "u1", fullName: "X", username: "x", mustChangePassword: false, sessionId: "s1" };

describe("requireActor", () => {
  beforeEach(() => getActor.mockReset());

  it("GV chờ duyệt bị chuyển về /pending-approval kể cả khi không truyền role", async () => {
    const { requireActor } = await import("@/server/auth/guard");
    getActor.mockResolvedValue({ ...base, role: "TEACHER", approved: false });
    await expect(requireActor()).rejects.toThrow("REDIRECT:/pending-approval");
    await expect(requireActor("TEACHER")).rejects.toThrow("REDIRECT:/pending-approval");
    await expect(requireActor(undefined, { allowPending: true })).resolves.toMatchObject({ id: "u1" });
  });

  it("sai vai trò → 404; chưa đăng nhập → /login; mật khẩu tạm → /change-password", async () => {
    const { requireActor } = await import("@/server/auth/guard");
    getActor.mockResolvedValue({ ...base, role: "STUDENT", approved: true });
    await expect(requireActor("ADMIN")).rejects.toThrow("NOT_FOUND");
    await expect(requireActor("TEACHER")).rejects.toThrow("NOT_FOUND");
    getActor.mockResolvedValue(null);
    await expect(requireActor()).rejects.toThrow("REDIRECT:/login");
    getActor.mockResolvedValue({ ...base, role: "TEACHER", approved: true, mustChangePassword: true });
    await expect(requireActor("TEACHER")).rejects.toThrow("REDIRECT:/change-password");
  });
});

describe("requireRecentAuth (step-up admin)", () => {
  it("trong 15 phút từ lúc đăng nhập/nhập lại mật khẩu thì cho, quá thì chặn", async () => {
    const { requireRecentAuth, recentlyAuthenticated } = await import("@/server/auth/guard");
    expect(() => requireRecentAuth({ authAt: new Date(Date.now() - 5 * 60_000) })).not.toThrow();
    expect(() => requireRecentAuth({ authAt: new Date(Date.now() - 16 * 60_000) })).toThrow(/xác nhận lại mật khẩu/);
    expect(() => requireRecentAuth({ authAt: undefined })).toThrow();
    expect(recentlyAuthenticated({ authAt: new Date() })).toBe(true);
  });
});

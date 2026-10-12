import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/** Mọi lệnh tạo tài khoản phải đi qua src/server/auth/accounts.ts (audit mục 12.3-A). */
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}

describe("một cửa tạo tài khoản", () => {
  const src = path.resolve(__dirname, "../../src");
  const entry = path.join(src, "server/auth/accounts.ts");

  it("không có insert(users) ngoài accounts.ts", () => {
    const offenders = files(src).filter((f) => f !== entry && /\.insert\(\s*(schema\.)?users\s*\)/.test(readFileSync(f, "utf8")));
    expect(offenders.map((f) => path.relative(src, f))).toEqual([]);
  });

  it("không có code ứng dụng nào bật cờ tạo ADMIN", () => {
    const offenders = files(src).filter((f) => readFileSync(f, "utf8").includes("allow_admin_insert"));
    expect(offenders.map((f) => path.relative(src, f))).toEqual([]);
  });

  it("chỉ accounts.ts bật cờ duyệt GV", () => {
    const offenders = files(src).filter((f) => f !== entry && readFileSync(f, "utf8").includes("allow_teacher_approval"));
    expect(offenders.map((f) => path.relative(src, f))).toEqual([]);
  });
});

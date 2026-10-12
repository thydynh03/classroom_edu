/**
 * Chặn tạo tài khoản trái phép và leo quyền (audit mục 12.4). Các test ở đây đều kiểu "phải thất bại".
 */
import { createHash, randomBytes } from "node:crypto";
import { beforeAll, describe, expect, inject, it } from "vitest";
import { uuidv7 } from "uuidv7";
import { and, eq, sql } from "drizzle-orm";

process.env.DATABASE_URL = inject("dbUrl");

type Actor = {
  id: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  fullName: string;
  username: string;
  mustChangePassword: boolean;
  sessionId: string;
};

const mod = async () => ({
  db: await import("@/server/db/client"),
  schema: await import("@/server/db/schema"),
  accounts: await import("@/server/auth/accounts"),
  classes: await import("@/server/services/classes"),
  admin: await import("@/server/services/admin"),
  notif: await import("@/server/services/notifications"),
  validation: await import("@/server/validation/auth"),
});
let m: Awaited<ReturnType<typeof mod>>;

const actor = (id: string, role: Actor["role"], fullName: string = role): Actor => ({
  id,
  role,
  fullName,
  username: id.slice(0, 8),
  mustChangePassword: false,
  sessionId: uuidv7(),
});

const is404 = (p: Promise<unknown>) =>
  expect(p).rejects.toSatisfy((e: unknown) => String((e as { digest?: string }).digest ?? "").includes("404"));
/** Lỗi do trigger users_guard (SQLSTATE 42501), có thể bị drizzle bọc trong `cause`. */
const blockedByDb = (p: Promise<unknown>) =>
  expect(p).rejects.toSatisfy((e: unknown) => {
    const err = e as { code?: string; cause?: { code?: string } };
    return err.code === "42501" || err.cause?.code === "42501";
  });

let gvA: Actor, gvB: Actor, hsA: Actor, hsB: Actor, hsAB: Actor, admin1: Actor, admin2: Actor;
let lopA: string, lopB: string;

async function insertAdmin(username: string) {
  return m.db.db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.allow_admin_insert', 'on', true)`);
    const [u] = await tx.insert(m.schema.users).values({ username, fullName: username, passwordHash: "x", role: "ADMIN" }).returning();
    return actor(u.id, "ADMIN");
  });
}

beforeAll(async () => {
  m = await mod();
  const { db } = m.db;
  const s = m.schema;
  const mk = async (username: string, role: "TEACHER" | "STUDENT", createdBy?: string) => {
    const [u] = await db.insert(s.users).values({ username, fullName: username, passwordHash: "x", role, createdBy }).returning();
    return actor(u.id, role, username);
  };
  gvA = await mk("esc.gv.a", "TEACHER");
  gvB = await mk("esc.gv.b", "TEACHER");
  hsA = await mk("esc.hs.a", "STUDENT", gvA.id);
  hsB = await mk("esc.hs.b", "STUDENT", gvB.id);
  hsAB = await mk("esc.hs.ab", "STUDENT");
  lopA = (await m.classes.createClass(gvA, { name: "Esc A", subject: "Toán", color: "sky" })).id;
  lopB = (await m.classes.createClass(gvB, { name: "Esc B", subject: "Văn", color: "mint" })).id;
  await m.classes.joinClass(hsA.id, lopA);
  await m.classes.joinClass(hsB.id, lopB);
  await m.classes.joinClass(hsAB.id, lopA);
  await m.classes.joinClass(hsAB.id, lopB);
  admin1 = await insertAdmin("esc.admin1");
  admin2 = await insertAdmin("esc.admin2");
});

describe("trigger users_guard (lớp chặn cuối ở DB)", () => {
  it("không tạo được ADMIN nếu không bật cờ", async () => {
    await blockedByDb(m.db.db.insert(m.schema.users).values({ username: "esc.hacker", fullName: "X", passwordHash: "x", role: "ADMIN" }));
  });

  it("không đổi được vai trò, kể cả bằng SQL trực tiếp", async () => {
    await blockedByDb(m.db.db.execute(sql`update users set role = 'ADMIN' where id = ${hsA.id}`));
    await blockedByDb(m.db.db.execute(sql`update users set role = 'TEACHER' where id = ${hsA.id}`));
  });

  it("không tự duyệt GV được nếu không bật cờ", async () => {
    await blockedByDb(m.db.db.execute(sql`update users set approved_at = now() where id = ${gvA.id}`));
    await blockedByDb(
      m.db.db.insert(m.schema.users).values({ username: "esc.gv.tuduyet", fullName: "X", passwordHash: "x", role: "TEACHER", approvedAt: new Date() }),
    );
  });
});

describe("tạo và duyệt giáo viên", () => {
  it("form đăng ký từ chối field lạ như role/approvedAt", () => {
    const base = { fullName: "Cô Test", email: "co.test@example.com", username: "co.test", password: "matkhau-123" };
    expect(m.validation.registerSchema.safeParse(base).success).toBe(true);
    expect(m.validation.registerSchema.safeParse({ ...base, role: "ADMIN" }).success).toBe(false);
    expect(m.validation.registerSchema.safeParse({ ...base, approvedAt: "2026-01-01" }).success).toBe(false);
  });

  it("GV tự đăng ký luôn chờ duyệt, kể cả email đúng tên miền trường", async () => {
    process.env.TEACHER_AUTO_APPROVE_DOMAINS = "truong.edu.vn";
    const id = await m.accounts.registerTeacher({ email: "gia.mao@truong.edu.vn", username: "esc.giamao", fullName: "Giả Mạo", password: "matkhau-123", emailVerified: true });
    const [u] = await m.db.db.select().from(m.schema.users).where(eq(m.schema.users.id, id));
    expect(u.role).toBe("TEACHER");
    expect(u.approvedAt).toBeNull();
  });

  it("duyệt theo tên miền chỉ xảy ra khi bật xác minh email và đã bấm link", async () => {
    const { verifyEmailToken } = await import("@/app/(auth)/actions");
    const issue = async (userId: string) => {
      const token = randomBytes(32).toString("base64url");
      await m.db.db.insert(m.schema.authTokens).values({
        userId,
        purpose: "VERIFY_EMAIL",
        tokenHash: createHash("sha256").update(token).digest("hex"),
        expiresAt: new Date(Date.now() + 3600_000),
      });
      return token;
    };
    process.env.TEACHER_AUTO_APPROVE_DOMAINS = "truong.edu.vn";
    // Tắt xác minh email: không duyệt theo tên miền.
    process.env.REQUIRE_EMAIL_VERIFICATION = "false";
    const off = await m.accounts.registerTeacher({ email: "co.tat@truong.edu.vn", username: "esc.cotat", fullName: "Cô Tắt", password: "matkhau-123", emailVerified: false });
    expect(await verifyEmailToken(await issue(off))).toBe(true);
    let [u] = await m.db.db.select().from(m.schema.users).where(eq(m.schema.users.id, off));
    expect(u.approvedAt).toBeNull();
    // Bật xác minh email: chỉ duyệt sau khi bấm link, và chỉ đúng tên miền.
    process.env.REQUIRE_EMAIL_VERIFICATION = "true";
    const on = await m.accounts.registerTeacher({ email: "co.bat@truong.edu.vn", username: "esc.cobat", fullName: "Cô Bật", password: "matkhau-123", emailVerified: false });
    [u] = await m.db.db.select().from(m.schema.users).where(eq(m.schema.users.id, on));
    expect(u.approvedAt).toBeNull();
    expect(await verifyEmailToken(await issue(on))).toBe(true);
    [u] = await m.db.db.select().from(m.schema.users).where(eq(m.schema.users.id, on));
    expect(u.approvedAt).not.toBeNull();
    const other = await m.accounts.registerTeacher({ email: "x@gmail.com", username: "esc.gmail", fullName: "Gmail", password: "matkhau-123", emailVerified: false });
    await verifyEmailToken(await issue(other));
    [u] = await m.db.db.select().from(m.schema.users).where(eq(m.schema.users.id, other));
    expect(u.approvedAt).toBeNull();
    delete process.env.TEACHER_AUTO_APPROVE_DOMAINS;
    delete process.env.REQUIRE_EMAIL_VERIFICATION;
  });

  it("chỉ ADMIN tạo/duyệt GV; GV và HS gọi thẳng service đều bị 404", async () => {
    await is404(m.admin.createTeacher(gvA, { fullName: "X", username: "esc.x1", email: "x1@example.com" }));
    await is404(m.admin.createTeacher(hsA, { fullName: "X", username: "esc.x2", email: "x2@example.com" }));
    await is404(m.admin.approveTeacher(gvB, gvA.id));
    await is404(m.admin.approveTeacher(hsA, gvA.id));
    await m.admin.approveTeacher(admin1, gvA.id);
    const [u] = await m.db.db.select().from(m.schema.users).where(eq(m.schema.users.id, gvA.id));
    expect(u.approvedAt).not.toBeNull();
  });
});

describe("GV không chiếm được tài khoản HS", () => {
  it("GV không tự thêm HS lạ vào lớp: chỉ gửi lời mời, HS chưa đồng ý thì chưa vào lớp", async () => {
    expect(await m.classes.inviteExistingStudent(gvA, lopA, "esc.hs.b")).toBe("invited");
    expect(await m.classes.inviteExistingStudent(gvA, lopA, "esc.hs.b")).toBe("invited"); // gửi lại không tạo lời mời trùng
    expect(await m.classes.inviteExistingStudent(gvA, lopA, "esc.hs.a")).toBe("already");
    expect(await m.classes.inviteExistingStudent(gvA, lopA, "esc.gv.b")).toBe("not_found");
    await is404(m.classes.inviteExistingStudent(gvB, lopA, "esc.hs.b"));
    const list = await m.classes.listClassStudents(gvA, lopA);
    expect(list.map((s) => s.id)).not.toContain(hsB.id);
    // Chưa vào lớp → không cấp lại mật khẩu được.
    await is404(m.classes.resetStudentPassword(gvA, lopA, hsB.id));
    const invites = await m.db.db
      .select()
      .from(m.schema.classInvites)
      .where(and(eq(m.schema.classInvites.studentId, hsB.id), eq(m.schema.classInvites.status, "PENDING")));
    expect(invites).toHaveLength(1);
    const notes = await m.notif.listNotifications(hsB.id);
    expect(notes.filter((n) => n.type === "CLASS_INVITE")).toHaveLength(1);
  });

  it("chỉ chính HS trả lời được lời mời của mình", async () => {
    const [inv] = await m.classes.listMyInvites(hsB);
    expect(inv).toBeDefined();
    await is404(m.classes.respondInvite(hsA, inv.id, true));
    await is404(m.classes.respondInvite(gvA, inv.id, true));
    await is404(m.classes.respondInvite(hsB, "khong-phai-uuid", true));
    expect(await m.classes.respondInvite(hsB, inv.id, true)).toBe(lopA);
    await is404(m.classes.respondInvite(hsB, inv.id, true)); // đã trả lời rồi
    expect((await m.classes.listClassStudents(gvA, lopA)).map((s) => s.id)).toContain(hsB.id);
  });

  it("HS đang học lớp của GV khác: GV không cấp lại mật khẩu được (cả từng em lẫn hàng loạt)", async () => {
    await expect(m.classes.resetStudentPassword(gvA, lopA, hsB.id)).rejects.toThrow(/giáo viên khác/);
    await expect(m.classes.resetStudentPassword(gvA, lopA, hsAB.id)).rejects.toThrow(/giáo viên khác/);
    await expect(m.classes.resetStudentPasswords(gvA, lopA, [hsA.id, hsAB.id])).rejects.toThrow(/giáo viên khác/);
    const [u] = await m.db.db.select().from(m.schema.users).where(eq(m.schema.users.id, hsAB.id));
    expect(u.passwordHash).toBe("x");
    expect(u.mustChangePassword).toBe(false);
  });

  it("HS chỉ học lớp của GV: cấp lại được và HS nhận thông báo", async () => {
    const pw = await m.classes.resetStudentPassword(gvA, lopA, hsA.id);
    expect(pw.length).toBeGreaterThanOrEqual(8);
    const notes = await m.notif.listNotifications(hsA.id);
    expect(notes.some((n) => n.type === "PASSWORD_RESET" && n.title.includes("esc.gv.a"))).toBe(true);
  });
});

describe("giới hạn trong quyền admin", () => {
  it("admin không cấp lại mật khẩu cho admin khác", async () => {
    await expect(m.admin.adminResetPassword(admin1, admin2.id)).rejects.toThrow(/quản trị viên khác/);
  });

  it("không khóa được admin hoạt động cuối cùng", async () => {
    // admin2 khóa admin1 được vì vẫn còn admin2. Sau đó (giả sử) admin2 là admin duy nhất: không ai khóa được admin2.
    await m.admin.setUserStatus(admin2, admin1.id, "LOCKED");
    const others = await m.db.db.select({ id: m.schema.users.id }).from(m.schema.users).where(and(eq(m.schema.users.role, "ADMIN"), eq(m.schema.users.status, "ACTIVE")));
    for (const o of others) if (o.id !== admin2.id) await m.admin.setUserStatus(admin2, o.id, "LOCKED");
    await expect(m.admin.setUserStatus(admin1, admin2.id, "DISABLED")).rejects.toThrow(/ít nhất một quản trị viên/);
    await m.admin.setUserStatus(admin2, admin1.id, "ACTIVE");
  });
});

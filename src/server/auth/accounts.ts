import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db, type Tx } from "@/server/db/client";
import { classMembers, users } from "@/server/db/schema";
import { hashPassword } from "./password";

/**
 * MỘT CỬA tạo tài khoản và duyệt GV. Không hàm nào nhận `role` từ bên ngoài.
 * - Không có hàm tạo ADMIN: admin chỉ tạo bằng `pnpm admin:create` (scripts/create-admin.ts) hoặc bootstrap lúc migrate.
 * - `approved_at` của GV chỉ đặt ở đây, kèm cờ `app.allow_teacher_approval` mà trigger `users_guard` (drizzle/0005) đòi hỏi.
 * Unit test `tests/unit/accounts-single-entry.test.ts` fail nếu có `insert(users)` ở nơi khác trong src/.
 */

async function allowTeacherApproval(tx: Tx) {
  await tx.execute(sql`select set_config('app.allow_teacher_approval', 'on', true)`);
}

/** GV tự đăng ký: luôn chờ admin duyệt (approved_at = null). */
export async function registerTeacher(input: {
  email: string;
  username: string;
  fullName: string;
  password: string;
  emailVerified: boolean;
}) {
  const [u] = await db
    .insert(users)
    .values({
      email: input.email,
      username: input.username,
      fullName: input.fullName,
      passwordHash: await hashPassword(input.password),
      role: "TEACHER",
      emailVerifiedAt: input.emailVerified ? new Date() : null,
      approvedAt: null,
    })
    .returning({ id: users.id });
  return u.id;
}

/** Admin tạo GV: admin tạo nghĩa là admin đã duyệt. Gọi sau khi đã kiểm tra actor là ADMIN. */
export async function createTeacherByAdmin(
  adminId: string,
  input: { fullName: string; username: string; email: string },
  tempPassword: string,
) {
  const passwordHash = await hashPassword(tempPassword);
  return db.transaction(async (tx) => {
    await allowTeacherApproval(tx);
    const [u] = await tx
      .insert(users)
      .values({
        ...input,
        passwordHash,
        role: "TEACHER",
        mustChangePassword: true,
        emailVerifiedAt: new Date(),
        approvedAt: new Date(),
        createdBy: adminId,
      })
      .returning({ id: users.id });
    return u.id;
  });
}

/** Duyệt GV đang chờ. Trả về true nếu vừa duyệt (false nếu đã duyệt trước đó / không phải GV). */
export async function approveTeacherAccount(userId: string) {
  return db.transaction(async (tx) => {
    await allowTeacherApproval(tx);
    const rows = await tx
      .update(users)
      .set({ approvedAt: new Date() })
      .where(and(eq(users.id, userId), eq(users.role, "TEACHER"), isNull(users.approvedAt)))
      .returning({ id: users.id });
    return rows.length > 0;
  });
}

/** HS tự đăng ký bằng mã lớp. */
export async function signupStudent(input: { fullName: string; username: string; password: string }) {
  const [u] = await db
    .insert(users)
    .values({
      fullName: input.fullName,
      username: input.username,
      passwordHash: await hashPassword(input.password),
      role: "STUDENT",
    })
    .returning({ id: users.id });
  return u.id;
}

/**
 * GV tạo nhiều tài khoản HS và thêm vào lớp trong MỘT transaction (lỗi giữa chừng thì không tạo em nào,
 * tránh tài khoản đã tạo mà GV không nhận được mật khẩu tạm). Hash trước để transaction ngắn.
 */
export async function createStudentsInClass(
  teacherId: string,
  classId: string,
  list: { fullName: string; username: string; tempPassword: string }[],
) {
  const hashed = await Promise.all(list.map(async (s) => ({ ...s, passwordHash: await hashPassword(s.tempPassword) })));
  await db.transaction(async (tx) => {
    for (const s of hashed) {
      const [u] = await tx
        .insert(users)
        .values({
          fullName: s.fullName,
          username: s.username,
          passwordHash: s.passwordHash,
          role: "STUDENT",
          mustChangePassword: true,
          createdBy: teacherId,
        })
        .returning({ id: users.id });
      await tx.insert(classMembers).values({ classId, userId: u.id, role: "STUDENT" });
    }
  });
}

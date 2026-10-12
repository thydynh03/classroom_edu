/**
 * BÀN GIAO: xóa toàn bộ dữ liệu, chỉ giữ admin và tạo bộ dữ liệu mẫu nhỏ (1 GV mẫu, 1 lớp, 1 HS, 2 bài).
 * KHÔNG HOÀN TÁC ĐƯỢC — backup trước: pg_dump "$DIRECT_URL" > backup.sql
 *
 *   CONFIRM_WIPE=<host DB> DIRECT_URL=... pnpm db:handover [--keep-admin <username>] [--admin-username u --admin-name "Tên"] [--no-sample]
 *
 * - --keep-admin: giữ nguyên tài khoản admin đang có (mật khẩu không đổi). Không có thì tạo admin mới (mật khẩu tạm in ra).
 * - --no-sample: không tạo GV/HS/lớp/bài mẫu.
 * Mật khẩu tạm in ra MỘT LẦN, mọi tài khoản mẫu bắt đổi mật khẩu khi đăng nhập lần đầu. Không ghi mật khẩu ra file.
 * Sau khi chạy: xóa object trong bucket R2 (att/, sub/) — xem docs/HANDOVER.md.
 */
import { randomBytes } from "node:crypto";
import { hash } from "@node-rs/argon2";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import { uuidv7 } from "uuidv7";
import * as s from "../src/server/db/schema";

const TABLES = [
  "app_settings",
  "email_sends",
  "rate_limits",
  "class_invites",
  "audit_logs",
  "notifications",
  "grade_events",
  "submission_files",
  "submissions",
  "question_options",
  "questions",
  "assignment_attachments",
  "files",
  "assignments",
  "class_members",
  "classes",
  "auth_tokens",
  "sessions",
  "users",
];

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const tempPassword = () => {
  const a = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(randomBytes(12), (b) => a[b % a.length]).join("");
};
const joinCode = () => {
  const a = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from(randomBytes(8), (b) => a[b % a.length]).join("");
};
const argon = (p: string) => hash(p, { memoryCost: 19456, timeCost: 2, parallelism: 1 });

async function main() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("Thiếu DIRECT_URL / DATABASE_URL");
  const host = new URL(url).hostname;
  if (process.env.CONFIRM_WIPE !== host) throw new Error(`Đặt CONFIRM_WIPE=${host} để xác nhận XÓA HẾT dữ liệu trên DB này.`);
  const keepAdmin = arg("keep-admin")?.toLowerCase();
  const sample = !process.argv.includes("--no-sample");
  const newAdmin = { username: arg("admin-username")?.toLowerCase() ?? "quantri", fullName: arg("admin-name") ?? "Quản trị viên" };

  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client, { schema: s });
  const creds: { role: string; username: string; password: string }[] = [];
  try {
    const kept = keepAdmin
      ? (await db.select().from(s.users).where(sql`lower(${s.users.username}) = ${keepAdmin} and ${s.users.role} = 'ADMIN'`))[0]
      : undefined;
    if (keepAdmin && !kept) throw new Error(`Không tìm thấy admin "${keepAdmin}".`);

    const adminPw = kept ? null : tempPassword();
    const teacherPw = tempPassword();
    const studentPw = tempPassword();
    const [adminHash, teacherHash, studentHash] = await Promise.all([adminPw ? argon(adminPw) : null, argon(teacherPw), argon(studentPw)]);

    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`truncate table ${TABLES.join(", ")} restart identity cascade`));
      await tx.execute(sql`select set_config('app.allow_admin_insert', 'on', true)`);
      await tx.execute(sql`select set_config('app.allow_teacher_approval', 'on', true)`);
      if (kept) {
        await tx.insert(s.users).values({ ...kept, failedLogins: 0, lockedUntil: null });
      } else {
        await tx.insert(s.users).values({
          username: newAdmin.username,
          fullName: newAdmin.fullName,
          passwordHash: adminHash!,
          role: "ADMIN",
          mustChangePassword: true,
          emailVerifiedAt: new Date(),
        });
        creds.push({ role: "Quản trị", username: newAdmin.username, password: adminPw! });
      }
      if (!sample) return;

      const [teacher] = await tx
        .insert(s.users)
        .values({ username: "giaovien.mau", fullName: "Giáo viên mẫu", passwordHash: teacherHash, role: "TEACHER", mustChangePassword: true, emailVerifiedAt: new Date(), approvedAt: new Date() })
        .returning();
      const [student] = await tx
        .insert(s.users)
        .values({ username: "hocsinh.mau", fullName: "Học sinh mẫu", passwordHash: studentHash, role: "STUDENT", mustChangePassword: true, createdBy: teacher.id })
        .returning();
      creds.push({ role: "Giáo viên mẫu", username: "giaovien.mau", password: teacherPw }, { role: "Học sinh mẫu", username: "hocsinh.mau", password: studentPw });

      const [cls] = await tx
        .insert(s.classes)
        .values({ ownerId: teacher.id, name: "Lớp mẫu", subject: "Toán", color: "sky", joinCode: joinCode(), schoolYear: "2026–2027" })
        .returning();
      await tx.insert(s.classMembers).values([
        { classId: cls.id, userId: teacher.id, role: "TEACHER" },
        { classId: cls.id, userId: student.id, role: "STUDENT" },
      ]);
      const due = new Date(Date.now() + 7 * 86400_000);
      const [, quiz] = await tx
        .insert(s.assignments)
        .values([
          {
            classId: cls.id,
            groupId: uuidv7(),
            type: "WRITTEN",
            title: "Bài tập mẫu: Hàm số bậc hai",
            body: "Làm bài 1 đến 3 trang 42 SGK.\nChụp rõ từng trang bài làm hoặc viết trực tiếp vào ô bài làm rồi bấm Nộp bài.",
            dueAt: due,
            status: "PUBLISHED",
            publishedAt: new Date(),
            createdBy: teacher.id,
          },
          {
            classId: cls.id,
            groupId: uuidv7(),
            type: "QUIZ",
            title: "Trắc nghiệm mẫu: Mệnh đề",
            body: "3 câu, tự chấm ngay khi nộp.",
            dueAt: due,
            status: "PUBLISHED",
            publishedAt: new Date(),
            showResults: "IMMEDIATE",
            createdBy: teacher.id,
          },
        ])
        .returning();
      const qs = [
        { prompt: "Mệnh đề nào sau đây đúng?", type: "SINGLE" as const, opts: [["2 là số lẻ", false], ["π > 3", true], ["1 + 1 = 3", false]] as const },
        { prompt: "Mọi số nguyên tố đều là số lẻ.", type: "TRUE_FALSE" as const, opts: [["Đúng", false], ["Sai", true]] as const },
        { prompt: "Chọn các tập con của {1; 2}.", type: "MULTI" as const, opts: [["∅", true], ["{1}", true], ["{3}", false]] as const },
      ];
      for (const [i, q] of qs.entries()) {
        const [row] = await tx.insert(s.questions).values({ assignmentId: quiz.id, type: q.type, prompt: q.prompt, points: 1, position: i }).returning();
        await tx.insert(s.questionOptions).values(q.opts.map(([label, isCorrect], j) => ({ questionId: row.id, label, isCorrect, position: j })));
      }
      await tx.insert(s.auditLogs).values({ actorId: null, action: "system.handover_reset", targetType: "system", meta: { sample } });
    });

    console.log(`Đã xóa dữ liệu trên ${host}${kept ? `, giữ admin ${kept.username}` : ""}.`);
    if (creds.length) {
      console.log("Tài khoản (mật khẩu tạm chỉ hiện MỘT LẦN, bắt đổi khi đăng nhập lần đầu):");
      for (const c of creds) console.log(`  ${c.role.padEnd(14)} ${c.username.padEnd(14)} ${c.password}`);
    }
    console.log("Tiếp theo: xóa object trong bucket R2 (att/, sub/) — xem docs/HANDOVER.md.");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("[handover]", e instanceof Error ? e.message : e);
  process.exit(1);
});

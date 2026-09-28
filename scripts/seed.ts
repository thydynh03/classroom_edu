/**
 * Dữ liệu mẫu cho môi trường dev. Chạy: pnpm db:seed (xóa dữ liệu cũ trong các bảng nghiệp vụ).
 * Mật khẩu mọi tài khoản mẫu = SEED_PASSWORD trong .env.
 */
import { hash } from "@node-rs/argon2";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { uuidv7 } from "uuidv7";
import * as s from "../src/server/db/schema";

if (process.env.NODE_ENV === "production") throw new Error("Không seed production");
const PASSWORD = process.env.SEED_PASSWORD;
if (!PASSWORD || PASSWORD.length < 8) throw new Error("Đặt SEED_PASSWORD (≥ 8 ký tự) trong .env");

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client, { schema: s });

const day = 86400_000;
const now = Date.now();
const at = (days: number, h = 23, m = 59) => {
  const d = new Date(now + days * day);
  d.setUTCHours(h - 7, m, 0, 0); // giờ Việt Nam
  return d;
};

async function main() {
  await client.unsafe(
    "truncate table audit_logs, notifications, grade_events, submission_files, submissions, question_options, questions, assignment_attachments, files, assignments, class_members, classes, auth_tokens, sessions, users restart identity cascade",
  );
  const pw = await hash(PASSWORD!, { memoryCost: 19456, timeCost: 2, parallelism: 1 });

  const [teacher] = await db
    .insert(s.users)
    .values({
      username: "co.ha",
      email: "ha.nguyen@example.edu.vn",
      fullName: "Nguyễn Thu Hà",
      passwordHash: pw,
      role: "TEACHER",
      emailVerifiedAt: new Date(),
    })
    .returning();
  const [teacher2] = await db
    .insert(s.users)
    .values({ username: "thay.quang", email: "quang.pham@example.edu.vn", fullName: "Phạm Quang", passwordHash: pw, role: "TEACHER", emailVerifiedAt: new Date() })
    .returning();
  await db.insert(s.users).values({ username: "admin", email: "admin@example.edu.vn", fullName: "Quản trị viên", passwordHash: pw, role: "ADMIN", emailVerifiedAt: new Date() });

  const classDefs = [
    { name: "10A1 · Toán", subject: "Toán", color: "sky" as const, joinCode: "TOAN10A1" },
    { name: "10A2 · Toán", subject: "Toán", color: "mint" as const, joinCode: "TOAN10A2" },
    { name: "11B3 · Toán", subject: "Toán", color: "peach" as const, joinCode: "TOAN11B3" },
    { name: "CLB Toán nâng cao", subject: "Toán", color: "lilac" as const, joinCode: "CLBTOAN4" },
  ];
  const cls = await db
    .insert(s.classes)
    .values(classDefs.map((c) => ({ ...c, ownerId: teacher.id, schoolYear: "2026–2027" })))
    .returning();
  await db.insert(s.classMembers).values(cls.map((c) => ({ classId: c.id, userId: teacher.id, role: "TEACHER" as const })));
  const [physics] = await db
    .insert(s.classes)
    .values({ name: "10A1 · Vật lý", subject: "Vật lý", color: "rose", joinCode: "LY10A1XX", ownerId: teacher2.id })
    .returning();
  await db.insert(s.classMembers).values({ classId: physics.id, userId: teacher2.id, role: "TEACHER" });

  const names = [
    ["Lê Hoàng Anh", "lehoanganh"],
    ["Ngô Bảo Châu", "ngobaochau"],
    ["Phạm Đức Duy", "phamducduy"],
    ["Trần Gia Hân", "trangiahan"],
    ["Vũ Khánh Linh", "vukhanhlinh"],
    ["Hồ Minh Nhật", "hominhnhat"],
    ["Đỗ Thanh Tâm", "dothanhtam"],
    ["Quách Vy", "quachvy"],
    ["Bùi Nam", "buinam"],
    ["Hà Phương", "haphuong"],
    ["Mai Thảo", "maithao"],
    ["Trần Minh Khoa", "tranminhkhoa"],
  ];
  const students = await db
    .insert(s.users)
    .values(
      names.map(([fullName, username], i) => ({
        fullName,
        username,
        passwordHash: pw,
        role: "STUDENT" as const,
        mustChangePassword: i === 10, // 1 em còn mật khẩu tạm để thử luồng đổi mật khẩu
        createdBy: teacher.id,
      })),
    )
    .returning();
  const c10a1 = cls[0];
  await db.insert(s.classMembers).values([
    ...students.map((st) => ({ classId: c10a1.id, userId: st.id, role: "STUDENT" as const })),
    ...students.slice(0, 6).map((st) => ({ classId: cls[3].id, userId: st.id, role: "STUDENT" as const })),
    ...students.map((st) => ({ classId: physics.id, userId: st.id, role: "STUDENT" as const })),
  ]);

  const mk = (v: Partial<typeof s.assignments.$inferInsert> & { classId: string; title: string; dueAt: Date }) => ({
    groupId: uuidv7(),
    type: "WRITTEN" as const,
    body: "",
    status: "PUBLISHED" as const,
    publishedAt: new Date(v.dueAt.getTime() - 5 * day),
    createdBy: teacher.id,
    ...v,
  });
  const [hamSo, menhDe, luyenTap, vecto, hsg, lab, nhap] = await db
    .insert(s.assignments)
    .values([
      mk({
        classId: c10a1.id,
        title: "Bài tập Hàm số bậc hai",
        body: "Làm bài 1 đến 5 trang 42 SGK Đại số 10.\nVới mỗi hàm số, xác định đỉnh, trục đối xứng và vẽ đồ thị trên giấy kẻ ô.\n\nChụp rõ từng trang, đủ sáng, hoặc nộp một file PDF. Bài 5 là bài nâng cao, không bắt buộc.",
        dueAt: at(2),
      }),
      mk({ classId: c10a1.id, title: "Quiz: Mệnh đề và tập hợp", type: "QUIZ", dueAt: at(-2, 21, 0), showResults: "IMMEDIATE", maxPoints: 10 }),
      mk({ classId: c10a1.id, title: "Luyện tập Tập hợp", body: "Bài 1–6 phiếu luyện tập.", dueAt: at(-5) }),
      mk({ classId: cls[2].id, title: "Phiếu học tập Vectơ", body: "Hoàn thành phiếu học tập đính kèm.", dueAt: at(4) }),
      mk({ classId: cls[3].id, title: "Đề luyện HSG số 4", body: "Làm trong 120 phút, trình bày đầy đủ.", dueAt: at(7, 20, 0) }),
      { ...mk({ classId: physics.id, title: "Báo cáo thí nghiệm con lắc đơn", body: "Viết báo cáo theo mẫu.", dueAt: at(-1) }), createdBy: teacher2.id },
      mk({ classId: c10a1.id, title: "Ôn tập chương 2 (nháp)", status: "DRAFT", publishedAt: null, dueAt: at(10) }),
    ])
    .returning();
  void hsg;
  void nhap;

  // Câu hỏi quiz
  const quizQs = [
    { prompt: "Mệnh đề nào sau đây là mệnh đề đúng?", type: "SINGLE" as const, opts: [["2 là số lẻ", false], ["√2 là số hữu tỉ", false], ["π > 3", true], ["1 + 1 = 3", false]] },
    { prompt: "Tập hợp A = {x ∈ ℕ | x < 3} có bao nhiêu phần tử?", type: "SINGLE" as const, opts: [["2", false], ["3", true], ["4", false]] },
    { prompt: "Mọi số nguyên tố đều là số lẻ.", type: "TRUE_FALSE" as const, opts: [["Đúng", false], ["Sai", true]] },
    { prompt: "Chọn các tập con của {1; 2}.", type: "MULTI" as const, opts: [["∅", true], ["{1}", true], ["{3}", false], ["{1; 2}", true]] },
  ];
  const optionIds: string[][] = [];
  for (const [i, q] of quizQs.entries()) {
    const [row] = await db.insert(s.questions).values({ assignmentId: menhDe.id, type: q.type, prompt: q.prompt, points: 2.5, position: i }).returning();
    const opts = await db
      .insert(s.questionOptions)
      .values(q.opts.map(([label, isCorrect], j) => ({ questionId: row.id, label: label as string, isCorrect: isCorrect as boolean, position: j })))
      .returning();
    optionIds.push(opts.filter((o) => o.isCorrect).map((o) => o.id));
  }
  const qRows = await db.query.questions.findMany({ where: (q, { eq }) => eq(q.assignmentId, menhDe.id), orderBy: (q, { asc }) => asc(q.position) });

  // Bài nộp
  const sub = (studentIdx: number, assignmentId: string, v: Partial<typeof s.submissions.$inferInsert>) => ({
    assignmentId,
    studentId: students[studentIdx].id,
    ...v,
  });
  const submitted = (d: number, h: number) => at(d, h, 14);
  await db.insert(s.submissions).values([
    // Hàm số bậc hai: vài em đã nộp chờ chấm, 1 em nộp trễ? (chưa quá hạn) , vài em đã chấm
    sub(0, hamSo.id, { status: "SUBMITTED", content: "Em nộp bài 1–4, bài 5 em làm được câu a ạ.", submittedAt: submitted(-1, 21), versionNo: 1 }),
    sub(1, hamSo.id, { status: "SUBMITTED", content: "Bài làm của em ở ảnh đính kèm.", submittedAt: submitted(-1, 22), versionNo: 1 }),
    sub(2, hamSo.id, { status: "GRADED", content: "Bài 1–5.", submittedAt: submitted(-2, 20), score: 8.5, feedback: "Trình bày rõ ràng.", versionNo: 1 }),
    sub(3, hamSo.id, { status: "SUBMITTED", content: "Em gửi bài ạ.", submittedAt: submitted(-1, 20), versionNo: 1 }),
    sub(5, hamSo.id, { status: "RETURNED", content: "Bài làm đầy đủ.", submittedAt: submitted(-3, 19), score: 9, feedback: "Rất tốt!", returnedAt: new Date(), versionNo: 1 }),
    sub(6, hamSo.id, { status: "DRAFT", content: "Bài 1: đỉnh I(2; −1)…" }),
    sub(11, hamSo.id, { status: "DRAFT", content: "" }),
    // Luyện tập tập hợp (đã quá hạn): đủ trạng thái cho heatmap
    ...students.slice(0, 10).map((_, i) =>
      sub(i, luyenTap.id, {
        status: i % 4 === 0 ? "RETURNED" : "GRADED",
        content: "Bài làm luyện tập.",
        submittedAt: i === 1 || i === 7 ? at(-4, 8) : at(-6, 20),
        isLate: i === 1 || i === 7,
        score: 7 + (i % 3),
        returnedAt: i % 4 === 0 ? new Date() : null,
        versionNo: 1,
      }),
    ),
    // Vật lý: Khoa chưa nộp → quá hạn
    sub(0, lab.id, { status: "SUBMITTED", content: "Báo cáo.", submittedAt: at(-2, 20), versionNo: 1 }),
  ]);

  // Quiz: 8 em đã làm, tự chấm
  for (let i = 0; i < 8; i++) {
    const answers: Record<string, string[]> = {};
    qRows.forEach((q, qi) => {
      answers[q.id] = i % 3 === 0 && qi === 3 ? optionIds[qi].slice(0, 1) : optionIds[qi];
    });
    const score = i % 3 === 0 ? 7.5 : 10;
    const [row] = await db
      .insert(s.submissions)
      .values(sub(i, menhDe.id, { status: "RETURNED", quizAnswers: answers, submittedAt: at(-3, 20), score, returnedAt: at(-3, 20), versionNo: 1 }))
      .returning();
    await db.insert(s.gradeEvents).values({ submissionId: row.id, score, action: "AUTO" });
  }

  await db.insert(s.notifications).values([
    { recipientId: teacher.id, type: "SUBMISSION_RECEIVED", title: "Có bài nộp mới: Bài tập Hàm số bậc hai (10A1 · Toán)", href: `/teacher/grading/${hamSo.id}`, dedupeKey: `seed:1` },
    { recipientId: students[11].id, type: "ASSIGNMENT_CREATED", title: "Bài mới lớp 10A1 · Toán: Bài tập Hàm số bậc hai", href: `/student/assignments/${hamSo.id}`, dedupeKey: `seed:2` },
    { recipientId: students[11].id, type: "ASSIGNMENT_OVERDUE", title: "Đã quá hạn (10A1 · Vật lý): Báo cáo thí nghiệm con lắc đơn", href: `/student/assignments/${lab.id}`, dedupeKey: `seed:3` },
  ]);
  void vecto;

  console.log("Seed xong.");
  console.log("  Giáo viên: co.ha / thay.quang   Admin: admin");
  console.log("  Học sinh: tranminhkhoa, lehoanganh, … (maithao phải đổi mật khẩu lần đầu)");
  console.log("  Mật khẩu: giá trị SEED_PASSWORD trong .env");
  await client.end();
}

main().catch(async (e) => {
  console.error(e);
  await client.end();
  process.exit(1);
});

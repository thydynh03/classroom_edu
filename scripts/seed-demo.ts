/**
 * Tài khoản dùng thử có sẵn dữ liệu: GV demo.gv (4 lớp, bài tập, bài nộp) và HS demo.hs.
 * Chạy trong `vercel-build` sau migration, hoặc local: pnpm db:seed-demo.
 * Không xóa dữ liệu nào: đã có demo.gv thì bỏ qua. Tắt hẳn bằng SEED_DEMO="false".
 * Repo công khai nên chỉ lưu hash; mật khẩu nằm ở demo-accounts.local.md trên máy chủ dự án.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import { uuidv7 } from "uuidv7";
import * as s from "../src/server/db/schema";

const PASSWORD_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$gytpSckurqvfZ/1FHptefw$Mu6Sc0+jevgLlWajC4FkdNEWOV5wrXZtAj5yCCkOniA";

const day = 86400_000;
const now = Date.now();
/** Mốc thời gian tương đối theo giờ Việt Nam. */
const at = (days: number, h = 23, m = 59) => {
  const d = new Date(now + days * day);
  d.setUTCHours(h - 7, m, 0, 0);
  return d;
};

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const joinCode = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");

// [họ tên, username]; phần tử đầu là HS dùng thử demo.hs
const NAMES = [
  ["Trần Minh Khoa", "demo.hs"],
  ["Lê Hoàng Anh", "demo.lehoanganh"],
  ["Ngô Bảo Châu", "demo.ngobaochau"],
  ["Phạm Đức Duy", "demo.phamducduy"],
  ["Trần Gia Hân", "demo.trangiahan"],
  ["Vũ Khánh Linh", "demo.vukhanhlinh"],
  ["Hồ Minh Nhật", "demo.hominhnhat"],
  ["Đỗ Thanh Tâm", "demo.dothanhtam"],
  ["Quách Tường Vy", "demo.quachtuongvy"],
  ["Bùi Hải Nam", "demo.buihainam"],
  ["Hà Thu Phương", "demo.hathuphuong"],
  ["Mai Phương Thảo", "demo.maiphuongthao"],
  ["Nguyễn Quốc Bảo", "demo.nguyenquocbao"],
  ["Lý Gia Huy", "demo.lygiahuy"],
  ["Đặng Ngọc Mai", "demo.dangngocmai"],
  ["Phan Thành Đạt", "demo.phanthanhdat"],
  ["Võ Minh Thư", "demo.vominhthu"],
  ["Cao Tuấn Kiệt", "demo.caotuankiet"],
  ["Tạ Khánh Vy", "demo.takhanhvy"],
  ["Dương Anh Tú", "demo.duonganhtu"],
  ["Lâm Bảo Ngọc", "demo.lambaongoc"],
  ["Kiều Đức Thịnh", "demo.kieuducthinh"],
] as const;

async function main() {
  if (process.env.SEED_DEMO === "false") return console.log("[seed-demo] SEED_DEMO=false, bỏ qua");
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) return console.log("[seed-demo] Thiếu DATABASE_URL, bỏ qua");
  const client = postgres(url, { max: 1, prepare: false });
  const db = makeDb(client);
  try {
    const existing = await db.select({ id: s.users.id }).from(s.users).where(sql`lower(${s.users.username}) = 'demo.gv'`);
    if (existing.length) return console.log("[seed-demo] đã có tài khoản demo, bỏ qua");
    await db.transaction((tx) => seed(tx as unknown as DB));
    console.log("[seed-demo] xong: demo.gv, demo.hs");
  } finally {
    await client.end();
  }
}

const makeDb = (client: postgres.Sql) => drizzle(client, { schema: s });
type DB = ReturnType<typeof makeDb>;

async function seed(db: DB) {
  const [teacher] = await db
    .insert(s.users)
    .values({ username: "demo.gv", email: "demo.gv@classroom-edu.test", fullName: "Nguyễn Minh An", passwordHash: PASSWORD_HASH, role: "TEACHER", emailVerifiedAt: new Date() })
    .returning();
  const students = await db
    .insert(s.users)
    .values(NAMES.map(([fullName, username]) => ({ fullName, username, passwordHash: PASSWORD_HASH, role: "STUDENT" as const, createdBy: teacher.id })))
    .returning();

  const [c10a1, c10a2, c11b3, clb] = await db
    .insert(s.classes)
    .values([
      { name: "10A1 · Toán", subject: "Toán", color: "sky" as const },
      { name: "10A2 · Toán", subject: "Toán", color: "mint" as const },
      { name: "11B3 · Toán", subject: "Toán", color: "peach" as const },
      { name: "CLB Toán nâng cao", subject: "Toán", color: "lilac" as const },
    ].map((c) => ({ ...c, ownerId: teacher.id, schoolYear: "2026–2027", joinCode: joinCode() })))
    .returning();

  // 10A1: HS 0–11 · 10A2: HS 12–17 · 11B3: HS 18–21 · CLB: HS 0–3 và 18–19
  const roster = {
    [c10a1.id]: students.slice(0, 12),
    [c10a2.id]: students.slice(12, 18),
    [c11b3.id]: students.slice(18, 22),
    [clb.id]: [...students.slice(0, 4), ...students.slice(18, 20)],
  };
  await db.insert(s.classMembers).values([
    ...[c10a1, c10a2, c11b3, clb].map((c) => ({ classId: c.id, userId: teacher.id, role: "TEACHER" as const })),
    ...Object.entries(roster).flatMap(([classId, list]) => list.map((st) => ({ classId, userId: st.id, role: "STUDENT" as const }))),
  ]);

  const mk = (v: Partial<typeof s.assignments.$inferInsert> & { classId: string; title: string; dueAt: Date }) => ({
    groupId: uuidv7(),
    type: "WRITTEN" as const,
    body: "",
    status: "PUBLISHED" as const,
    publishedAt: new Date(v.dueAt.getTime() - 6 * day),
    createdBy: teacher.id,
    ...v,
  });
  const hamSoGroup = uuidv7();
  const hamSoBody =
    "Làm bài 1 đến 5 trang 42 SGK Đại số 10.\nVới mỗi hàm số, xác định đỉnh, trục đối xứng và vẽ đồ thị trên giấy kẻ ô.\n\nChụp rõ từng trang hoặc nộp một file PDF. Bài 5 là bài nâng cao, không bắt buộc.";
  const [hamSo, hamSo2, quiz, tapHop, kt15, batPt, tapHop2, vecto, tichVoHuong, hsg] = await db
    .insert(s.assignments)
    .values([
      mk({ classId: c10a1.id, groupId: hamSoGroup, title: "Bài tập Hàm số bậc hai", body: hamSoBody, dueAt: at(2) }),
      mk({ classId: c10a2.id, groupId: hamSoGroup, title: "Bài tập Hàm số bậc hai", body: hamSoBody, dueAt: at(2) }),
      mk({ classId: c10a1.id, title: "Quiz: Mệnh đề và tập hợp", type: "QUIZ", dueAt: at(-2, 21, 0), showResults: "IMMEDIATE" }),
      mk({ classId: c10a1.id, title: "Luyện tập Tập hợp", body: "Làm bài 1–6 trong phiếu luyện tập.", dueAt: at(-5) }),
      mk({ classId: c10a1.id, title: "Kiểm tra 15 phút: Bất phương trình", body: "Làm trên giấy, chụp ảnh nộp.", dueAt: at(-9, 10, 0) }),
      mk({ classId: c10a1.id, title: "Phiếu học tập Hệ bất phương trình", body: "Hoàn thành phiếu học tập, trình bày đầy đủ các bước.", dueAt: at(5), publishedAt: at(-1, 8, 0) }),
      mk({ classId: c10a2.id, title: "Luyện tập Tập hợp", body: "Làm bài 1–6 trong phiếu luyện tập.", dueAt: at(-4) }),
      mk({ classId: c11b3.id, title: "Phiếu học tập Vectơ", body: "Hoàn thành phiếu học tập Vectơ.", dueAt: at(4) }),
      mk({ classId: c11b3.id, title: "Tích vô hướng của hai vectơ", body: "Bài 1–4 trang 45 SGK Hình học 10.", dueAt: at(-3) }),
      mk({ classId: clb.id, title: "Đề luyện HSG số 4", body: "Làm trong 120 phút, trình bày đầy đủ.", dueAt: at(6, 20, 0) }),
    ])
    .returning();
  await db.insert(s.assignments).values(mk({ classId: c10a1.id, title: "Ôn tập chương 2", status: "DRAFT", publishedAt: null, dueAt: at(10) }));

  // Câu hỏi quiz
  const quizQs = [
    { prompt: "Mệnh đề nào sau đây là mệnh đề đúng?", type: "SINGLE" as const, opts: [["2 là số lẻ", false], ["√2 là số hữu tỉ", false], ["π > 3", true], ["1 + 1 = 3", false]] },
    { prompt: "Tập hợp A = {x ∈ ℕ | x < 3} có bao nhiêu phần tử?", type: "SINGLE" as const, opts: [["2", false], ["3", true], ["4", false]] },
    { prompt: "Mọi số nguyên tố đều là số lẻ.", type: "TRUE_FALSE" as const, opts: [["Đúng", false], ["Sai", true]] },
    { prompt: "Chọn các tập con của {1; 2}.", type: "MULTI" as const, opts: [["∅", true], ["{1}", true], ["{3}", false], ["{1; 2}", true]] },
  ];
  const answerKey: { questionId: string; correct: string[] }[] = [];
  for (const [i, q] of quizQs.entries()) {
    const [row] = await db.insert(s.questions).values({ assignmentId: quiz.id, type: q.type, prompt: q.prompt, points: 2.5, position: i }).returning();
    const opts = await db
      .insert(s.questionOptions)
      .values(q.opts.map(([label, isCorrect], j) => ({ questionId: row.id, label: label as string, isCorrect: isCorrect as boolean, position: j })))
      .returning();
    answerKey.push({ questionId: row.id, correct: opts.filter((o) => o.isCorrect).map((o) => o.id) });
  }

  const sub = (st: (typeof students)[number], assignmentId: string, v: Partial<typeof s.submissions.$inferInsert>) => ({ assignmentId, studentId: st.id, ...v });
  const done = (d: number, h: number) => ({ submittedAt: at(d, h, 14), versionNo: 1 });
  const [a1, a2, a3, a4, a5, a6, a7, a8, a9, a10] = roster[c10a1.id].slice(1);
  const g2 = roster[c10a2.id];
  const g3 = roster[c11b3.id];
  await db.insert(s.submissions).values([
    // Hàm số bậc hai 10A1 (còn 2 ngày): 4 bài chờ chấm, 1 đã chấm, 1 đã trả, 2 đang làm; demo.hs chưa bắt đầu
    sub(a1, hamSo.id, { status: "SUBMITTED", content: "Em nộp bài 1–4, bài 5 em làm được câu a ạ.", ...done(-1, 21) }),
    sub(a2, hamSo.id, { status: "SUBMITTED", content: "Bài làm của em ở phần dưới ạ.", ...done(-1, 22) }),
    sub(a3, hamSo.id, { status: "SUBMITTED", content: "Em gửi bài ạ.", ...done(-1, 20) }),
    sub(a4, hamSo.id, { status: "SUBMITTED", content: "Bài 1–5 đầy đủ.", ...done(0, 7) }),
    sub(a5, hamSo.id, { status: "GRADED", content: "Bài 1–5.", ...done(-2, 20), score: 8.5, feedback: "Trình bày rõ ràng, bài 4 thiếu bảng biến thiên." }),
    sub(a6, hamSo.id, { status: "RETURNED", content: "Bài làm đầy đủ.", ...done(-3, 19), score: 9, feedback: "Rất tốt!", returnedAt: at(-1, 9) }),
    sub(a7, hamSo.id, { status: "DRAFT", content: "Bài 1: đỉnh I(2; −1)…" }),
    sub(a8, hamSo.id, { status: "DRAFT", content: "" }),
    // Hàm số bậc hai 10A2
    sub(g2[0], hamSo2.id, { status: "SUBMITTED", content: "Em nộp bài ạ.", ...done(-1, 19) }),
    sub(g2[1], hamSo2.id, { status: "SUBMITTED", content: "Bài 1–4.", ...done(0, 6) }),
    sub(g2[2], hamSo2.id, { status: "GRADED", content: "Bài 1–5.", ...done(-2, 21), score: 7.5, feedback: "Cần vẽ đồ thị cẩn thận hơn." }),
    // Luyện tập Tập hợp 10A1 (đã quá hạn): đủ trạng thái cho heatmap; demo.hs đã được trả điểm
    sub(students[0], tapHop.id, { status: "RETURNED", content: "Bài 1–6.", ...done(-6, 20), score: 8.5, feedback: "Bài 5 lập luận tốt. Xem lại cách viết tập hợp ở bài 2.", returnedAt: at(-3, 8) }),
    ...[a1, a2, a3, a4, a5, a6, a7, a8, a9].map((st, i) =>
      sub(st, tapHop.id, {
        status: i % 3 === 0 ? "RETURNED" : "GRADED",
        content: "Bài làm luyện tập.",
        ...done(i === 1 || i === 6 ? -4 : -6, i === 1 || i === 6 ? 8 : 20),
        isLate: i === 1 || i === 6,
        score: 6.5 + (i % 4),
        returnedAt: i % 3 === 0 ? at(-3, 8) : null,
      }),
    ),
    // Kiểm tra 15 phút (9 ngày trước): gần như đủ, đã trả hết
    ...[students[0], a1, a2, a3, a4, a5, a6, a7, a8, a9, a10].map((st, i) =>
      sub(st, kt15.id, { status: "RETURNED", content: "Bài kiểm tra.", ...done(-9, 9), score: [9, 7, 8, 6.5, 10, 8, 7.5, 9, 5.5, 8, 7][i], returnedAt: at(-7, 8) }),
    ),
    // Phiếu Hệ bất phương trình (còn 5 ngày): demo.hs đang có nháp
    sub(students[0], batPt.id, { status: "DRAFT", content: "Bài 1: miền nghiệm là nửa mặt phẳng…" }),
    sub(a1, batPt.id, { status: "SUBMITTED", content: "Em nộp sớm ạ.", ...done(0, 6) }),
    sub(a3, batPt.id, { status: "SUBMITTED", content: "Bài làm phiếu học tập.", ...done(-1, 22) }),
    // Luyện tập Tập hợp 10A2 (quá hạn): 4/6 đã nộp, 1 trễ
    ...g2.slice(0, 4).map((st, i) =>
      sub(st, tapHop2.id, { status: i < 2 ? "RETURNED" : "GRADED", content: "Bài làm.", ...done(i === 3 ? -3 : -5, 20), isLate: i === 3, score: 7 + i, returnedAt: i < 2 ? at(-2, 8) : null }),
    ),
    // 11B3
    sub(g3[0], vecto.id, { status: "SUBMITTED", content: "Em nộp phiếu ạ.", ...done(-1, 20) }),
    sub(g3[1], vecto.id, { status: "DRAFT", content: "" }),
    sub(g3[0], tichVoHuong.id, { status: "GRADED", content: "Bài 1–4.", ...done(-4, 20), score: 9 }),
    sub(g3[1], tichVoHuong.id, { status: "GRADED", content: "Bài 1–4.", ...done(-4, 21), score: 7.5 }),
    sub(g3[2], tichVoHuong.id, { status: "SUBMITTED", content: "Em nộp trễ ạ.", ...done(-2, 7), isLate: true }),
    // CLB
    sub(students[18], hsg.id, { status: "SUBMITTED", content: "Bài làm đề số 4.", ...done(-1, 21) }),
  ]);

  // Quiz: 9 em đã làm (có demo.hs), tự chấm
  for (const [i, st] of [students[0], a1, a2, a3, a4, a5, a6, a7, a9].entries()) {
    const wrongLast = i % 3 === 1;
    const answers = Object.fromEntries(answerKey.map((k, qi) => [k.questionId, wrongLast && qi === 3 ? k.correct.slice(0, 1) : k.correct]));
    const score = wrongLast ? 7.5 : 10;
    const [row] = await db
      .insert(s.submissions)
      .values(sub(st, quiz.id, { status: "RETURNED", quizAnswers: answers, ...done(-3, 20), score, returnedAt: at(-3, 20) }))
      .returning();
    await db.insert(s.gradeEvents).values({ submissionId: row.id, score, action: "AUTO" });
  }

  const key = (n: number) => `demo:${teacher.id}:${n}`;
  await db.insert(s.notifications).values([
    { recipientId: teacher.id, type: "SUBMISSION_RECEIVED", title: "Có bài nộp mới: Bài tập Hàm số bậc hai (10A1 · Toán)", href: `/teacher/grading/${hamSo.id}`, dedupeKey: key(1) },
    { recipientId: teacher.id, type: "SUBMISSION_RECEIVED", title: "Có bài nộp mới: Tích vô hướng của hai vectơ (11B3 · Toán)", href: `/teacher/grading/${tichVoHuong.id}`, dedupeKey: key(2) },
    { recipientId: students[0].id, type: "ASSIGNMENT_CREATED", title: "Bài mới lớp 10A1 · Toán: Phiếu học tập Hệ bất phương trình", href: `/student/assignments/${batPt.id}`, dedupeKey: key(3) },
    { recipientId: students[0].id, type: "ASSIGNMENT_RETURNED", title: "Đã trả bài: Luyện tập Tập hợp (8,5/10)", href: `/student/assignments/${tapHop.id}`, dedupeKey: key(4) },
    { recipientId: students[0].id, type: "ASSIGNMENT_DUE_SOON", title: "Sắp đến hạn: Bài tập Hàm số bậc hai (10A1 · Toán)", href: `/student/assignments/${hamSo.id}`, dedupeKey: key(5) },
  ]);
}

main().catch((e) => {
  // Không chặn deploy khi seed demo lỗi; chỉ ghi log (không có dữ liệu nhạy cảm).
  console.error("[seed-demo] lỗi:", e instanceof Error ? e.message : e);
});

/** H6 (nhập đề, sổ điểm, thống kê câu hỏi — đều là tính năng nâng cao) + tài liệu lớp. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, inject, it } from "vitest";
import { uuidv7 } from "uuidv7";
import { sql } from "drizzle-orm";

process.env.DATABASE_URL = inject("dbUrl");

type Actor = { id: string; role: "ADMIN" | "TEACHER" | "STUDENT"; fullName: string; username: string; mustChangePassword: boolean; sessionId: string };
const actor = (id: string, role: Actor["role"], fullName: string = role): Actor => ({ id, role, fullName, username: id.slice(0, 8), mustChangePassword: false, sessionId: uuidv7() });
const is404 = (p: Promise<unknown>) =>
  expect(p).rejects.toSatisfy((e: unknown) => String((e as { digest?: string }).digest ?? "").includes("404"));

const mod = async () => ({
  db: await import("@/server/db/client"),
  s: await import("@/server/db/schema"),
  classes: await import("@/server/services/classes"),
  asg: await import("@/server/services/assignments"),
  subs: await import("@/server/services/submissions"),
  imp: await import("@/server/services/quiz-import"),
  gb: await import("@/server/services/gradebook"),
  up: await import("@/server/services/upgrades"),
  mat: await import("@/server/services/materials"),
  files: await import("@/server/services/files"),
});
let m: Awaited<ReturnType<typeof mod>>;
let admin: Actor, gv: Actor, gv2: Actor, hs1: Actor, hs2: Actor, hsOther: Actor;
let lop: string, lop2: string, quiz: string, written: string;

beforeAll(async () => {
  m = await mod();
  const { db } = m.db;
  const mk = async (username: string, role: "TEACHER" | "STUDENT") => {
    const [u] = await db.insert(m.s.users).values({ username, fullName: username, passwordHash: "x", role }).returning();
    return actor(u.id, role, username);
  };
  gv = await mk("ft.gv", "TEACHER");
  gv2 = await mk("ft.gv2", "TEACHER");
  hs1 = await mk("ft.hs1", "STUDENT");
  hs2 = await mk("ft.hs2", "STUDENT");
  hsOther = await mk("ft.hsx", "STUDENT");
  admin = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.allow_admin_insert', 'on', true)`);
    const [a] = await tx.insert(m.s.users).values({ username: "ft.admin", fullName: "Admin", passwordHash: "x", role: "ADMIN" }).returning();
    return actor(a.id, "ADMIN");
  });
  lop = (await m.classes.createClass(gv, { name: "FT", subject: "Toán", color: "sky" })).id;
  lop2 = (await m.classes.createClass(gv2, { name: "FT2", subject: "Văn", color: "mint" })).id;
  await m.classes.joinClass(hs1.id, lop);
  await m.classes.joinClass(hs2.id, lop);
  await m.classes.joinClass(hsOther.id, lop2);
  const base = { classIds: [lop], body: "", allowLate: true, allowResubmit: true, showResults: "IMMEDIATE" as const, attachmentIds: [] };
  [quiz] = await m.asg.createAssignment(gv, { ...base, type: "QUIZ", title: "Quiz FT", maxPoints: 10, dueAt: new Date(Date.now() + 86400_000) });
  [written] = await m.asg.createAssignment(gv, { ...base, type: "WRITTEN", title: "Tự luận FT", maxPoints: 20, dueAt: new Date(Date.now() + 86400_000) });
  await m.asg.publishAssignment(gv, written);
});

describe("nhập đề Word/Excel", () => {
  it("chưa mở khóa thì bị chặn ở server; GV lớp khác 404", async () => {
    await expect(m.imp.importQuiz(gv, quiz, { text: "Câu 1: x\nA. a\nB. b\nĐáp án: A" })).rejects.toThrow(/tính năng nâng cao/);
    await is404(m.imp.importQuiz(gv2, quiz, { text: "Câu 1: x" }));
  });

  it("đã mở khóa: tách từ văn bản, .docx (in đậm/gạch chân) và .xlsx", async () => {
    await m.up.grantFeature(admin, { username: "ft.gv", featureKey: "QUIZ_IMPORT", months: 1 });
    const t = await m.imp.importQuiz(gv, quiz, { text: "Câu 1: 1+1?\nA. 1\nB. 2\nĐáp án: B" });
    expect(t.questions).toHaveLength(1);
    const docx = readFileSync(path.resolve(__dirname, "../fixtures/quiz-sample.docx"));
    const d = await m.imp.importQuiz(gv, quiz, { file: { name: "de.docx", bytes: docx } });
    expect(d.warnings).toEqual([]);
    expect(d.questions).toHaveLength(2);
    expect(d.questions[0].options.map((o) => o.isCorrect)).toEqual([false, true, false]);
    expect(d.questions[1]).toMatchObject({ type: "MULTI", points: 2 });
    const { default: writeXlsxFile } = await import("write-excel-file/node");
    const xlsx = await writeXlsxFile(
      [
        ["Câu hỏi", "A", "B", "C", "Đáp án"].map((value) => ({ value })),
        [{ value: "Số nguyên tố nhỏ nhất?" }, { value: "1" }, { value: "2" }, { value: "3" }, { value: "B" }],
      ],
      {},
    ).toBuffer();
    const x = await m.imp.importQuiz(gv, quiz, { file: { name: "de.xlsx", bytes: xlsx } });
    expect(x.questions[0].options[1].isCorrect).toBe(true);
  });

  it("từ chối file không phải docx/xlsx thật", async () => {
    await expect(m.imp.importQuiz(gv, quiz, { file: { name: "de.docx", bytes: Buffer.from("not a zip") } })).rejects.toThrow(/Chỉ nhận file/);
    await expect(m.imp.importQuiz(gv, written, { text: "Câu 1: x" })).rejects.toThrow(/không phải trắc nghiệm/);
  });
});

describe("sổ điểm và thống kê câu hỏi", () => {
  beforeAll(async () => {
    await m.asg.saveQuestions(gv, quiz, [
      { type: "SINGLE", prompt: "1+1?", points: 1, options: [{ label: "2", isCorrect: true }, { label: "3", isCorrect: false }] },
      { type: "SINGLE", prompt: "2+2?", points: 1, options: [{ label: "4", isCorrect: true }, { label: "5", isCorrect: false }] },
    ]);
    await m.asg.publishAssignment(gv, quiz);
    const qs = await m.asg.questionsWithOptions(quiz, true);
    await m.subs.submitQuiz(hs1, quiz, { [qs[0].id]: [qs[0].options[0].id], [qs[1].id]: [qs[1].options[0].id] }); // 10
    await m.subs.submitQuiz(hs2, quiz, { [qs[0].id]: [qs[0].options[0].id], [qs[1].id]: [qs[1].options[1].id] }); // 5
    await m.subs.submitWritten(hs1, written, "Bài", []);
    const roster = await m.subs.assignmentRoster(gv, written);
    await m.subs.saveGrade(gv, roster.roster.find((r) => r.studentId === hs1.id)!.submissionId!, { score: 16, feedback: "", returnNow: false }); // 8/10
  });

  it("chưa mở khóa thì bị chặn", async () => {
    await expect(m.gb.classGradebook(gv, lop)).rejects.toThrow(/tính năng nâng cao/);
    await expect(m.gb.quizAnalytics(gv, quiz)).rejects.toThrow(/tính năng nâng cao/);
    await expect(m.gb.setGradeWeight(gv, written, 2)).rejects.toThrow(/tính năng nâng cao/);
  });

  it("sổ điểm: thang 10, trung bình có hệ số; GV lớp khác 404", async () => {
    await m.up.grantFeature(admin, { username: "ft.gv", featureKey: "GRADEBOOK", months: 1 });
    await is404(m.gb.classGradebook(gv2, lop));
    await m.gb.setGradeWeight(gv, written, 2);
    await expect(m.gb.setGradeWeight(gv, written, 5)).rejects.toThrow(/1, 2 hoặc 3/);
    const gb = await m.gb.classGradebook(gv, lop);
    const r1 = gb.rows.find((r) => r.id === hs1.id)!;
    const iQuiz = gb.cols.findIndex((c) => c.id === quiz);
    const iWritten = gb.cols.findIndex((c) => c.id === written);
    expect(r1.cells[iQuiz].score10).toBe(10);
    expect(r1.cells[iWritten].score10).toBe(8);
    expect(r1.average).toBe(Math.round(((10 * 1 + 8 * 2) / 3) * 100) / 100);
    const r2 = gb.rows.find((r) => r.id === hs2.id)!;
    expect(r2.cells[iQuiz].score10).toBe(5);
    expect(r2.cells[iWritten].state).toBe("open");
  });

  it("thống kê: tỉ lệ đúng từng câu, số em chọn từng phương án", async () => {
    await m.up.grantFeature(admin, { username: "ft.gv", featureKey: "QUIZ_ANALYTICS", months: 1 });
    await is404(m.gb.quizAnalytics(gv2, quiz));
    const st = await m.gb.quizAnalytics(gv, quiz);
    expect(st.submitted).toBe(2);
    expect(st.questions[0].rate).toBe(1);
    expect(st.questions[1].rate).toBe(0.5);
    expect(st.questions[1].options.map((o) => o.picked)).toEqual([1, 1]);
    expect(st.average10).toBe(7.5);
  });
});

describe("tài liệu lớp", () => {
  it("GV đăng, HS trong lớp xem và tải được file; HS/GV lớp khác 404", async () => {
    const [f] = await m.db.db
      .insert(m.s.files)
      .values({ uploaderId: gv.id, purpose: "ATTACHMENT", classId: lop, storageKey: `att/${lop}/${uuidv7()}`, originalName: "de-cuong.pdf", mime: "application/pdf", sizeBytes: 100, status: "READY" })
      .returning();
    await is404(m.mat.createMaterial(gv2, lop, { title: "X", body: "", attachmentIds: [] }));
    await is404(m.mat.createMaterial(hs1, lop, { title: "X", body: "", attachmentIds: [] }));
    const id = await m.mat.createMaterial(gv, lop, { title: "Đề cương ôn tập", body: "Ôn chương 1", attachmentIds: [f.id] });
    const list = await m.mat.listMaterialsForStudent(hs1, lop);
    expect(list.map((x) => x.id)).toContain(id);
    expect(list[0].files.map((x) => x.id)).toContain(f.id);
    await is404(m.mat.listMaterialsForStudent(hsOther, lop));
    expect(typeof (await m.files.downloadUrl(hs1, f.id, false))).toBe("string");
    await is404(m.files.downloadUrl(hsOther, f.id, false));
    await is404(m.mat.deleteMaterial(gv2, id));
    await m.mat.deleteMaterial(gv, id);
    expect(await m.mat.listMaterials(gv, lop)).toHaveLength(0);
  });
});

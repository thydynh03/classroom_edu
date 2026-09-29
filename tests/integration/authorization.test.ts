/**
 * Integration test phân quyền trên Postgres thật (Testcontainers).
 * 5 actor: GV của lớp, GV lớp khác, HS trong lớp, HS lớp khác (+ chưa đăng nhập được chặn ở layout/route).
 */
import { beforeAll, describe, expect, inject, it } from "vitest";
import { uuidv7 } from "uuidv7";

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
  policy: await import("@/server/policy"),
  classes: await import("@/server/services/classes"),
  asg: await import("@/server/services/assignments"),
  subs: await import("@/server/services/submissions"),
  files: await import("@/server/services/files"),
  notif: await import("@/server/services/notifications"),
  admin: await import("@/server/services/admin"),
});
let m: Awaited<ReturnType<typeof mod>>;

const actor = (id: string, role: Actor["role"]): Actor => ({
  id,
  role,
  fullName: role,
  username: id.slice(0, 8),
  mustChangePassword: false,
  sessionId: uuidv7(),
});

let teacherA: Actor, teacherB: Actor, studentA: Actor, studentB: Actor;
let classA: string, classB: string;
let written: string, quiz: string, draft: string, strict: string;

const is404 = (p: Promise<unknown>) =>
  expect(p).rejects.toSatisfy((e: unknown) => String((e as { digest?: string }).digest ?? "").includes("404"));

beforeAll(async () => {
  m = await mod();
  const { db } = m.db;
  const s = m.schema;
  const mk = async (username: string, role: "TEACHER" | "STUDENT") => {
    const [u] = await db
      .insert(s.users)
      .values({ username, fullName: username, passwordHash: "x", role, emailVerifiedAt: new Date() })
      .returning();
    return actor(u.id, role);
  };
  teacherA = await mk("gv.a", "TEACHER");
  teacherB = await mk("gv.b", "TEACHER");
  studentA = await mk("hs.a", "STUDENT");
  studentB = await mk("hs.b", "STUDENT");
  classA = (await m.classes.createClass(teacherA, { name: "Lớp A", subject: "Toán", color: "sky" })).id;
  classB = (await m.classes.createClass(teacherB, { name: "Lớp B", subject: "Văn", color: "mint" })).id;
  await m.classes.joinClass(studentA.id, classA);
  await m.classes.joinClass(studentB.id, classB);

  const base = {
    classIds: [classA],
    title: "Bài",
    body: "",
    maxPoints: 10,
    dueAt: new Date(Date.now() + 86400_000),
    allowLate: true,
    allowResubmit: true,
    showResults: "MANUAL" as const,
    attachmentIds: [],
  };
  [written] = await m.asg.createAssignment(teacherA, { ...base, type: "WRITTEN", title: "Tự luận" });
  await m.asg.publishAssignment(teacherA, written);
  [draft] = await m.asg.createAssignment(teacherA, { ...base, type: "WRITTEN", title: "Nháp" });
  [strict] = await m.asg.createAssignment(teacherA, {
    ...base,
    type: "WRITTEN",
    title: "Không nhận trễ",
    allowLate: false,
    dueAt: new Date(Date.now() - 3600_000),
  });
  await m.asg.publishAssignment(teacherA, strict);
  [quiz] = await m.asg.createAssignment(teacherA, { ...base, type: "QUIZ", title: "Quiz", showResults: "IMMEDIATE" });
  await m.asg.saveQuestions(teacherA, quiz, [
    { type: "SINGLE", prompt: "1+1?", points: 1, options: [{ label: "2", isCorrect: true }, { label: "3", isCorrect: false }] },
    { type: "TRUE_FALSE", prompt: "Trời xanh", points: 1, options: [{ label: "Đúng", isCorrect: true }, { label: "Sai", isCorrect: false }] },
  ]);
  await m.asg.publishAssignment(teacherA, quiz);
});

describe("cách ly lớp học", () => {
  it("GV lớp khác không xem được lớp / bài / danh sách HS", async () => {
    await is404(m.policy.requireTeacherOfClass(teacherB, classA));
    await is404(m.subs.assignmentRoster(teacherB, written));
    await is404(m.classes.listClassStudents(teacherB, classA));
    await is404(m.classes.bulkCreateStudents(teacherB, classA, ["Kẻ Lạ"]));
  });

  it("HS lớp khác không xem được bài", async () => {
    await is404(m.subs.getStudentAssignment(studentB, written));
  });

  it("HS không thấy bài nháp", async () => {
    await is404(m.subs.getStudentAssignment(studentA, draft));
  });

  it("HS không vào được API của GV dù đoán đúng id", async () => {
    await is404(m.policy.requireTeacherOfClass(studentA, classA));
    await is404(m.asg.publishAssignment(studentA, draft));
  });

  it("id không phải UUID → 404, không lỗi SQL", async () => {
    await is404(m.subs.getStudentAssignment(studentA, "' or 1=1 --"));
  });

  it("HS chỉ thấy tên bạn cùng lớp, không thấy username/email", async () => {
    const names = await m.classes.listClassmateNames(studentA, classA);
    expect(names).toEqual(["hs.a"]);
  });
});

describe("quiz", () => {
  it("không lộ đáp án trước khi nộp", async () => {
    const v = await m.subs.getStudentAssignment(studentA, quiz);
    expect(v.questions.length).toBe(2);
    expect(JSON.stringify(v.questions)).not.toContain("isCorrect");
  });

  it("chấm tự động và chỉ nộp một lần", async () => {
    const before = await m.subs.getStudentAssignment(studentA, quiz);
    const answers: Record<string, string[]> = {};
    for (const q of before.questions) answers[q.id] = [q.options[0].id];
    await m.subs.submitQuiz(studentA, quiz, answers);
    const after = await m.subs.getStudentAssignment(studentA, quiz);
    expect(after.submission?.score).toBe(10);
    expect(after.resultsVisible).toBe(true);
    await expect(m.subs.submitQuiz(studentA, quiz, answers)).rejects.toThrow(/không sửa được/);
  });
});

describe("nộp và chấm bài", () => {
  let submissionId = "";

  it("không nộp bài rỗng", async () => {
    await expect(m.subs.submitWritten(studentA, written, "  ", [])).rejects.toThrow(/trống/);
  });

  it("nộp bài, không bị đánh dấu trễ khi còn hạn", async () => {
    await m.subs.submitWritten(studentA, written, "Bài làm của em", []);
    const v = await m.subs.getStudentAssignment(studentA, written);
    expect(v.submission?.status).toBe("SUBMITTED");
    expect(v.submission?.isLate).toBe(false);
    submissionId = v.submission!.id;
  });

  it("chặn nộp sau hạn khi GV không nhận bài trễ", async () => {
    await expect(m.subs.submitWritten(studentA, strict, "muộn", [])).rejects.toThrow(/quá hạn/);
  });

  it("GV lớp khác không chấm được (IDOR)", async () => {
    await is404(m.subs.saveGrade(teacherB, submissionId, { score: 1, feedback: "", returnNow: true }));
    await is404(m.subs.submissionDetailForTeacher(teacherB, submissionId));
  });

  it("không cho điểm vượt thang", async () => {
    await expect(m.subs.saveGrade(teacherA, submissionId, { score: 11, feedback: "", returnNow: false })).rejects.toThrow(/tối đa/);
  });

  it("điểm nháp không lộ cho HS, trả bài thì lộ + có thông báo + lịch sử", async () => {
    await m.subs.saveGrade(teacherA, submissionId, { score: 8.5, feedback: "Tốt", returnNow: false });
    let v = await m.subs.getStudentAssignment(studentA, written);
    expect(v.submission?.score).toBeNull();
    expect(v.submission?.feedback).toBeNull();

    await m.subs.saveGrade(teacherA, submissionId, { score: 9, feedback: "Rất tốt", returnNow: true });
    v = await m.subs.getStudentAssignment(studentA, written);
    expect(v.submission?.score).toBe(9);
    expect(v.submission?.feedback).toBe("Rất tốt");

    const detail = await m.subs.submissionDetailForTeacher(teacherA, submissionId);
    expect(detail.history.map((h) => h.action).sort()).toEqual(["GRADED", "RETURNED"]);
    const notes = await m.notif.listNotifications(studentA.id);
    expect(notes.some((n) => n.type === "ASSIGNMENT_RETURNED")).toBe(true);
  });

  it("một HS chỉ có một bài nộp mỗi bài tập", async () => {
    const { db } = m.db;
    await expect(
      db.insert(m.schema.submissions).values({ assignmentId: written, studentId: studentA.id }),
    ).rejects.toThrow();
  });
});

describe("file", () => {
  it("HS lớp khác không tải được file bài nộp", async () => {
    const { db } = m.db;
    const [f] = await db
      .insert(m.schema.files)
      .values({
        uploaderId: studentA.id,
        purpose: "SUBMISSION",
        classId: classA,
        storageKey: `sub/test/${uuidv7()}`,
        originalName: "bai.pdf",
        mime: "application/pdf",
        sizeBytes: 10,
        status: "READY",
      })
      .returning();
    await is404(m.files.downloadUrl(studentB, f.id, false));
    await is404(m.files.downloadUrl(teacherB, f.id, false));
  });

  it("chặn upload loại file nguy hiểm", async () => {
    await expect(
      m.files.createUpload(studentA, { purpose: "SUBMISSION", contextId: written, name: "x.html", mime: "text/html", size: 10 }),
    ).rejects.toThrow(/không được phép/);
    await expect(
      m.files.createUpload(studentA, { purpose: "SUBMISSION", contextId: written, name: "x.pdf", mime: "application/pdf", size: 100 * 1024 * 1024 }),
    ).rejects.toThrow(/quá lớn/);
  });

  it("HS không upload được tài liệu GV", async () => {
    await is404(m.files.createUpload(studentA, { purpose: "ATTACHMENT", contextId: classA, name: "x.pdf", mime: "application/pdf", size: 10 }));
  });
});

describe("thông báo và tài khoản", () => {
  it("thông báo trùng dedupe_key bị bỏ qua", async () => {
    const { db } = m.db;
    const item = { recipientId: studentA.id, type: "ASSIGNMENT_CREATED" as const, title: "x", href: "/", dedupeKey: "k1" };
    await m.notif.notify(db, [item]);
    await m.notif.notify(db, [item]);
    const list = await m.notif.listNotifications(studentA.id);
    expect(list.filter((n) => n.dedupeKey === "k1").length).toBe(1);
  });

  it("tạo HS hàng loạt: username bỏ dấu, không trùng, bắt đổi mật khẩu", async () => {
    const created = await m.classes.bulkCreateStudents(teacherA, classA, ["Lê Hoàng Anh", "Lê Hoàng Anh"]);
    expect(created.map((c) => c.username)).toEqual(["lehoanganh", "lehoanganh2"]);
    const students = await m.classes.listClassStudents(teacherA, classA);
    const la = students.find((s) => s.username === "lehoanganh");
    expect(la?.mustChangePassword).toBe(true);
  });
});

describe("lên lịch đăng bài", () => {
  it("bài đã lên lịch: HS chưa thấy; tới giờ job đăng + thông báo; không đăng trùng", async () => {
    const [id] = await m.asg.createAssignment(teacherA, {
      classIds: [classA],
      type: "WRITTEN",
      title: "Lên lịch",
      body: "",
      maxPoints: 10,
      dueAt: new Date(Date.now() + 3 * 86400_000),
      allowLate: true,
      allowResubmit: true,
      showResults: "MANUAL",
      attachmentIds: [],
    });
    await expect(m.asg.scheduleAssignment(teacherA, id, new Date(Date.now() - 1000))).rejects.toThrow(/tương lai/);
    await expect(m.asg.scheduleAssignment(teacherA, id, new Date(Date.now() + 5 * 86400_000))).rejects.toThrow(/trước hạn nộp/);
    await is404(m.asg.scheduleAssignment(teacherB, id, new Date(Date.now() + 3600_000)));

    await m.asg.scheduleAssignment(teacherA, id, new Date(Date.now() + 3600_000));
    await is404(m.subs.getStudentAssignment(studentA, id));
    expect(await m.asg.publishDueScheduled(new Date())).toBe(0);

    const later = new Date(Date.now() + 2 * 3600_000);
    const [a, b] = await Promise.all([m.asg.publishDueScheduled(later), m.asg.publishDueScheduled(later)]);
    expect(a + b).toBe(1);
    const v = await m.subs.getStudentAssignment(studentA, id);
    expect(v.a.status).toBe("PUBLISHED");
    const notes = await m.notif.listNotifications(studentA.id);
    expect(notes.filter((n) => n.href.endsWith(id)).length).toBe(1);
  });
});

describe("quản trị", () => {
  let adminActor: Actor;
  beforeAll(async () => {
    const [u] = await m.db.db
      .insert(m.schema.users)
      .values({ username: "quan.tri", fullName: "Admin", passwordHash: "x", role: "ADMIN" })
      .returning();
    adminActor = actor(u.id, "ADMIN");
  });

  it("chỉ ADMIN dùng được", async () => {
    await is404(m.admin.listUsers(teacherA, {}));
    await is404(m.admin.setUserStatus(studentA, teacherB.id, "LOCKED"));
  });

  it("khóa/mở khóa, không tự khóa mình, có audit", async () => {
    await expect(m.admin.setUserStatus(adminActor, adminActor.id, "LOCKED")).rejects.toThrow(/chính mình/);
    await m.admin.setUserStatus(adminActor, studentB.id, "LOCKED");
    let list = await m.admin.listUsers(adminActor, { q: "hs.b" });
    expect(list.rows[0].status).toBe("LOCKED");
    await m.admin.setUserStatus(adminActor, studentB.id, "ACTIVE");
    list = await m.admin.listUsers(adminActor, { q: "hs.b" });
    expect(list.rows[0].status).toBe("ACTIVE");
    const log = await m.admin.recentAudit(adminActor);
    expect(log.some((l) => l.action === "user.status.locked")).toBe(true);
  });

  it("tìm kiếm không phân biệt dấu và không bị chèn ký tự LIKE", async () => {
    const r = await m.admin.listUsers(adminActor, { q: "%" });
    expect(r.rows.every((u) => u.username.includes("%") || u.fullName.includes("%") || (u.email ?? "").includes("%"))).toBe(true);
  });

  it("tạo giáo viên: trùng username bị chặn", async () => {
    const pw = await m.admin.createTeacher(adminActor, { fullName: "Cô Mới", username: "co.moi", email: "moi@example.com" });
    expect(pw.length).toBeGreaterThanOrEqual(10);
    await expect(m.admin.createTeacher(adminActor, { fullName: "X", username: "co.moi", email: "x@example.com" })).rejects.toThrow(/đã được dùng/);
  });

  it("GV tự đăng ký chờ duyệt: chỉ ADMIN duyệt, duyệt xong rời danh sách chờ và có thông báo", async () => {
    const [u] = await m.db.db
      .insert(m.schema.users)
      .values({ username: "gv.cho", fullName: "GV Chờ", passwordHash: "x", role: "TEACHER" })
      .returning();
    expect((await m.admin.listPendingTeachers(adminActor)).map((p) => p.id)).toContain(u.id);
    await is404(m.admin.listPendingTeachers(teacherA));
    await is404(m.admin.approveTeacher(teacherA, u.id));
    await is404(m.admin.approveTeacher(adminActor, studentA.id));
    await m.admin.approveTeacher(adminActor, u.id);
    await m.admin.approveTeacher(adminActor, u.id); // gọi lại không lỗi, không thông báo trùng
    expect((await m.admin.listPendingTeachers(adminActor)).map((p) => p.id)).not.toContain(u.id);
    const notes = await m.notif.listNotifications(u.id);
    expect(notes.filter((n) => n.type === "TEACHER_APPROVED")).toHaveLength(1);
  });
});

describe("cấp lại mật khẩu hàng loạt", () => {
  it("chỉ GV của lớp, chỉ HS đang ở lớp; có id lạ thì không đổi gì", async () => {
    await is404(m.classes.resetStudentPasswords(teacherB, classA, [studentA.id]));
    await is404(m.classes.resetStudentPasswords(studentA, classA, [studentA.id]));
    await is404(m.classes.resetStudentPasswords(teacherA, classA, [studentA.id, studentB.id]));
    const out = await m.classes.resetStudentPasswords(teacherA, classA, [studentA.id]);
    expect(out).toHaveLength(1);
    expect(out[0].tempPassword.length).toBeGreaterThanOrEqual(8);
    const list = await m.classes.listClassStudents(teacherA, classA);
    expect(list.find((s) => s.id === studentA.id)?.mustChangePassword).toBe(true);
  });
});

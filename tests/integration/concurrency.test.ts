/**
 * H1: request song song, hàng đợi email (gộp + hạn mức), thống kê, dọn dẹp.
 */
import { beforeAll, describe, expect, inject, it, vi } from "vitest";
import { uuidv7 } from "uuidv7";
import { and, eq, sql } from "drizzle-orm";

process.env.DATABASE_URL = inject("dbUrl");

const sentMails: { to: string; subject: string; text: string; kind: string }[] = [];
vi.mock("@/server/mail", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/mail")>();
  return {
    ...actual,
    // Không có SMTP trong test: ghi lại email và đếm hạn mức giống sendMail thật.
    sendMail: async (to: string, subject: string, text: string, kind: "transactional" | "admin" | "reminder" = "transactional") => {
      if ((await actual.emailBudget(kind)) <= 0) return false;
      const { db } = await import("@/server/db/client");
      const { emailSends } = await import("@/server/db/schema");
      await db
        .insert(emailSends)
        .values({ day: actual.vnDayKey(), kind, count: 1 })
        .onConflictDoUpdate({ target: [emailSends.day, emailSends.kind], set: { count: sql`${emailSends.count} + 1` } });
      sentMails.push({ to, subject, text, kind });
      return true;
    },
  };
});

type Actor = { id: string; role: "ADMIN" | "TEACHER" | "STUDENT"; fullName: string; username: string; mustChangePassword: boolean; sessionId: string };
const actor = (id: string, role: Actor["role"], fullName: string = role): Actor => ({ id, role, fullName, username: id.slice(0, 8), mustChangePassword: false, sessionId: uuidv7() });

const mod = async () => ({
  db: await import("@/server/db/client"),
  schema: await import("@/server/db/schema"),
  classes: await import("@/server/services/classes"),
  asg: await import("@/server/services/assignments"),
  subs: await import("@/server/services/submissions"),
  notif: await import("@/server/services/notifications"),
  mail: await import("@/server/mail"),
  rl: await import("@/server/rate-limit"),
  maint: await import("@/server/jobs/maintenance"),
});
let m: Awaited<ReturnType<typeof mod>>;
let gv: Actor, gv2: Actor, hs1: Actor, hs2: Actor, hs3: Actor;
let lop: string, lop2: string, quiz: string, written: string;

/** 10:00 sáng giờ VN hôm nay (ngoài giờ yên tĩnh). */
const vnMorning = () => new Date(`${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date())}T10:00:00+07:00`);

beforeAll(async () => {
  m = await mod();
  const { db } = m.db;
  const s = m.schema;
  const mk = async (username: string, role: "TEACHER" | "STUDENT", email?: string) => {
    const [u] = await db.insert(s.users).values({ username, fullName: username, passwordHash: "x", role, email }).returning();
    return actor(u.id, role, username);
  };
  gv = await mk("cc.gv", "TEACHER");
  gv2 = await mk("cc.gv2", "TEACHER");
  hs1 = await mk("cc.hs1", "STUDENT", "hs1@example.com");
  hs2 = await mk("cc.hs2", "STUDENT", "hs2@example.com");
  hs3 = await mk("cc.hs3", "STUDENT", "hs3@example.com");
  lop = (await m.classes.createClass(gv, { name: "CC", subject: "Toán", color: "sky" })).id;
  lop2 = (await m.classes.createClass(gv2, { name: "CC2", subject: "Văn", color: "mint" })).id;
  for (const h of [hs1, hs2, hs3]) await m.classes.joinClass(h.id, lop);
  await m.classes.joinClass(hs3.id, lop2);
  const base = { classIds: [lop], body: "", maxPoints: 10, dueAt: new Date(Date.now() + 86400_000), allowLate: true, allowResubmit: true, showResults: "IMMEDIATE" as const, attachmentIds: [] };
  [quiz] = await m.asg.createAssignment(gv, { ...base, type: "QUIZ", title: "Quiz CC" });
  await m.asg.saveQuestions(gv, quiz, [{ type: "SINGLE", prompt: "1+1?", points: 1, options: [{ label: "2", isCorrect: true }, { label: "3", isCorrect: false }] }]);
  await m.asg.publishAssignment(gv, quiz);
  [written] = await m.asg.createAssignment(gv, { ...base, type: "WRITTEN", title: "Tự luận CC" });
  await m.asg.publishAssignment(gv, written);
});

describe("request song song", () => {
  it("rate limit đếm đúng khi nhiều request cùng lúc (dùng chung giữa instance)", async () => {
    const key = `test:${uuidv7()}`;
    const results = await Promise.all(Array.from({ length: 10 }, () => m.rl.rateLimit(key, 3, 60_000)));
    expect(results.filter(Boolean)).toHaveLength(3);
    expect(await m.rl.rateLimit(key, 3, 60_000)).toBe(false);
  });

  it("nộp quiz 5 lần song song: chỉ 1 lần được ghi, 1 grade_event", async () => {
    const qs = await m.asg.questionsWithOptions(quiz, true);
    const answers = { [qs[0].id]: [qs[0].options[0].id] };
    const out = await Promise.allSettled(Array.from({ length: 5 }, () => m.subs.submitQuiz(hs1, quiz, answers)));
    expect(out.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const [sub] = await m.db.db.select().from(m.schema.submissions).where(and(eq(m.schema.submissions.assignmentId, quiz), eq(m.schema.submissions.studentId, hs1.id)));
    const events = await m.db.db.select().from(m.schema.gradeEvents).where(eq(m.schema.gradeEvents.submissionId, sub.id));
    expect(events).toHaveLength(1);
  });

  it("nộp bài tự luận 3 lần song song: chỉ 1 lần, versionNo = 1", async () => {
    const out = await Promise.allSettled(Array.from({ length: 3 }, () => m.subs.submitWritten(hs2, written, "Bài làm", [])));
    expect(out.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const [sub] = await m.db.db.select().from(m.schema.submissions).where(and(eq(m.schema.submissions.assignmentId, written), eq(m.schema.submissions.studentId, hs2.id)));
    expect(sub.status).toBe("SUBMITTED");
    expect(sub.versionNo).toBe(1);
  });

  it("GV không chấm vào bài HS vừa rút lại", async () => {
    const roster = await m.subs.assignmentRoster(gv, written);
    const subId = roster.roster.find((r) => r.studentId === hs2.id)!.submissionId!;
    const stale = await m.subs.submissionDetailForTeacher(gv, subId); // GV mở bài khi còn SUBMITTED
    expect(stale.s.status).toBe("SUBMITTED");
    await m.subs.unsubmit(hs2, written);
    // Bài đã về DRAFT: chặn (dù kiểm tra lúc đọc hay điều kiện trong UPDATE bắt được).
    await expect(m.subs.saveGrade(gv, subId, { score: 8, feedback: "", returnNow: true })).rejects.toThrow(/chưa nộp|rút lại/);
    await m.subs.submitWritten(hs2, written, "Bài làm lần 2", []);
    await m.subs.saveGrade(gv, subId, { score: 8, feedback: "", returnNow: false });
    await expect(m.subs.unsubmit(hs2, written)).rejects.toThrow();
  });
});

describe("thống kê", () => {
  it("bài nộp của HS đã rời lớp không tính vào đã nộp", async () => {
    await m.subs.submitWritten(hs3, written, "Bài hs3", []);
    let [st] = (await m.classes.classAssignmentsWithStats(gv, lop)).filter((a) => a.id === written);
    expect(st.stats.submitted).toBe(2);
    await m.classes.removeStudent(gv, lop, hs3.id);
    [st] = (await m.classes.classAssignmentsWithStats(gv, lop)).filter((a) => a.id === written);
    expect(st.stats.total).toBe(2);
    expect(st.stats.submitted).toBe(1);
    expect(st.stats.submitted).toBeLessThanOrEqual(st.stats.total);
  });
});

describe("sửa tên HS", () => {
  it("GV sửa được tên HS chỉ học lớp mình; HS học lớp GV khác thì không; GV khác bị 404", async () => {
    await m.classes.renameStudent(gv, lop, hs1.id, "Nguyễn Văn Một");
    const [u] = await m.db.db.select().from(m.schema.users).where(eq(m.schema.users.id, hs1.id));
    expect(u.fullName).toBe("Nguyễn Văn Một");
    await m.classes.joinClass(hs3.id, lop);
    await expect(m.classes.renameStudent(gv, lop, hs3.id, "Đổi Tên")).rejects.toThrow(/giáo viên khác/);
    await expect(m.classes.renameStudent(gv2, lop, hs1.id, "X")).rejects.toSatisfy((e: unknown) => String((e as { digest?: string }).digest ?? "").includes("404"));
  });
});

describe("email nhắc việc: gộp + hạn mức", () => {
  it("giờ yên tĩnh không gửi", async () => {
    const night = new Date(`${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date())}T22:30:00+07:00`);
    expect(await m.notif.flushNotificationEmails(night)).toBe(0);
  });

  it("mỗi HS nhận tối đa 1 email/ngày gộp mọi thông báo; thông báo in-app hoặc HS không email không chiếm hàng đợi", async () => {
    sentMails.length = 0;
    const now = vnMorning();
    await m.db.db.update(m.schema.notifications).set({ emailSentAt: now }); // bỏ thông báo tạo ở các test trước
    await m.notif.notify(m.db.db, [
      { recipientId: hs1.id, type: "ASSIGNMENT_CREATED", title: "Bài mới A", href: "/student/assignments/a", dedupeKey: `t:${uuidv7()}` },
      { recipientId: hs1.id, type: "ASSIGNMENT_DUE_SOON", title: "Sắp hạn B", href: "/student/assignments/b", dedupeKey: `t:${uuidv7()}` },
      { recipientId: hs1.id, type: "SUBMISSION_RECEIVED", title: "Chỉ in-app", href: "/x", dedupeKey: `t:${uuidv7()}` },
    ]);
    expect(await m.notif.flushNotificationEmails(now)).toBe(1);
    expect(sentMails).toHaveLength(1);
    expect(sentMails[0].text).toContain("Bài mới A");
    expect(sentMails[0].text).toContain("Sắp hạn B");
    expect(sentMails[0].text).not.toContain("Chỉ in-app");
    const pending = await m.db.db.select().from(m.schema.notifications).where(sql`${m.schema.notifications.emailSentAt} is null`);
    expect(pending).toHaveLength(0);
    // Thông báo mới cùng ngày: chờ tới mai.
    await m.notif.notify(m.db.db, [{ recipientId: hs1.id, type: "ASSIGNMENT_RETURNED", title: "Đã trả C", href: "/c", dedupeKey: `t:${uuidv7()}` }]);
    expect(await m.notif.flushNotificationEmails(now)).toBe(0);
    const tomorrow = new Date(now.getTime() + 86400_000);
    expect(await m.notif.flushNotificationEmails(tomorrow)).toBe(1);
  });

  it("hết phần hạn mức dành cho email nhắc thì dừng, vẫn còn suất cho email đặt lại mật khẩu", async () => {
    sentMails.length = 0;
    const now = vnMorning();
    await m.db.db.delete(m.schema.emailSends);
    await m.db.db.update(m.schema.users).set({ lastReminderEmailAt: null });
    process.env.EMAIL_DAILY_LIMIT = "5";
    process.env.EMAIL_REMINDER_SHARE = "0.4"; // 2 suất nhắc, 3 suất giao dịch
    await m.notif.notify(
      m.db.db,
      [hs1, hs2, hs3].map((h) => ({ recipientId: h.id, type: "ASSIGNMENT_CREATED" as const, title: "Bài mới D", href: "/d", dedupeKey: `t:${uuidv7()}` })),
    );
    expect(await m.notif.flushNotificationEmails(now)).toBe(2);
    expect(await m.mail.emailBudget("reminder")).toBe(0);
    expect(await m.mail.emailBudget("transactional")).toBe(3);
    const left = await m.db.db.select().from(m.schema.notifications).where(sql`${m.schema.notifications.emailSentAt} is null`);
    expect(left).toHaveLength(1); // em thứ 3 chờ hôm sau, không bị đánh dấu lỗi
    expect(left[0].emailAttempts).toBe(0);
    delete process.env.EMAIL_DAILY_LIMIT;
    delete process.env.EMAIL_REMINDER_SHARE;
  });
});

describe("dọn dẹp", () => {
  it("xóa phiên hết hạn, đánh dấu file upload dở dang quá 24 giờ", async () => {
    const { db } = m.db;
    const s = m.schema;
    await db.insert(s.sessions).values({ userId: hs1.id, tokenHash: `old-${uuidv7()}`, expiresAt: new Date(Date.now() - 1000) });
    const [f] = await db
      .insert(s.files)
      .values({ uploaderId: hs1.id, purpose: "SUBMISSION", classId: lop, storageKey: `sub/test/${uuidv7()}`, originalName: "a.jpg", mime: "image/jpeg", sizeBytes: 10, createdAt: new Date(Date.now() - 2 * 86400_000) })
      .returning();
    const saved = process.env.S3_ENDPOINT;
    delete process.env.S3_ENDPOINT;
    const r = await m.maint.cleanupExpired();
    if (saved) process.env.S3_ENDPOINT = saved;
    expect(r.sessions).toBeGreaterThanOrEqual(1);
    const [after] = await db.select().from(s.files).where(eq(s.files.id, f.id));
    expect(after.status).toBe("DELETED");
  });
});

describe("nhắc HS chưa nộp", () => {
  it("chỉ GV của lớp; chỉ nhắc em chưa nộp; không nhắc lại trong 6 giờ", async () => {
    await expect(m.subs.remindMissing(gv2, written)).rejects.toSatisfy((e: unknown) => String((e as { digest?: string }).digest ?? "").includes("404"));
    await expect(m.subs.remindMissing(hs1, written)).rejects.toSatisfy((e: unknown) => String((e as { digest?: string }).digest ?? "").includes("404"));
    const now = new Date();
    const n = await m.subs.remindMissing(gv, written, now);
    // hs1 chưa nộp bài tự luận; hs2 đã nộp; hs3 đã vào lại lớp ở test "sửa tên" và đã nộp trước đó
    const roster = await m.subs.assignmentRoster(gv, written);
    const missing = roster.roster.filter((r) => !r.status || r.status === "DRAFT").length;
    expect(n).toBe(missing);
    expect(await m.subs.remindMissing(gv, written, new Date(now.getTime() + 3600_000))).toBe(0);
    const notes = await m.notif.listNotifications(hs1.id);
    expect(notes.filter((x) => x.type === "ASSIGNMENT_REMINDER")).toHaveLength(1);
  });
});

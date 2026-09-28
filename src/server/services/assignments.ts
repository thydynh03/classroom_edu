import "server-only";
import { and, asc, count, desc, eq, inArray, isNull, lte } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { db, type Tx } from "@/server/db/client";
import {
  assignmentAttachments,
  assignments,
  classMembers,
  classes,
  files,
  questionOptions,
  questions,
  submissions,
} from "@/server/db/schema";
import type { Actor } from "@/server/auth/session";
import { requireAssignmentForTeacher, requireTeacherOfClass } from "@/server/policy";
import { notify } from "./notifications";
import { withStats } from "./classes";
import { UserError } from "./errors";
import type { AssignmentInput, QuestionInput } from "@/server/validation/assignment";

export async function createAssignment(actor: Actor, input: AssignmentInput) {
  for (const classId of input.classIds) await requireTeacherOfClass(actor, classId);
  const groupId = uuidv7();
  const created = await db.transaction(async (tx) => {
    const out: string[] = [];
    for (const classId of input.classIds) {
      const [a] = await tx
        .insert(assignments)
        .values({
          classId,
          groupId,
          type: input.type,
          title: input.title,
          body: input.body,
          maxPoints: input.maxPoints,
          dueAt: input.dueAt,
          allowLate: input.allowLate,
          allowResubmit: input.allowResubmit,
          showResults: input.showResults,
          createdBy: actor.id,
        })
        .returning({ id: assignments.id });
      if (input.attachmentIds.length) await linkAttachments(tx, actor, a.id, classId, input.attachmentIds);
      out.push(a.id);
    }
    return out;
  });
  return created;
}

async function linkAttachments(tx: Tx, actor: Actor, assignmentId: string, classId: string, fileIds: string[]) {
  // Chỉ file do chính GV upload, đã READY. File upload cho lớp khác vẫn dùng được (bản sao cho nhiều lớp).
  const ok = await tx
    .select({ id: files.id })
    .from(files)
    .where(and(inArray(files.id, fileIds), eq(files.uploaderId, actor.id), eq(files.status, "READY"), eq(files.purpose, "ATTACHMENT")));
  if (ok.length) {
    await tx
      .insert(assignmentAttachments)
      .values(ok.map((f) => ({ assignmentId, fileId: f.id })))
      .onConflictDoNothing();
  }
  void classId;
}

export async function updateAssignment(actor: Actor, assignmentId: string, input: Omit<AssignmentInput, "classIds">) {
  const { a } = await requireAssignmentForTeacher(actor, assignmentId);
  await db.transaction(async (tx) => {
    await tx
      .update(assignments)
      .set({
        title: input.title,
        body: input.body,
        maxPoints: input.maxPoints,
        dueAt: input.dueAt,
        allowLate: input.allowLate,
        allowResubmit: input.allowResubmit,
        showResults: input.showResults,
        // Gia hạn → cho phép nhắc lại "sắp đến hạn"
        dueSoonNotifiedAt: input.dueAt.getTime() !== a.dueAt.getTime() ? null : a.dueSoonNotifiedAt,
        overdueNotifiedAt: input.dueAt.getTime() !== a.dueAt.getTime() ? null : a.overdueNotifiedAt,
      })
      .where(eq(assignments.id, assignmentId));
    await tx.delete(assignmentAttachments).where(eq(assignmentAttachments.assignmentId, assignmentId));
    if (input.attachmentIds.length) await linkAttachments(tx, actor, assignmentId, a.classId, input.attachmentIds);
  });
}

async function ensureQuizReady(a: { id: string; type: "WRITTEN" | "QUIZ" }) {
  if (a.type !== "QUIZ") return;
  const [q] = await db.select({ n: count() }).from(questions).where(eq(questions.assignmentId, a.id));
  if (!q?.n) throw new UserError("Quiz cần ít nhất 1 câu hỏi trước khi đăng.");
}

/** Đăng bài + thông báo HS (dùng chung cho GV bấm đăng và job đăng theo lịch). */
async function doPublish(a: { id: string; classId: string; title: string }, className: string) {
  await db.transaction(async (tx) => {
    await tx
      .update(assignments)
      .set({ status: "PUBLISHED", publishedAt: new Date(), publishAt: null })
      .where(eq(assignments.id, a.id));
    const students = await tx
      .select({ id: classMembers.userId })
      .from(classMembers)
      .where(and(eq(classMembers.classId, a.classId), eq(classMembers.role, "STUDENT"), eq(classMembers.status, "ACTIVE")));
    await notify(
      tx,
      students.map((s) => ({
        recipientId: s.id,
        type: "ASSIGNMENT_CREATED" as const,
        title: `Bài mới lớp ${className}: ${a.title}`,
        href: `/student/assignments/${a.id}`,
        dedupeKey: `created:${a.id}:${s.id}`,
      })),
    );
  });
}

export async function publishAssignment(actor: Actor, assignmentId: string) {
  const { a, cls } = await requireAssignmentForTeacher(actor, assignmentId);
  if (a.status === "PUBLISHED") return;
  await ensureQuizReady(a);
  await doPublish(a, cls.name);
}

/** Lên lịch đăng: bài giữ trạng thái SCHEDULED (HS chưa thấy) tới publishAt. */
export async function scheduleAssignment(actor: Actor, assignmentId: string, publishAt: Date) {
  const { a } = await requireAssignmentForTeacher(actor, assignmentId);
  if (a.status === "PUBLISHED" || a.status === "ARCHIVED") throw new UserError("Bài đã đăng hoặc đã lưu trữ.");
  if (publishAt.getTime() <= Date.now()) throw new UserError("Thời điểm đăng phải ở tương lai.");
  if (publishAt.getTime() >= a.dueAt.getTime()) throw new UserError("Thời điểm đăng phải trước hạn nộp.");
  await ensureQuizReady(a);
  await db.update(assignments).set({ status: "SCHEDULED", publishAt }).where(eq(assignments.id, assignmentId));
}

export async function unscheduleAssignment(actor: Actor, assignmentId: string) {
  const { a } = await requireAssignmentForTeacher(actor, assignmentId);
  if (a.status !== "SCHEDULED") return;
  await db.update(assignments).set({ status: "DRAFT", publishAt: null }).where(eq(assignments.id, assignmentId));
}

/** Job: đăng các bài đã tới giờ. Điều kiện status trong UPDATE tránh đăng trùng khi chạy song song. */
export async function publishDueScheduled(now = new Date()) {
  const due = await db
    .select({ a: assignments, className: classes.name })
    .from(assignments)
    .innerJoin(classes, eq(classes.id, assignments.classId))
    .where(and(eq(assignments.status, "SCHEDULED"), lte(assignments.publishAt, now)));
  let n = 0;
  for (const { a, className } of due) {
    const [claimed] = await db
      .update(assignments)
      .set({ status: "DRAFT" })
      .where(and(eq(assignments.id, a.id), eq(assignments.status, "SCHEDULED")))
      .returning({ id: assignments.id });
    if (!claimed) continue;
    await doPublish(a, className);
    n++;
  }
  return n;
}

export async function setAssignmentArchived(actor: Actor, assignmentId: string, archived: boolean) {
  const { a } = await requireAssignmentForTeacher(actor, assignmentId);
  await db
    .update(assignments)
    .set({ status: archived ? "ARCHIVED" : a.publishedAt ? "PUBLISHED" : "DRAFT", publishAt: null })
    .where(eq(assignments.id, assignmentId));
}

/** Xóa hẳn chỉ khi còn nháp và chưa có bài nộp. */
export async function deleteDraftAssignment(actor: Actor, assignmentId: string) {
  const { a } = await requireAssignmentForTeacher(actor, assignmentId);
  if (a.status !== "DRAFT") throw new UserError("Chỉ xóa được bài còn nháp. Bài đã đăng hãy lưu trữ.");
  await db.delete(assignments).where(eq(assignments.id, assignmentId));
}

export async function getAssignmentForEdit(actor: Actor, assignmentId: string) {
  const { a, cls } = await requireAssignmentForTeacher(actor, assignmentId);
  const [atts, qs, subCount] = await Promise.all([
    attachmentsOf(assignmentId),
    questionsWithOptions(assignmentId, true),
    db.select({ n: count() }).from(submissions).where(and(eq(submissions.assignmentId, assignmentId), inArray(submissions.status, ["SUBMITTED", "GRADED", "RETURNED"]))),
  ]);
  return { a, cls, attachments: atts, questions: qs, hasSubmissions: (subCount[0]?.n ?? 0) > 0 };
}

export async function attachmentsOf(assignmentId: string) {
  return db
    .select({ id: files.id, name: files.originalName, mime: files.mime, size: files.sizeBytes })
    .from(assignmentAttachments)
    .innerJoin(files, eq(files.id, assignmentAttachments.fileId))
    .where(and(eq(assignmentAttachments.assignmentId, assignmentId), eq(files.status, "READY")));
}

/** withAnswers=false: KHÔNG trả is_correct (dùng cho học sinh). */
export async function questionsWithOptions(assignmentId: string, withAnswers: boolean) {
  const qs = await db
    .select()
    .from(questions)
    .where(eq(questions.assignmentId, assignmentId))
    .orderBy(asc(questions.position));
  if (!qs.length) return [];
  const opts = await db
    .select()
    .from(questionOptions)
    .where(inArray(questionOptions.questionId, qs.map((q) => q.id)))
    .orderBy(asc(questionOptions.position));
  return qs.map((q) => ({
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    points: q.points,
    options: opts
      .filter((o) => o.questionId === q.id)
      .map((o) => (withAnswers ? { id: o.id, label: o.label, isCorrect: o.isCorrect } : { id: o.id, label: o.label })),
  }));
}

/** Thay toàn bộ câu hỏi. Khóa khi đã có học sinh nộp để không làm sai điểm. */
export async function saveQuestions(actor: Actor, assignmentId: string, input: QuestionInput[]) {
  const { a } = await requireAssignmentForTeacher(actor, assignmentId);
  if (a.type !== "QUIZ") throw new UserError("Bài này không phải quiz.");
  const [sub] = await db
    .select({ n: count() })
    .from(submissions)
    .where(and(eq(submissions.assignmentId, assignmentId), inArray(submissions.status, ["SUBMITTED", "GRADED", "RETURNED"])));
  if (sub?.n) throw new UserError("Đã có học sinh nộp bài, không sửa câu hỏi được nữa.");
  await db.transaction(async (tx) => {
    await tx.delete(questions).where(eq(questions.assignmentId, assignmentId));
    for (const [i, q] of input.entries()) {
      const [row] = await tx
        .insert(questions)
        .values({ assignmentId, type: q.type, prompt: q.prompt, points: q.points, position: i })
        .returning({ id: questions.id });
      await tx.insert(questionOptions).values(
        q.options.map((o, j) => ({ questionId: row.id, label: o.label, isCorrect: o.isCorrect, position: j })),
      );
    }
  });
}

/** Tất cả bài của GV (xuyên lớp) kèm số liệu. */
export async function listTeacherAssignments(actor: Actor, opts: { status?: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED"; classId?: string } = {}) {
  const rows = await db
    .select({ a: assignments, className: classes.name, classColor: classes.color })
    .from(assignments)
    .innerJoin(classes, eq(classes.id, assignments.classId))
    .innerJoin(
      classMembers,
      and(
        eq(classMembers.classId, assignments.classId),
        eq(classMembers.userId, actor.id),
        eq(classMembers.role, "TEACHER"),
        eq(classMembers.status, "ACTIVE"),
      ),
    )
    .where(
      and(
        isNull(classes.deletedAt),
        opts.status ? eq(assignments.status, opts.status) : undefined,
        opts.classId ? eq(assignments.classId, opts.classId) : undefined,
      ),
    )
    .orderBy(desc(assignments.dueAt))
    .limit(200);
  const stats = await withStats(null, rows.map((r) => r.a));
  return rows.map((r, i) => ({ ...stats[i], className: r.className, classColor: r.classColor }));
}

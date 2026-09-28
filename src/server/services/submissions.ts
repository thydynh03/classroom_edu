import "server-only";
import { and, asc, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  assignments,
  classMembers,
  classes,
  files,
  gradeEvents,
  submissionFiles,
  submissions,
  users,
} from "@/server/db/schema";
import type { Actor } from "@/server/auth/session";
import {
  requireAssignmentForStudent,
  requireAssignmentForTeacher,
  requireSubmissionForTeacher,
} from "@/server/policy";
import { attachmentsOf, questionsWithOptions } from "./assignments";
import { notify } from "./notifications";
import { gradeQuiz, scaleScore } from "./quiz-grading";
import { canEdit, displayStatus, isLateAt, resultsVisible } from "./submission-rules";
import { UserError } from "./errors";

export { UserError };

async function ownSubmission(assignmentId: string, studentId: string) {
  const [s] = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.assignmentId, assignmentId), eq(submissions.studentId, studentId)))
    .limit(1);
  return s ?? null;
}

async function filesOfSubmission(submissionId: string) {
  return db
    .select({ id: files.id, name: files.originalName, mime: files.mime, size: files.sizeBytes })
    .from(submissionFiles)
    .innerJoin(files, eq(files.id, submissionFiles.fileId))
    .where(and(eq(submissionFiles.submissionId, submissionId), eq(files.status, "READY")));
}

// ---------------------------------------------------------------- Học sinh

export async function getStudentAssignment(actor: Actor, assignmentId: string) {
  const { a, cls } = await requireAssignmentForStudent(actor, assignmentId);
  const sub = await ownSubmission(assignmentId, actor.id);
  const visible = resultsVisible(sub, a);
  const [atts, qs, subFiles] = await Promise.all([
    attachmentsOf(assignmentId),
    a.type === "QUIZ" ? questionsWithOptions(assignmentId, visible) : Promise.resolve([]),
    sub ? filesOfSubmission(sub.id) : Promise.resolve([]),
  ]);
  return {
    a,
    cls: { id: cls.id, name: cls.name, subject: cls.subject, color: cls.color },
    submission: sub
      ? {
          id: sub.id,
          status: sub.status,
          content: sub.content,
          quizAnswers: sub.quizAnswers ?? {},
          isLate: sub.isLate,
          submittedAt: sub.submittedAt,
          versionNo: sub.versionNo,
          updatedAt: sub.updatedAt,
          // Điểm & nhận xét chỉ trả về khi đã được phép xem.
          score: visible ? sub.score : null,
          feedback: visible ? sub.feedback : null,
        }
      : null,
    resultsVisible: visible,
    attachments: atts,
    questions: qs,
    files: subFiles,
    display: displayStatus(sub, a.dueAt),
    edit: canEdit(sub, a),
  };
}

async function getOrCreateDraft(actor: Actor, assignmentId: string) {
  const existing = await ownSubmission(assignmentId, actor.id);
  if (existing) return existing;
  const [s] = await db
    .insert(submissions)
    .values({ assignmentId, studentId: actor.id })
    .onConflictDoNothing()
    .returning();
  return s ?? (await ownSubmission(assignmentId, actor.id))!;
}

export async function saveDraft(actor: Actor, assignmentId: string, content: string, fileIds: string[]) {
  const { a } = await requireAssignmentForStudent(actor, assignmentId);
  if (a.type !== "WRITTEN") throw new UserError("Bài quiz không lưu nháp kiểu này.");
  const sub = await getOrCreateDraft(actor, assignmentId);
  const rule = canEdit(sub, a);
  if (!rule.ok) throw new UserError(rule.reason);
  await db.transaction(async (tx) => {
    await tx
      .update(submissions)
      .set({ content, status: "DRAFT" })
      .where(eq(submissions.id, sub.id));
    await tx.delete(submissionFiles).where(eq(submissionFiles.submissionId, sub.id));
    if (fileIds.length) {
      // Chỉ nhận file do chính học sinh upload, đúng lớp, đã kiểm tra xong.
      const own = await tx
        .select({ id: files.id })
        .from(files)
        .where(
          and(
            inArray(files.id, fileIds),
            eq(files.uploaderId, actor.id),
            eq(files.classId, a.classId),
            eq(files.purpose, "SUBMISSION"),
            eq(files.status, "READY"),
          ),
        );
      if (own.length) await tx.insert(submissionFiles).values(own.map((f) => ({ submissionId: sub.id, fileId: f.id })));
    }
  });
  return sub.id;
}

export async function submitWritten(actor: Actor, assignmentId: string, content: string, fileIds: string[]) {
  const subId = await saveDraft(actor, assignmentId, content, fileIds);
  const { a, cls } = await requireAssignmentForStudent(actor, assignmentId);
  const [hasFile] = await db.select({ id: submissionFiles.fileId }).from(submissionFiles).where(eq(submissionFiles.submissionId, subId)).limit(1);
  if (!content.trim() && !hasFile) throw new UserError("Bài làm đang trống. Viết bài hoặc đính kèm file trước khi nộp.");
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(submissions)
      .set({
        status: "SUBMITTED",
        submittedAt: now,
        isLate: isLateAt(now, a.dueAt),
        score: null,
        feedback: null,
        returnedAt: null,
        versionNo: sql`${submissions.versionNo} + 1`,
      })
      .where(eq(submissions.id, subId));
    await notifyTeachers(tx, a.classId, {
      title: `Có bài nộp mới: ${a.title} (${cls.name})`,
      href: `/teacher/grading/${a.id}`,
      key: `received:${a.id}:${now.toISOString().slice(0, 10)}`,
    });
  });
}

export async function unsubmit(actor: Actor, assignmentId: string) {
  const { a } = await requireAssignmentForStudent(actor, assignmentId);
  const sub = await ownSubmission(assignmentId, actor.id);
  if (!sub || sub.status !== "SUBMITTED") throw new UserError("Chỉ rút lại được bài đã nộp và chưa chấm.");
  if (!a.allowLate && new Date() > a.dueAt) {
    throw new UserError("Đã quá hạn và giáo viên không nhận bài trễ, nên không rút lại được (bài sẽ không nộp lại được).");
  }
  await db.update(submissions).set({ status: "DRAFT" }).where(eq(submissions.id, sub.id));
}

export async function submitQuiz(actor: Actor, assignmentId: string, answers: Record<string, string[]>) {
  const { a, cls } = await requireAssignmentForStudent(actor, assignmentId);
  if (a.type !== "QUIZ") throw new UserError("Bài này không phải quiz.");
  const sub = await getOrCreateDraft(actor, assignmentId);
  const rule = canEdit(sub, a);
  if (!rule.ok) throw new UserError(rule.reason);
  const qs = await questionsWithOptions(assignmentId, true);
  const gradable = qs.map((q) => ({
    id: q.id,
    type: q.type,
    points: q.points,
    options: q.options.map((o) => ({ id: o.id, isCorrect: "isCorrect" in o ? o.isCorrect === true : false })),
  }));
  const result = gradeQuiz(gradable, answers);
  const score = scaleScore(result.score, result.maxScore, a.maxPoints);
  const now = new Date();
  const status = a.showResults === "IMMEDIATE" ? "RETURNED" : "GRADED";
  await db.transaction(async (tx) => {
    // Chỉ lưu đáp án cho câu hỏi hợp lệ.
    const clean: Record<string, string[]> = {};
    for (const q of qs) if (answers[q.id]) clean[q.id] = answers[q.id].slice(0, 8);
    await tx
      .update(submissions)
      .set({
        quizAnswers: clean,
        status,
        submittedAt: now,
        isLate: isLateAt(now, a.dueAt),
        score,
        returnedAt: status === "RETURNED" ? now : null,
        versionNo: 1,
      })
      .where(eq(submissions.id, sub.id));
    await tx.insert(gradeEvents).values({ submissionId: sub.id, score, action: "AUTO" });
    await notifyTeachers(tx, a.classId, {
      title: `Có bài nộp mới: ${a.title} (${cls.name})`,
      href: `/teacher/assignments/${a.id}`,
      key: `received:${a.id}:${now.toISOString().slice(0, 10)}`,
    });
  });
  return { status };
}

async function notifyTeachers(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  classId: string,
  n: { title: string; href: string; key: string },
) {
  const teachers = await tx
    .select({ id: classMembers.userId })
    .from(classMembers)
    .where(and(eq(classMembers.classId, classId), eq(classMembers.role, "TEACHER"), eq(classMembers.status, "ACTIVE")));
  await notify(
    tx,
    teachers.map((t) => ({
      recipientId: t.id,
      type: "SUBMISSION_RECEIVED" as const,
      title: n.title,
      href: n.href,
      dedupeKey: `${n.key}:${t.id}`,
    })),
  );
}

/** Việc cần làm + bài gần đây của học sinh (xuyên lớp). */
export async function studentOverview(actor: Actor) {
  const rows = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      type: assignments.type,
      dueAt: assignments.dueAt,
      allowLate: assignments.allowLate,
      maxPoints: assignments.maxPoints,
      showResults: assignments.showResults,
      classId: classes.id,
      className: classes.name,
      subject: classes.subject,
      color: classes.color,
      subStatus: submissions.status,
      isLate: submissions.isLate,
      score: submissions.score,
      returnedAt: submissions.returnedAt,
      submittedAt: submissions.submittedAt,
      contentLen: sql<number>`coalesce(length(${submissions.content}), 0)`,
    })
    .from(assignments)
    .innerJoin(classes, eq(classes.id, assignments.classId))
    .innerJoin(
      classMembers,
      and(
        eq(classMembers.classId, assignments.classId),
        eq(classMembers.userId, actor.id),
        eq(classMembers.role, "STUDENT"),
        eq(classMembers.status, "ACTIVE"),
      ),
    )
    .leftJoin(submissions, and(eq(submissions.assignmentId, assignments.id), eq(submissions.studentId, actor.id)))
    .where(and(eq(assignments.status, "PUBLISHED"), isNull(classes.deletedAt), eq(classes.status, "ACTIVE")))
    .orderBy(asc(assignments.dueAt));
  const now = new Date();
  return rows.map((r) => {
    const sub = r.subStatus ? { status: r.subStatus, isLate: !!r.isLate } : null;
    const visible = resultsVisible(sub, { type: r.type, showResults: r.showResults, dueAt: r.dueAt }, now);
    return {
      ...r,
      score: visible ? r.score : null,
      display: displayStatus(sub, r.dueAt, now),
      resultsVisible: visible,
    };
  });
}

// ---------------------------------------------------------------- Giáo viên

/** Toàn bộ học sinh của lớp + bài nộp (kể cả em chưa nộp). */
export async function assignmentRoster(actor: Actor, assignmentId: string) {
  const { a, cls } = await requireAssignmentForTeacher(actor, assignmentId);
  const rows = await db
    .select({
      studentId: users.id,
      fullName: users.fullName,
      sub: submissions,
    })
    .from(classMembers)
    .innerJoin(users, eq(users.id, classMembers.userId))
    .leftJoin(submissions, and(eq(submissions.assignmentId, assignmentId), eq(submissions.studentId, classMembers.userId)))
    .where(and(eq(classMembers.classId, a.classId), eq(classMembers.role, "STUDENT"), eq(classMembers.status, "ACTIVE")))
    .orderBy(asc(users.fullName));
  return {
    a,
    cls,
    roster: rows.map((r) => ({
      studentId: r.studentId,
      fullName: r.fullName,
      submissionId: r.sub?.id ?? null,
      status: r.sub?.status ?? null,
      isLate: r.sub?.isLate ?? false,
      submittedAt: r.sub?.submittedAt ?? null,
      score: r.sub?.score ?? null,
      display: displayStatus(r.sub, a.dueAt),
    })),
  };
}

export async function submissionDetailForTeacher(actor: Actor, submissionId: string) {
  const { s, a } = await requireSubmissionForTeacher(actor, submissionId);
  const [student] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, s.studentId));
  const [subFiles, history, qs] = await Promise.all([
    filesOfSubmission(s.id),
    db
      .select({ id: gradeEvents.id, score: gradeEvents.score, action: gradeEvents.action, createdAt: gradeEvents.createdAt, grader: users.fullName })
      .from(gradeEvents)
      .leftJoin(users, eq(users.id, gradeEvents.graderId))
      .where(eq(gradeEvents.submissionId, s.id))
      .orderBy(desc(gradeEvents.createdAt)),
    a.type === "QUIZ" ? questionsWithOptions(a.id, true) : Promise.resolve([]),
  ]);
  return { s, a, studentName: student?.fullName ?? "", files: subFiles, history, questions: qs };
}

export async function saveGrade(
  actor: Actor,
  submissionId: string,
  input: { score: number; feedback: string; returnNow: boolean },
) {
  const { s, a } = await requireSubmissionForTeacher(actor, submissionId);
  if (s.status === "DRAFT") throw new UserError("Học sinh chưa nộp bài này.");
  if (input.score > a.maxPoints) throw new UserError(`Điểm tối đa là ${a.maxPoints}.`);
  const now = new Date();
  const wasGraded = s.score !== null;
  await db.transaction(async (tx) => {
    await tx
      .update(submissions)
      .set({
        score: input.score,
        feedback: input.feedback,
        status: input.returnNow ? "RETURNED" : "GRADED",
        returnedAt: input.returnNow ? now : s.returnedAt,
      })
      .where(eq(submissions.id, s.id));
    await tx.insert(gradeEvents).values({
      submissionId: s.id,
      graderId: actor.id,
      score: input.score,
      feedback: input.feedback,
      action: input.returnNow ? "RETURNED" : wasGraded ? "EDITED" : "GRADED",
    });
    if (input.returnNow) {
      await notify(tx, [
        {
          recipientId: s.studentId,
          type: "ASSIGNMENT_RETURNED",
          title: `Giáo viên đã trả bài: ${a.title}`,
          href: `/student/assignments/${a.id}`,
          dedupeKey: `returned:${s.id}:v${s.versionNo}:${now.getTime()}`,
        },
      ]);
    }
  });
}

/** Trả tất cả bài đã chấm (chưa trả) của một bài tập. */
export async function returnAllGraded(actor: Actor, assignmentId: string) {
  const { a } = await requireAssignmentForTeacher(actor, assignmentId);
  const now = new Date();
  return db.transaction(async (tx) => {
    const rows = await tx
      .update(submissions)
      .set({ status: "RETURNED", returnedAt: now })
      .where(and(eq(submissions.assignmentId, assignmentId), eq(submissions.status, "GRADED")))
      .returning({ id: submissions.id, studentId: submissions.studentId, score: submissions.score, versionNo: submissions.versionNo });
    if (!rows.length) return 0;
    await tx.insert(gradeEvents).values(rows.map((r) => ({ submissionId: r.id, graderId: actor.id, score: r.score, action: "RETURNED" as const })));
    await notify(
      tx,
      rows.map((r) => ({
        recipientId: r.studentId,
        type: "ASSIGNMENT_RETURNED" as const,
        title: `Giáo viên đã trả bài: ${a.title}`,
        href: `/student/assignments/${a.id}`,
        dedupeKey: `returned:${r.id}:v${r.versionNo}:${now.getTime()}`,
      })),
    );
    return rows.length;
  });
}

/** Hàng đợi chấm xuyên lớp: bài đã nộp, chưa chấm. */
export async function gradingQueue(actor: Actor) {
  return db
    .select({
      assignmentId: assignments.id,
      title: assignments.title,
      dueAt: assignments.dueAt,
      className: classes.name,
      classColor: classes.color,
      pending: sql<number>`count(*)::int`,
      oldest: sql<Date>`min(${submissions.submittedAt})`,
    })
    .from(submissions)
    .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
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
    .where(and(eq(submissions.status, "SUBMITTED"), ne(assignments.status, "ARCHIVED")))
    .groupBy(assignments.id, classes.name, classes.color)
    .orderBy(sql`min(${submissions.submittedAt})`);
}

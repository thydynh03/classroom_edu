import "server-only";
import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/server/db/client";
import { assignments, classMembers, questionOptions, questions, submissions, users } from "@/server/db/schema";
import type { Actor } from "@/server/auth/session";
import { requireAssignmentForTeacher, requireTeacherOfClass } from "@/server/policy";
import { requireFeature } from "@/server/entitlements";
import { gradeQuiz } from "./quiz-grading";
import { UserError } from "./errors";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Sổ điểm (tính năng nâng cao GRADEBOOK): HS đang ở lớp × bài đã đăng. Điểm quy về thang 10.
 * Trung bình = Σ(điểm × hệ số) / Σ hệ số trên các bài đã chấm. Bài quá hạn chưa nộp đánh dấu "thiếu" (không tự tính 0).
 */
export async function classGradebook(actor: Actor, classId: string, now = new Date()) {
  const cls = await requireTeacherOfClass(actor, classId);
  await requireFeature(actor, "GRADEBOOK");
  const cols = await db
    .select({ id: assignments.id, title: assignments.title, dueAt: assignments.dueAt, maxPoints: assignments.maxPoints, weight: assignments.gradeWeight, type: assignments.type })
    .from(assignments)
    .where(and(eq(assignments.classId, classId), isNotNull(assignments.publishedAt), inArray(assignments.status, ["PUBLISHED", "ARCHIVED"])))
    .orderBy(asc(assignments.dueAt));
  const students = await db
    .select({ id: users.id, fullName: users.fullName, username: users.username })
    .from(classMembers)
    .innerJoin(users, eq(users.id, classMembers.userId))
    .where(and(eq(classMembers.classId, classId), eq(classMembers.role, "STUDENT"), eq(classMembers.status, "ACTIVE")))
    .orderBy(asc(users.fullName));
  const subs = cols.length
    ? await db
        .select({ assignmentId: submissions.assignmentId, studentId: submissions.studentId, status: submissions.status, score: submissions.score })
        .from(submissions)
        .where(inArray(submissions.assignmentId, cols.map((c) => c.id)))
    : [];
  const rows = students.map((st) => {
    let sum = 0;
    let wsum = 0;
    let missing = 0;
    const cells = cols.map((c) => {
      const sub = subs.find((x) => x.assignmentId === c.id && x.studentId === st.id);
      const graded = sub && (sub.status === "GRADED" || sub.status === "RETURNED") && sub.score !== null;
      if (graded) {
        const s10 = round2((sub.score! / c.maxPoints) * 10);
        sum += s10 * c.weight;
        wsum += c.weight;
        return { score10: s10, state: "graded" as const };
      }
      if (sub && sub.status !== "DRAFT") return { score10: null, state: "pending" as const };
      if (now > c.dueAt) {
        missing++;
        return { score10: null, state: "missing" as const };
      }
      return { score10: null, state: "open" as const };
    });
    return { ...st, cells, average: wsum ? round2(sum / wsum) : null, missing };
  });
  return { cls: { id: cls.id, name: cls.name }, cols, rows };
}

export async function setGradeWeight(actor: Actor, assignmentId: string, weight: number) {
  const { a } = await requireAssignmentForTeacher(actor, assignmentId);
  await requireFeature(actor, "GRADEBOOK");
  if (![1, 2, 3].includes(weight)) throw new UserError("Hệ số là 1, 2 hoặc 3.");
  await db.update(assignments).set({ gradeWeight: weight }).where(eq(assignments.id, a.id));
  return a.classId;
}

/**
 * Thống kê từng câu (tính năng nâng cao QUIZ_ANALYTICS): tỉ lệ đúng, số em chọn từng phương án, phổ điểm.
 * Chỉ tính bài đã nộp của HS đang ở lớp.
 */
export async function quizAnalytics(actor: Actor, assignmentId: string) {
  const { a } = await requireAssignmentForTeacher(actor, assignmentId);
  if (a.type !== "QUIZ") throw new UserError("Bài này không phải trắc nghiệm.");
  await requireFeature(actor, "QUIZ_ANALYTICS");
  const qs = await db.select().from(questions).where(eq(questions.assignmentId, a.id)).orderBy(asc(questions.position));
  const opts = qs.length
    ? await db.select().from(questionOptions).where(inArray(questionOptions.questionId, qs.map((q) => q.id))).orderBy(asc(questionOptions.position))
    : [];
  const subs = await db
    .select({ answers: submissions.quizAnswers, score: submissions.score })
    .from(submissions)
    .innerJoin(
      classMembers,
      and(eq(classMembers.classId, a.classId), eq(classMembers.userId, submissions.studentId), eq(classMembers.role, "STUDENT"), eq(classMembers.status, "ACTIVE")),
    )
    .where(and(eq(submissions.assignmentId, a.id), inArray(submissions.status, ["SUBMITTED", "GRADED", "RETURNED"])));
  const gradable = qs.map((q) => ({
    id: q.id,
    type: q.type,
    points: q.points,
    options: opts.filter((o) => o.questionId === q.id).map((o) => ({ id: o.id, isCorrect: o.isCorrect })),
  }));
  const perQ = qs.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    type: q.type,
    correct: 0,
    answered: 0,
    options: opts.filter((o) => o.questionId === q.id).map((o) => ({ id: o.id, label: o.label, isCorrect: o.isCorrect, picked: 0 })),
  }));
  for (const s of subs) {
    const ans = s.answers ?? {};
    const g = gradeQuiz(gradable, ans);
    for (const q of perQ) {
      const chosen = ans[q.id] ?? [];
      if (chosen.length) q.answered++;
      if (g.perQuestion[q.id]?.correct) q.correct++;
      for (const o of q.options) if (chosen.includes(o.id)) o.picked++;
    }
  }
  // Phổ điểm theo thang 10, nhóm 0–1, 1–2, …, 9–10
  const buckets = Array.from({ length: 10 }, () => 0);
  for (const s of subs) {
    if (s.score === null) continue;
    const s10 = (s.score / a.maxPoints) * 10;
    buckets[Math.min(9, Math.floor(s10))]++;
  }
  const scored = subs.filter((s) => s.score !== null).map((s) => (s.score! / a.maxPoints) * 10);
  return {
    a: { id: a.id, title: a.title, maxPoints: a.maxPoints },
    submitted: subs.length,
    average10: scored.length ? round2(scored.reduce((x, y) => x + y, 0) / scored.length) : null,
    buckets,
    questions: perQ.map((q) => ({ ...q, rate: subs.length ? q.correct / subs.length : null })),
  };
}

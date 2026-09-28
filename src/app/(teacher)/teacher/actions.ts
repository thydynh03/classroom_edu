"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireActor } from "@/server/auth/guard";
import * as classSvc from "@/server/services/classes";
import * as asgSvc from "@/server/services/assignments";
import * as subSvc from "@/server/services/submissions";
import { UserError } from "@/server/services/errors";
import { assignmentSchema, gradeSchema, questionsSchema } from "@/server/validation/assignment";
import { type ActionState, fieldErrorsFrom } from "@/lib/action";
import { fromLocalInputValue } from "@/lib/dates";

const teacher = () => requireActor("TEACHER");
const colorEnum = z.enum(["sky", "mint", "peach", "lilac", "butter", "rose"]);
const classSchema = z.strictObject({
  name: z.string().trim().min(2, "Tên lớp cần ít nhất 2 ký tự").max(80),
  subject: z.string().trim().min(1, "Nhập môn học").max(60),
  schoolYear: z.string().trim().max(20).optional(),
  color: colorEnum,
});

function classInput(fd: FormData) {
  return {
    name: String(fd.get("name") ?? ""),
    subject: String(fd.get("subject") ?? ""),
    schoolYear: String(fd.get("schoolYear") ?? "") || undefined,
    color: String(fd.get("color") ?? "sky"),
  };
}

async function guard<T>(fn: () => Promise<T>): Promise<T | ActionState> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    throw e;
  }
}

// ---------------------------------------------------------------- Lớp học

export async function createClassAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await teacher();
  const parsed = classSchema.safeParse(classInput(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const cls = await classSvc.createClass(actor, parsed.data);
  redirect(`/teacher/classes/${cls.id}?tab=students`);
}

export async function updateClassAction(classId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await teacher();
  const parsed = classSchema.safeParse(classInput(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  await classSvc.updateClass(actor, classId, parsed.data);
  revalidatePath(`/teacher/classes/${classId}`);
  return { ok: true, message: "Đã lưu thông tin lớp." };
}

export async function archiveClassAction(classId: string, archived: boolean) {
  const actor = await teacher();
  await classSvc.setClassArchived(actor, classId, archived);
  revalidatePath("/teacher/classes");
  revalidatePath(`/teacher/classes/${classId}`);
}

export async function regenerateCodeAction(classId: string) {
  const actor = await teacher();
  await classSvc.regenerateJoinCode(actor, classId);
  revalidatePath(`/teacher/classes/${classId}`);
}

export async function toggleJoinAction(classId: string, enabled: boolean) {
  const actor = await teacher();
  await classSvc.setJoinEnabled(actor, classId, enabled);
  revalidatePath(`/teacher/classes/${classId}`);
}

export type BulkResult = ActionState & { created?: { fullName: string; username: string; tempPassword: string }[] };

export async function bulkCreateStudentsAction(classId: string, _: BulkResult, fd: FormData): Promise<BulkResult> {
  const actor = await teacher();
  const names = String(fd.get("names") ?? "").split(/\r?\n/);
  const valid = names.filter((n) => n.trim().length >= 2);
  if (!valid.length) return { fieldErrors: { names: "Nhập ít nhất một họ tên (mỗi dòng một học sinh)" } };
  if (valid.length > 100) return { fieldErrors: { names: "Tối đa 100 học sinh mỗi lần" } };
  const created = await classSvc.bulkCreateStudents(actor, classId, valid);
  revalidatePath(`/teacher/classes/${classId}`);
  return { ok: true, created };
}

export async function addExistingStudentAction(classId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await teacher();
  const username = String(fd.get("username") ?? "").trim();
  if (!username) return { fieldErrors: { username: "Nhập tên đăng nhập của học sinh" } };
  const ok = await classSvc.addExistingStudent(actor, classId, username);
  if (!ok) return { fieldErrors: { username: "Không tìm thấy học sinh với tên đăng nhập này" } };
  revalidatePath(`/teacher/classes/${classId}`);
  return { ok: true, message: `Đã thêm ${username} vào lớp.` };
}

export async function removeStudentAction(classId: string, studentId: string) {
  const actor = await teacher();
  await classSvc.removeStudent(actor, classId, studentId);
  revalidatePath(`/teacher/classes/${classId}`);
}

export async function resetStudentPasswordAction(classId: string, studentId: string) {
  const actor = await teacher();
  const tempPassword = await classSvc.resetStudentPassword(actor, classId, studentId);
  return { tempPassword };
}

// ---------------------------------------------------------------- Bài tập

function assignmentInput(fd: FormData) {
  const due = String(fd.get("dueAt") ?? "");
  return {
    classIds: fd.getAll("classIds").map(String),
    type: String(fd.get("type") ?? "WRITTEN"),
    title: String(fd.get("title") ?? ""),
    body: String(fd.get("body") ?? ""),
    maxPoints: String(fd.get("maxPoints") ?? "10"),
    dueAt: due ? fromLocalInputValue(due) : undefined,
    allowLate: fd.get("allowLate") === "on",
    allowResubmit: fd.get("allowResubmit") === "on",
    showResults: String(fd.get("showResults") ?? "IMMEDIATE"),
    attachmentIds: fd.getAll("attachmentIds").map(String),
  };
}

export async function createAssignmentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await teacher();
  const parsed = assignmentSchema.safeParse(assignmentInput(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const intent = fd.get("intent");
  const publishAtRaw = String(fd.get("publishAt") ?? "");
  if (intent === "schedule" && !publishAtRaw) return { fieldErrors: { publishAt: "Chọn thời điểm đăng" } };
  const ids = await asgSvc.createAssignment(actor, parsed.data);
  if (parsed.data.type === "WRITTEN") {
    if (intent === "publish") for (const id of ids) await asgSvc.publishAssignment(actor, id);
    if (intent === "schedule") {
      const r = await guard(async () => {
        for (const id of ids) await asgSvc.scheduleAssignment(actor, id, fromLocalInputValue(publishAtRaw));
      });
      if (r && typeof r === "object" && "error" in r) redirect(`/teacher/assignments/${ids[0]}?scheduleError=1`);
    }
  }
  revalidatePath("/teacher");
  redirect(parsed.data.type === "QUIZ" ? `/teacher/assignments/${ids[0]}/questions` : `/teacher/assignments/${ids[0]}`);
}

export async function updateAssignmentAction(assignmentId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await teacher();
  const { classIds: _ignored, ...input } = assignmentInput(fd);
  void _ignored;
  const parsed = assignmentSchema.omit({ classIds: true }).safeParse(input);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  await asgSvc.updateAssignment(actor, assignmentId, parsed.data);
  revalidatePath(`/teacher/assignments/${assignmentId}`);
  redirect(`/teacher/assignments/${assignmentId}`);
}

export async function publishAssignmentAction(assignmentId: string): Promise<ActionState> {
  const actor = await teacher();
  const r = await guard(() => asgSvc.publishAssignment(actor, assignmentId));
  revalidatePath(`/teacher/assignments/${assignmentId}`);
  return r && typeof r === "object" && "error" in r ? r : { ok: true, message: "Đã đăng bài. Học sinh đã nhận thông báo." };
}

export async function scheduleAssignmentAction(assignmentId: string, publishAtLocal: string): Promise<ActionState> {
  const actor = await teacher();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(publishAtLocal)) return { error: "Chọn thời điểm đăng" };
  const r = await guard(() => asgSvc.scheduleAssignment(actor, assignmentId, fromLocalInputValue(publishAtLocal)));
  if (r && typeof r === "object" && "error" in r) return r;
  revalidatePath(`/teacher/assignments/${assignmentId}`);
  return { ok: true, message: "Đã lên lịch đăng bài." };
}

export async function unscheduleAssignmentAction(assignmentId: string) {
  const actor = await teacher();
  await asgSvc.unscheduleAssignment(actor, assignmentId);
  revalidatePath(`/teacher/assignments/${assignmentId}`);
}

export async function archiveAssignmentAction(assignmentId: string, archived: boolean) {
  const actor = await teacher();
  await asgSvc.setAssignmentArchived(actor, assignmentId, archived);
  revalidatePath(`/teacher/assignments/${assignmentId}`);
  revalidatePath("/teacher/assignments");
}

export async function deleteAssignmentAction(assignmentId: string): Promise<ActionState> {
  const actor = await teacher();
  const r = await guard(() => asgSvc.deleteDraftAssignment(actor, assignmentId));
  if (r && typeof r === "object" && "error" in r) return r;
  redirect("/teacher/assignments");
}

export async function saveQuestionsAction(assignmentId: string, payload: unknown): Promise<ActionState> {
  const actor = await teacher();
  const parsed = questionsSchema.safeParse(payload);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const idx = typeof first.path[0] === "number" ? `Câu ${first.path[0] + 1}: ` : "";
    return { error: `${idx}${first.message}` };
  }
  const r = await guard(() => asgSvc.saveQuestions(actor, assignmentId, parsed.data));
  if (r && typeof r === "object" && "error" in r) return r;
  revalidatePath(`/teacher/assignments/${assignmentId}`);
  return { ok: true, message: "Đã lưu câu hỏi." };
}

// ---------------------------------------------------------------- Chấm bài

export async function saveGradeAction(
  submissionId: string,
  input: { score: string; feedback: string; returnNow: boolean },
): Promise<ActionState> {
  const actor = await teacher();
  const parsed = gradeSchema.safeParse({ score: input.score.replace(",", "."), feedback: input.feedback });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const r = await guard(() => subSvc.saveGrade(actor, submissionId, { ...parsed.data, returnNow: input.returnNow }));
  if (r && typeof r === "object" && "error" in r) return r;
  revalidatePath("/teacher/grading", "layout");
  return { ok: true, message: input.returnNow ? "Đã trả bài." : "Đã lưu điểm (chưa trả)." };
}

export async function returnAllAction(assignmentId: string): Promise<ActionState> {
  const actor = await teacher();
  const n = await subSvc.returnAllGraded(actor, assignmentId);
  revalidatePath(`/teacher/assignments/${assignmentId}`);
  revalidatePath("/teacher/grading", "layout");
  return { ok: true, message: n ? `Đã trả ${n} bài.` : "Không có bài nào đã chấm mà chưa trả." };
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireActor } from "@/server/auth/guard";
import * as classSvc from "@/server/services/classes";
import * as asgSvc from "@/server/services/assignments";
import * as subSvc from "@/server/services/submissions";
import * as upgradeSvc from "@/server/services/upgrades";
import { FEATURE_KEYS } from "@/lib/premium-features";
import { importQuiz, QUIZ_IMPORT_MAX_BYTES } from "@/server/services/quiz-import";
import * as gradebookSvc from "@/server/services/gradebook";
import * as materialSvc from "@/server/services/materials";
import type { ParseResult } from "@/server/services/quiz-import-parse";
import { rateLimit } from "@/server/rate-limit";
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

export async function inviteStudentAction(classId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await teacher();
  const username = String(fd.get("username") ?? "").trim().slice(0, 64);
  if (!username) return { fieldErrors: { username: "Nhập tên đăng nhập của học sinh" } };
  const r = await classSvc.inviteExistingStudent(actor, classId, username);
  if (r === "not_found") return { fieldErrors: { username: "Không tìm thấy học sinh với tên đăng nhập này" } };
  if (r === "already") return { fieldErrors: { username: "Học sinh này đã ở trong lớp" } };
  return { ok: true, message: `Đã gửi lời mời tới ${username}. Học sinh cần bấm Đồng ý trong mục Lớp học thì mới vào lớp.` };
}

export async function removeStudentAction(classId: string, studentId: string) {
  const actor = await teacher();
  await classSvc.removeStudent(actor, classId, studentId);
  revalidatePath(`/teacher/classes/${classId}`);
}

const fullNameSchema = z.string().trim().min(2, "Họ tên cần ít nhất 2 ký tự").max(100, "Họ tên quá dài");

export async function renameStudentAction(classId: string, studentId: string, fullName: string): Promise<ActionState> {
  const actor = await teacher();
  const parsed = fullNameSchema.safeParse(fullName);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const r = await guard(() => classSvc.renameStudent(actor, classId, String(studentId), parsed.data.replace(/\s+/g, " ")));
  if (r && typeof r === "object" && "error" in r) return r;
  revalidatePath(`/teacher/classes/${classId}`);
  return { ok: true, message: "Đã sửa họ tên." };
}

export async function resetStudentPasswordAction(classId: string, studentId: string): Promise<{ tempPassword?: string; error?: string }> {
  const actor = await teacher();
  const r = await guard(() => classSvc.resetStudentPassword(actor, classId, String(studentId)));
  return typeof r === "string" ? { tempPassword: r } : { error: r.error };
}

const studentIdsSchema = z.array(z.uuid()).min(1).max(200);

export async function resetStudentPasswordsAction(classId: string, studentIds: string[]) {
  const actor = await teacher();
  const ids = studentIdsSchema.safeParse(studentIds);
  if (!ids.success) return { created: [] };
  const r = await guard(() => classSvc.resetStudentPasswords(actor, classId, ids.data));
  if (!Array.isArray(r)) return { created: [], error: r.error };
  revalidatePath(`/teacher/classes/${classId}`);
  return { created: r };
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

export async function remindMissingAction(assignmentId: string): Promise<ActionState> {
  const actor = await teacher();
  const r = await guard(() => subSvc.remindMissing(actor, String(assignmentId)));
  if (typeof r !== "number") return r;
  return { ok: true, message: r ? `Đã nhắc ${r} học sinh chưa nộp.` : "Các em chưa nộp đã được nhắc trong 6 giờ qua." };
}

// ---------------------------------------------------------------- Nâng cao (mua tính năng)

const upgradeSchema = z.strictObject({
  featureKey: z.enum(FEATURE_KEYS),
  plan: z.enum(["MONTH", "YEAR", "INTEREST"]),
  contact: z.string().trim().max(100).optional(),
  note: z.string().trim().max(500).optional(),
});

export async function requestUpgradeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await teacher();
  const parsed = upgradeSchema.safeParse({
    featureKey: String(fd.get("featureKey") ?? ""),
    plan: String(fd.get("plan") ?? "MONTH"),
    contact: String(fd.get("contact") ?? "") || undefined,
    note: String(fd.get("note") ?? "") || undefined,
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  if (!(await rateLimit(`upgrade:${actor.id}`, 10, 60 * 60_000))) return { error: "Bạn gửi quá nhiều yêu cầu. Thử lại sau." };
  const r = await guard(() => upgradeSvc.requestUpgrade(actor, parsed.data));
  if (r && typeof r === "object" && "error" in r) return r;
  revalidatePath("/teacher/upgrade");
  return { ok: true, message: "Đã gửi yêu cầu. Quản trị viên sẽ liên hệ với bạn để hoàn tất." };
}

export async function cancelUpgradeAction(featureKey: string) {
  const actor = await teacher();
  await upgradeSvc.cancelMyRequest(actor, String(featureKey).slice(0, 40));
  revalidatePath("/teacher/upgrade");
}

export type ImportQuizResult = ActionState & { questions?: ParseResult["questions"]; warnings?: string[] };

/** Tách đề từ văn bản dán hoặc file .docx/.xlsx (tính năng nâng cao). Không lưu, chỉ trả về để GV xem lại. */
export async function importQuizAction(assignmentId: string, fd: FormData): Promise<ImportQuizResult> {
  const actor = await teacher();
  const file = fd.get("file");
  const text = fd.get("text");
  const r = await guard(async () => {
    if (file instanceof File && file.size > 0) {
      if (file.size > QUIZ_IMPORT_MAX_BYTES) throw new UserError("File quá lớn (tối đa 4 MB).");
      return importQuiz(actor, String(assignmentId), { file: { name: file.name.slice(0, 200), bytes: Buffer.from(await file.arrayBuffer()) } });
    }
    return importQuiz(actor, String(assignmentId), { text: typeof text === "string" ? text : "" });
  });
  if ("error" in r && !("questions" in r)) return { error: r.error };
  const parsed = r as ParseResult;
  return { ok: true, questions: parsed.questions, warnings: parsed.warnings };
}

export async function setGradeWeightAction(assignmentId: string, weight: number): Promise<ActionState> {
  const actor = await teacher();
  const w = z.coerce.number().int().min(1).max(3).safeParse(weight);
  if (!w.success) return { error: "Hệ số là 1, 2 hoặc 3." };
  const r = await guard(() => gradebookSvc.setGradeWeight(actor, String(assignmentId), w.data));
  if (typeof r !== "string") return r;
  revalidatePath(`/teacher/classes/${r}`);
  return { ok: true };
}

const materialSchema = z.strictObject({
  title: z.string().trim().min(2, "Tiêu đề cần ít nhất 2 ký tự").max(200),
  body: z.string().max(20_000, "Nội dung quá dài").default(""),
  attachmentIds: z.array(z.uuid()).max(10).default([]),
});

export async function createMaterialAction(classId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await teacher();
  const parsed = materialSchema.safeParse({
    title: String(fd.get("title") ?? ""),
    body: String(fd.get("body") ?? ""),
    attachmentIds: fd.getAll("attachmentIds").map(String),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  if (!parsed.data.body.trim() && !parsed.data.attachmentIds.length) return { fieldErrors: { body: "Viết nội dung hoặc đính kèm ít nhất một file" } };
  await materialSvc.createMaterial(actor, String(classId), parsed.data);
  revalidatePath(`/teacher/classes/${classId}`);
  return { ok: true, message: "Đã đăng tài liệu. Học sinh đã nhận thông báo." };
}

export async function deleteMaterialAction(materialId: string) {
  const actor = await teacher();
  const classId = await materialSvc.deleteMaterial(actor, String(materialId));
  revalidatePath(`/teacher/classes/${classId}`);
}

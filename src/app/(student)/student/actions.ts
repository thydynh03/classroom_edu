"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActor } from "@/server/auth/guard";
import * as subSvc from "@/server/services/submissions";
import { respondInvite } from "@/server/services/classes";
import { UserError } from "@/server/services/errors";
import type { ActionState } from "@/lib/action";

const student = () => requireActor("STUDENT");
const writtenSchema = z.strictObject({
  content: z.string().max(50_000, "Bài viết quá dài"),
  fileIds: z.array(z.uuid()).max(10),
});
const quizSchema = z.record(z.uuid(), z.array(z.uuid()).max(8));

async function run(fn: () => Promise<unknown>, okMessage: string, assignmentId: string): Promise<ActionState> {
  try {
    await fn();
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    throw e;
  }
  revalidatePath(`/student/assignments/${assignmentId}`);
  revalidatePath("/student");
  return { ok: true, message: okMessage };
}

export async function saveDraftAction(assignmentId: string, input: { content: string; fileIds: string[] }): Promise<ActionState> {
  const actor = await student();
  const parsed = writtenSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  return run(() => subSvc.saveDraft(actor, assignmentId, parsed.data.content, parsed.data.fileIds), "Đã lưu nháp", assignmentId);
}

export async function submitAction(assignmentId: string, input: { content: string; fileIds: string[] }): Promise<ActionState> {
  const actor = await student();
  const parsed = writtenSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  return run(() => subSvc.submitWritten(actor, assignmentId, parsed.data.content, parsed.data.fileIds), "Đã nộp bài", assignmentId);
}

export async function unsubmitAction(assignmentId: string): Promise<ActionState> {
  const actor = await student();
  return run(() => subSvc.unsubmit(actor, assignmentId), "Đã rút lại bài. Sửa xong nhớ nộp lại.", assignmentId);
}

export async function submitQuizAction(assignmentId: string, answers: unknown): Promise<ActionState> {
  const actor = await student();
  const parsed = quizSchema.safeParse(answers);
  if (!parsed.success) return { error: "Câu trả lời không hợp lệ." };
  return run(() => subSvc.submitQuiz(actor, assignmentId, parsed.data), "Đã nộp bài trắc nghiệm", assignmentId);
}

/** Đồng ý / từ chối lời mời vào lớp (chỉ lời mời của chính mình; id lạ → 404). */
export async function respondInviteAction(inviteId: string, accept: boolean): Promise<ActionState & { classId?: string }> {
  const actor = await student();
  const id = z.uuid().safeParse(inviteId);
  if (!id.success || typeof accept !== "boolean") return { error: "Lời mời không hợp lệ." };
  const classId = await respondInvite(actor, id.data, accept);
  revalidatePath("/student/classes");
  revalidatePath("/student");
  return { ok: true, classId, message: accept ? "Đã vào lớp." : "Đã từ chối lời mời." };
}

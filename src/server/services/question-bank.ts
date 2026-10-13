import "server-only";
import { notFound } from "next/navigation";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { bankQuestions } from "@/server/db/schema";
import type { Actor } from "@/server/auth/session";
import { isUuid, requireRole } from "@/server/policy";
import type { BankQuestionInput } from "@/server/validation/assignment";
import { UserError } from "./errors";

export const BANK_MAX = 2000;

/** Ngân hàng là của riêng từng giáo viên: mọi truy vấn đều lọc theo ownerId = actor.id. */
export async function listBankQuestions(actor: Actor) {
  requireRole(actor, "TEACHER");
  return db
    .select({
      id: bankQuestions.id,
      type: bankQuestions.type,
      prompt: bankQuestions.prompt,
      points: bankQuestions.points,
      topic: bankQuestions.topic,
      options: bankQuestions.options,
    })
    .from(bankQuestions)
    .where(eq(bankQuestions.ownerId, actor.id))
    .orderBy(desc(bankQuestions.updatedAt), desc(bankQuestions.id))
    .limit(BANK_MAX);
}

const values = (actor: Actor, i: BankQuestionInput) => ({
  ownerId: actor.id,
  topic: i.topic,
  type: i.question.type,
  prompt: i.question.prompt,
  points: i.question.points,
  options: i.question.options,
});

/** Thêm một hoặc nhiều câu. Bỏ qua câu trùng hẳn nội dung với câu đã có. Trả về số câu thêm mới. */
export async function addBankQuestions(actor: Actor, input: BankQuestionInput[]) {
  requireRole(actor, "TEACHER");
  const existing = await db.select({ prompt: bankQuestions.prompt }).from(bankQuestions).where(eq(bankQuestions.ownerId, actor.id));
  const seen = new Set(existing.map((e) => e.prompt));
  const fresh = input.filter((i) => {
    if (seen.has(i.question.prompt)) return false;
    seen.add(i.question.prompt);
    return true;
  });
  if (existing.length + fresh.length > BANK_MAX) throw new UserError(`Ngân hàng tối đa ${BANK_MAX} câu. Xóa bớt câu cũ trước khi thêm.`);
  if (fresh.length) await db.insert(bankQuestions).values(fresh.map((i) => values(actor, i)));
  return fresh.length;
}

export async function updateBankQuestion(actor: Actor, id: string, input: BankQuestionInput) {
  requireRole(actor, "TEACHER");
  if (!isUuid(id)) notFound();
  const { ownerId: _owner, ...set } = values(actor, input);
  void _owner;
  const rows = await db
    .update(bankQuestions)
    .set({ ...set, updatedAt: new Date() })
    .where(and(eq(bankQuestions.id, id), eq(bankQuestions.ownerId, actor.id)))
    .returning({ id: bankQuestions.id });
  if (!rows.length) notFound();
}

export async function deleteBankQuestion(actor: Actor, id: string) {
  requireRole(actor, "TEACHER");
  if (!isUuid(id)) notFound();
  const rows = await db
    .delete(bankQuestions)
    .where(and(eq(bankQuestions.id, id), eq(bankQuestions.ownerId, actor.id)))
    .returning({ id: bankQuestions.id });
  if (!rows.length) notFound();
}

export async function bankCount(actor: Actor) {
  requireRole(actor, "TEACHER");
  const [r] = await db.select({ n: count() }).from(bankQuestions).where(eq(bankQuestions.ownerId, actor.id));
  return r?.n ?? 0;
}

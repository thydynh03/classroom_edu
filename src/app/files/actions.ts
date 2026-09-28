"use server";

import { z } from "zod";
import { requireActor } from "@/server/auth/guard";
import { completeUpload, createUpload } from "@/server/services/files";
import { UserError } from "@/server/services/errors";

const createSchema = z.strictObject({
  purpose: z.enum(["ATTACHMENT", "SUBMISSION"]),
  contextId: z.uuid(),
  name: z.string().min(1).max(255),
  mime: z.string().min(1).max(150),
  size: z.number().int().positive(),
});

export type UploadTicket = { ok: true; fileId: string; url: string } | { ok: false; error: string };
export type UploadedFile = { ok: true; file: { id: string; name: string; mime: string; size: number } } | { ok: false; error: string };

export async function requestUploadAction(input: unknown): Promise<UploadTicket> {
  const actor = await requireActor();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Thông tin file không hợp lệ." };
  if (parsed.data.purpose === "ATTACHMENT" && actor.role !== "TEACHER") return { ok: false, error: "Không có quyền." };
  if (parsed.data.purpose === "SUBMISSION" && actor.role !== "STUDENT") return { ok: false, error: "Không có quyền." };
  try {
    return { ok: true, ...(await createUpload(actor, parsed.data)) };
  } catch (e) {
    if (e instanceof UserError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function completeUploadAction(fileId: string): Promise<UploadedFile> {
  const actor = await requireActor();
  try {
    return { ok: true, file: await completeUpload(actor, String(fileId)) };
  } catch (e) {
    if (e instanceof UserError) return { ok: false, error: e.message };
    throw e;
  }
}

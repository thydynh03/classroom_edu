import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/server/db/client";
import { classMaterials, classMembers, files, materialAttachments } from "@/server/db/schema";
import type { Actor } from "@/server/auth/session";
import { isUuid, requireStudentOfClass, requireTeacherOfClass } from "@/server/policy";
import { notify } from "./notifications";

/** Tài liệu của lớp: GV đăng (văn bản + file), HS trong lớp xem/tải. Không có hạn nộp, không nộp bài. */

async function withAttachments<T extends { id: string }>(list: T[]) {
  if (!list.length) return [];
  const atts = await db
    .select({ materialId: materialAttachments.materialId, id: files.id, name: files.originalName, mime: files.mime, size: files.sizeBytes })
    .from(materialAttachments)
    .innerJoin(files, eq(files.id, materialAttachments.fileId))
    .where(and(inArray(materialAttachments.materialId, list.map((m) => m.id)), eq(files.status, "READY")));
  return list.map((m) => ({ ...m, files: atts.filter((a) => a.materialId === m.id).map(({ materialId: _m, ...f }) => (void _m, f)) }));
}

const columns = { id: classMaterials.id, title: classMaterials.title, body: classMaterials.body, createdAt: classMaterials.createdAt };

export async function listMaterials(actor: Actor, classId: string) {
  await requireTeacherOfClass(actor, classId);
  return withAttachments(await db.select(columns).from(classMaterials).where(eq(classMaterials.classId, classId)).orderBy(desc(classMaterials.createdAt)));
}

export async function listMaterialsForStudent(actor: Actor, classId: string) {
  await requireStudentOfClass(actor, classId);
  return withAttachments(await db.select(columns).from(classMaterials).where(eq(classMaterials.classId, classId)).orderBy(desc(classMaterials.createdAt)));
}

export async function createMaterial(actor: Actor, classId: string, input: { title: string; body: string; attachmentIds: string[] }) {
  const cls = await requireTeacherOfClass(actor, classId);
  return db.transaction(async (tx) => {
    const [m] = await tx.insert(classMaterials).values({ classId, title: input.title, body: input.body, createdBy: actor.id }).returning({ id: classMaterials.id });
    if (input.attachmentIds.length) {
      // Chỉ file chính GV upload cho đúng lớp này, đã kiểm tra xong.
      const own = await tx
        .select({ id: files.id })
        .from(files)
        .where(and(inArray(files.id, input.attachmentIds), eq(files.uploaderId, actor.id), eq(files.classId, classId), eq(files.purpose, "ATTACHMENT"), eq(files.status, "READY")));
      if (own.length) await tx.insert(materialAttachments).values(own.map((f) => ({ materialId: m.id, fileId: f.id })));
    }
    const students = await tx
      .select({ id: classMembers.userId })
      .from(classMembers)
      .where(and(eq(classMembers.classId, classId), eq(classMembers.role, "STUDENT"), eq(classMembers.status, "ACTIVE")));
    await notify(
      tx,
      students.map((s) => ({
        recipientId: s.id,
        type: "MATERIAL_CREATED" as const,
        title: `Tài liệu mới lớp ${cls.name}: ${input.title}`,
        href: `/student/classes/${classId}`,
        dedupeKey: `material:${m.id}:${s.id}`,
      })),
    );
    return m.id;
  });
}

export async function deleteMaterial(actor: Actor, materialId: string) {
  if (!isUuid(materialId)) notFound();
  const [m] = await db.select({ classId: classMaterials.classId }).from(classMaterials).where(eq(classMaterials.id, materialId));
  if (!m) notFound();
  await requireTeacherOfClass(actor, m.classId);
  await db.delete(classMaterials).where(eq(classMaterials.id, materialId));
  return m.classId;
}

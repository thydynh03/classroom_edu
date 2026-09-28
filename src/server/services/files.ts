import "server-only";
import { and, eq, or } from "drizzle-orm";
import { notFound } from "next/navigation";
import { uuidv7 } from "uuidv7";
import { db } from "@/server/db/client";
import { assignmentAttachments, assignments, auditLogs, classMembers, files, submissionFiles, submissions } from "@/server/db/schema";
import type { Actor } from "@/server/auth/session";
import {
  isUuid,
  membershipOf,
  requireAssignmentForStudent,
  requireTeacherOfClass,
} from "@/server/policy";
import { headObject, presignDownload, presignUpload, readHead, streamObject } from "@/server/storage/s3";
import { clamavConfig, scanWithClamd } from "@/server/storage/clamav";
import { FILE_RULES, isAllowed, magicMatches, sanitizeFilename } from "@/server/storage/file-rules";
import { UserError } from "./errors";

export async function createUpload(
  actor: Actor,
  input: { purpose: "ATTACHMENT" | "SUBMISSION"; contextId: string; name: string; mime: string; size: number },
) {
  const name = sanitizeFilename(input.name);
  if (!isAllowed(name, input.mime)) throw new UserError("Loại file này không được phép.");
  const rule = FILE_RULES[input.purpose];
  if (input.size <= 0 || input.size > rule.maxBytes) {
    throw new UserError(`File quá lớn. Tối đa ${rule.maxBytes / 1024 / 1024} MB.`);
  }
  let classId: string;
  let key: string;
  const fileId = uuidv7();
  if (input.purpose === "ATTACHMENT") {
    // contextId = classId (GV upload tài liệu trước khi bài tập tồn tại)
    const cls = await requireTeacherOfClass(actor, input.contextId);
    classId = cls.id;
    key = `att/${classId}/${fileId}`;
  } else {
    // contextId = assignmentId, chỉ học sinh của lớp
    const { a } = await requireAssignmentForStudent(actor, input.contextId);
    classId = a.classId;
    key = `sub/${classId}/${a.id}/${actor.id}/${fileId}`;
  }
  // Kiểm tra quyền + loại file trước, rồi mới báo thiếu cấu hình storage.
  if (!process.env.S3_ENDPOINT || !process.env.S3_BUCKET) {
    throw new UserError("Hệ thống chưa cấu hình nơi lưu file. Báo quản trị viên, tạm thời hãy viết bài trực tiếp.");
  }
  await db.insert(files).values({
    id: fileId,
    uploaderId: actor.id,
    purpose: input.purpose,
    classId,
    storageKey: key,
    originalName: name,
    mime: input.mime,
    sizeBytes: input.size,
  });
  const url = await presignUpload(key, input.mime, input.size);
  return { fileId, url };
}

export async function completeUpload(actor: Actor, fileId: string) {
  if (!isUuid(fileId)) notFound();
  const [f] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.uploaderId, actor.id)))
    .limit(1);
  if (!f) notFound();
  if (f.status === "READY") return { id: f.id, name: f.originalName, mime: f.mime, size: f.sizeBytes };
  const head = await headObject(f.storageKey);
  if (!head || head.size !== f.sizeBytes) throw new UserError("Upload chưa hoàn tất. Thử lại.");
  const bytes = await readHead(f.storageKey, 16);
  if (!magicMatches(f.mime, bytes)) {
    await db.update(files).set({ status: "DELETED" }).where(eq(files.id, f.id));
    throw new UserError("Nội dung file không khớp với loại file. File đã bị từ chối.");
  }
  const clam = clamavConfig();
  if (clam) {
    let result;
    try {
      result = await scanWithClamd(await streamObject(f.storageKey), clam);
    } catch (e) {
      // Không quét được thì không cho dùng file (fail closed), để người dùng thử lại.
      console.error("[clamav] quét lỗi", { fileId: f.id, error: (e as Error).message });
      throw new UserError("Chưa kiểm tra được file. Thử lại sau ít phút.");
    }
    if (!result.clean) {
      await db.update(files).set({ status: "INFECTED" }).where(eq(files.id, f.id));
      await db.insert(auditLogs).values({
        actorId: actor.id,
        action: "file.infected",
        targetType: "file",
        targetId: f.id,
        meta: { signature: result.signature },
      });
      throw new UserError("File có dấu hiệu chứa mã độc nên đã bị chặn.");
    }
  }
  await db.update(files).set({ status: "READY" }).where(eq(files.id, f.id));
  return { id: f.id, name: f.originalName, mime: f.mime, size: f.sizeBytes };
}

/** Kiểm tra quyền tải file rồi trả presigned URL ngắn hạn. */
export async function downloadUrl(actor: Actor, fileId: string, inline: boolean) {
  if (!isUuid(fileId)) notFound();
  const [f] = await db.select().from(files).where(eq(files.id, fileId)).limit(1);
  if (!f || f.status !== "READY") notFound();
  if (!(await canReadFile(actor, f))) notFound();
  const safeInline = inline && (f.mime.startsWith("image/") || f.mime === "application/pdf");
  return presignDownload(f.storageKey, f.originalName, safeInline);
}

async function canReadFile(actor: Actor, f: typeof files.$inferSelect) {
  if (f.uploaderId === actor.id) return true;
  if (f.purpose === "ATTACHMENT") {
    // Tài liệu có thể gắn với bản sao bài tập ở nhiều lớp: xét qua từng bài có gắn file.
    const [link] = await db
      .select({ id: assignments.id })
      .from(assignmentAttachments)
      .innerJoin(assignments, eq(assignments.id, assignmentAttachments.assignmentId))
      .innerJoin(
        classMembers,
        and(
          eq(classMembers.classId, assignments.classId),
          eq(classMembers.userId, actor.id),
          eq(classMembers.status, "ACTIVE"),
        ),
      )
      .where(
        and(
          eq(assignmentAttachments.fileId, f.id),
          or(eq(classMembers.role, "TEACHER"), eq(assignments.status, "PUBLISHED")),
        ),
      )
      .limit(1);
    return !!link;
  }
  // File bài nộp: chỉ GV của lớp chứa bài nộp (học sinh chủ bài đã khớp uploader ở trên).
  if ((await membershipOf(actor.id, f.classId)) !== "TEACHER") return false;
  const [link] = await db
    .select({ id: submissions.id })
    .from(submissionFiles)
    .innerJoin(submissions, eq(submissions.id, submissionFiles.submissionId))
    .where(eq(submissionFiles.fileId, f.id))
    .limit(1);
  return !!link;
}

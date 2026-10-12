import "server-only";
import type { Actor } from "@/server/auth/session";
import { requireAssignmentForTeacher } from "@/server/policy";
import { requireFeature } from "@/server/entitlements";
import { htmlToMarkedText, parseQuizRows, parseQuizText, type ParseResult } from "./quiz-import-parse";
import { UserError } from "./errors";

export const QUIZ_IMPORT_MAX_BYTES = 4 * 1024 * 1024;

/**
 * Nhập đề (tính năng nâng cao QUIZ_IMPORT): chỉ TÁCH và trả về câu hỏi để GV xem/sửa trong trình soạn,
 * không lưu. GV bấm Lưu thì đi qua saveQuestions như bình thường (vẫn validate + khóa khi đã có bài nộp).
 */
export async function importQuiz(actor: Actor, assignmentId: string, input: { text?: string; file?: { name: string; bytes: Buffer } }): Promise<ParseResult> {
  const { a } = await requireAssignmentForTeacher(actor, assignmentId);
  if (a.type !== "QUIZ") throw new UserError("Bài này không phải trắc nghiệm.");
  await requireFeature(actor, "QUIZ_IMPORT");
  if (input.file) {
    const { name, bytes } = input.file;
    if (bytes.length > QUIZ_IMPORT_MAX_BYTES) throw new UserError("File quá lớn (tối đa 4 MB). Xóa bớt ảnh trong file rồi thử lại.");
    const ext = name.toLowerCase().split(".").pop();
    const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b; // .docx/.xlsx đều là file zip
    if (!isZip || (ext !== "docx" && ext !== "xlsx")) throw new UserError("Chỉ nhận file .docx (Word) hoặc .xlsx (Excel). File .doc/.xls hãy lưu lại dạng mới.");
    try {
      if (ext === "docx") {
        const mammoth = await import("mammoth");
        // mammoth mặc định bỏ gạch chân: map "u => u" để đáp án gạch chân cũng được nhận.
        const { value } = await mammoth.convertToHtml({ buffer: bytes }, { styleMap: ["u => u"] });
        return parseQuizText(htmlToMarkedText(value));
      }
      const { readSheet } = await import("read-excel-file/node");
      return parseQuizRows(await readSheet(bytes));
    } catch (e) {
      if (e instanceof UserError) throw e;
      console.error("[quiz-import] đọc file lỗi", { ext, error: (e as Error).message });
      throw new UserError("Không đọc được file. Hãy mở bằng Word/Excel, lưu lại rồi thử lại.");
    }
  }
  const text = (input.text ?? "").slice(0, 200_000);
  if (!text.trim()) throw new UserError("Dán nội dung đề hoặc chọn file.");
  return parseQuizText(text);
}

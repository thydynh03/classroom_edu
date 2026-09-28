import { describe, expect, it } from "vitest";
import { gradeQuiz, scaleScore } from "@/server/services/quiz-grading";
import { canEdit, displayStatus, isLateAt, resultsVisible } from "@/server/services/submission-rules";
import { isAllowed, magicMatches, sanitizeFilename } from "@/server/storage/file-rules";
import { dueLabel, fromLocalInputValue, toLocalInputValue, durationVN } from "@/lib/dates";

const q = (id: string, type: "SINGLE" | "MULTI" | "TRUE_FALSE", correct: string[], all: string[], points = 1) => ({
  id,
  type,
  points,
  options: all.map((o) => ({ id: o, isCorrect: correct.includes(o) })),
});

describe("gradeQuiz", () => {
  const questions = [
    q("q1", "SINGLE", ["a"], ["a", "b", "c"], 2),
    q("q2", "MULTI", ["x", "y"], ["x", "y", "z"], 3),
    q("q3", "TRUE_FALSE", ["f"], ["t", "f"], 1),
  ];

  it("chấm đúng toàn bộ", () => {
    const r = gradeQuiz(questions, { q1: ["a"], q2: ["y", "x"], q3: ["f"] });
    expect(r.score).toBe(6);
    expect(r.maxScore).toBe(6);
  });

  it("câu nhiều đáp án: thiếu hoặc thừa đều 0 điểm", () => {
    expect(gradeQuiz(questions, { q2: ["x"] }).perQuestion.q2.correct).toBe(false);
    expect(gradeQuiz(questions, { q2: ["x", "y", "z"] }).perQuestion.q2.correct).toBe(false);
  });

  it("câu một đáp án: chọn 2 lựa chọn bị tính sai (không tin client)", () => {
    expect(gradeQuiz(questions, { q1: ["a", "b"] }).perQuestion.q1.correct).toBe(false);
  });

  it("bỏ qua id lựa chọn không thuộc câu hỏi", () => {
    expect(gradeQuiz(questions, { q1: ["hacked", "a"] }).perQuestion.q1.correct).toBe(true);
    expect(gradeQuiz(questions, { q3: ["t", "evil"] }).score).toBe(0);
  });

  it("không trả lời → 0", () => {
    expect(gradeQuiz(questions, {}).score).toBe(0);
  });

  it("quy đổi thang điểm", () => {
    expect(scaleScore(4.5, 6, 10)).toBe(7.5);
    expect(scaleScore(0, 0, 10)).toBe(0);
  });
});

describe("vòng đời bài nộp", () => {
  const due = new Date("2026-09-30T16:59:00Z");
  const before = new Date("2026-09-30T10:00:00Z");
  const after = new Date("2026-10-01T01:00:00Z");
  const written = { dueAt: due, allowLate: true, allowResubmit: true, type: "WRITTEN" as const };

  it("trạng thái hiển thị", () => {
    expect(displayStatus(null, due, before)).toBe("NOT_STARTED");
    expect(displayStatus(null, due, after)).toBe("MISSING");
    expect(displayStatus({ status: "DRAFT", isLate: false }, due, after)).toBe("MISSING");
    expect(displayStatus({ status: "SUBMITTED", isLate: true }, due, after)).toBe("LATE");
    expect(displayStatus({ status: "GRADED", isLate: true }, due, after)).toBe("GRADED");
  });

  it("trễ hạn tính bằng thời gian server", () => {
    expect(isLateAt(after, due)).toBe(true);
    expect(isLateAt(due, due)).toBe(false);
  });

  it("không nhận bài trễ → chặn sau hạn", () => {
    expect(canEdit(null, { ...written, allowLate: false }, after).ok).toBe(false);
    expect(canEdit(null, written, after).ok).toBe(true);
  });

  it("đã nộp phải rút lại mới sửa; đã trả + cho nộp lại thì sửa được", () => {
    expect(canEdit({ status: "SUBMITTED" }, written, before).ok).toBe(false);
    expect(canEdit({ status: "RETURNED" }, written, before).ok).toBe(true);
    expect(canEdit({ status: "RETURNED" }, { ...written, allowResubmit: false }, before).ok).toBe(false);
    expect(canEdit({ status: "GRADED" }, written, before).ok).toBe(false);
  });

  it("quiz đã nộp không làm lại", () => {
    expect(canEdit({ status: "RETURNED" }, { ...written, type: "QUIZ" }, before).ok).toBe(false);
  });

  it("điểm chỉ hiện khi đã trả (tự luận) hoặc theo cài đặt (quiz)", () => {
    const quiz = { type: "QUIZ" as const, dueAt: due };
    expect(resultsVisible({ status: "GRADED" }, { type: "WRITTEN", showResults: "IMMEDIATE", dueAt: due }, after)).toBe(false);
    expect(resultsVisible({ status: "RETURNED" }, { type: "WRITTEN", showResults: "MANUAL", dueAt: due }, before)).toBe(true);
    expect(resultsVisible({ status: "GRADED" }, { ...quiz, showResults: "AFTER_DUE" }, before)).toBe(false);
    expect(resultsVisible({ status: "GRADED" }, { ...quiz, showResults: "AFTER_DUE" }, after)).toBe(true);
    expect(resultsVisible({ status: "GRADED" }, { ...quiz, showResults: "MANUAL" }, after)).toBe(false);
    expect(resultsVisible(null, { ...quiz, showResults: "IMMEDIATE" }, after)).toBe(false);
  });
});

describe("quy tắc file", () => {
  it("chặn đuôi không khớp MIME và loại nguy hiểm", () => {
    expect(isAllowed("bai.pdf", "application/pdf")).toBe(true);
    expect(isAllowed("bai.pdf.exe", "application/pdf")).toBe(false);
    expect(isAllowed("anh.svg", "image/svg+xml")).toBe(false);
    expect(isAllowed("trang.html", "text/html")).toBe(false);
  });

  it("kiểm tra magic bytes", () => {
    expect(magicMatches("application/pdf", new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe(true);
    expect(magicMatches("image/png", new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBe(false);
    expect(magicMatches("image/jpeg", new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
    expect(magicMatches("text/plain", new Uint8Array([0x41, 0x00, 0x42]))).toBe(false);
  });

  it("làm sạch tên file", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFilename('C:\\x\\bài <1>.pdf')).toBe("bài 1.pdf");
    expect(sanitizeFilename("")).toBe("file");
  });
});

describe("ngày giờ Việt Nam", () => {
  it("hiển thị theo giờ VN", () => {
    expect(dueLabel(new Date("2026-09-30T16:59:00Z"))).toBe("T4 30/09 · 23:59");
  });
  it("datetime-local hai chiều", () => {
    const d = fromLocalInputValue("2026-09-30T23:59");
    expect(d.toISOString()).toBe("2026-09-30T16:59:00.000Z");
    expect(toLocalInputValue(d)).toBe("2026-09-30T23:59");
  });
  it("khoảng thời gian", () => {
    expect(durationVN(2 * 86400_000 + 5 * 3600_000)).toBe("2 ngày 5 giờ");
    expect(durationVN(30_000)).toBe("1 phút");
  });
});

import { isSafeRedirect } from "@/lib/safe-redirect";
describe("chống open redirect", () => {
  it("chỉ nhận đường dẫn nội bộ", () => {
    expect(isSafeRedirect("/teacher")).toBe(true);
    expect(isSafeRedirect("/join/TOAN10A1?x=1")).toBe(true);
    expect(isSafeRedirect("//evil.com")).toBe(false);
    expect(isSafeRedirect("/\\evil.com")).toBe(false);
    expect(isSafeRedirect("https://evil.com")).toBe(false);
    expect(isSafeRedirect("javascript:alert(1)")).toBe(false);
    expect(isSafeRedirect("")).toBe(false);
  });
});

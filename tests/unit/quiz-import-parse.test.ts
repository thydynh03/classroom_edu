import { describe, expect, it } from "vitest";
import { htmlToMarkedText, parseQuizRows, parseQuizText } from "@/server/services/quiz-import-parse";

describe("parseQuizText", () => {
  it("đề dán từ Word: dòng Đáp án, nhiều phương án trên một dòng, điểm trong ngoặc", () => {
    const r = parseQuizText(`ĐỀ KIỂM TRA 15 PHÚT
Câu 1: Mệnh đề nào sau đây đúng? (2 điểm)
A. 2 là số lẻ
B. π > 3
C. 1 + 1 = 3
Đáp án: B
Câu 2. Tập A = {1; 2} có bao nhiêu tập con?
A. 2    B. 3    C. 4    D. 5
Đáp án: C
Câu 3: Chọn các số nguyên tố
A. 2
B. 4
C. 5
Đáp án: A, C`);
    expect(r.warnings).toEqual([]);
    expect(r.questions).toHaveLength(3);
    expect(r.questions[0]).toMatchObject({ type: "SINGLE", prompt: "Mệnh đề nào sau đây đúng?", points: 2 });
    expect(r.questions[0].options.map((o) => o.isCorrect)).toEqual([false, true, false]);
    expect(r.questions[1].options.map((o) => o.label)).toEqual(["2", "3", "4", "5"]);
    expect(r.questions[1].options[2].isCorrect).toBe(true);
    expect(r.questions[2].type).toBe("MULTI");
  });

  it("dấu * và chữ in đậm (từ .docx) đánh dấu đáp án đúng; Đúng/Sai nhận dạng được", () => {
    const r = parseQuizText(`Câu 1: Thủ đô Việt Nam?
A. TP.HCM
*B. Hà Nội
Câu 2: Trái đất quay quanh Mặt trời.
A. ⟦Đúng⟧
B. Sai`);
    expect(r.questions[0].options[1].isCorrect).toBe(true);
    expect(r.questions[1]).toMatchObject({ type: "TRUE_FALSE" });
    expect(r.questions[1].options).toEqual([
      { label: "Đúng", isCorrect: true },
      { label: "Sai", isCorrect: false },
    ]);
  });

  it("cảnh báo câu thiếu đáp án hoặc thiếu phương án, không đoán bừa", () => {
    const r = parseQuizText(`Câu 1: Không có đáp án
A. x
B. y
Câu 2: Chỉ một phương án
A. x
Đáp án: A`);
    expect(r.warnings.some((w) => w.startsWith("Câu 1") && w.includes("chưa có đáp án"))).toBe(true);
    expect(r.warnings.some((w) => w.startsWith("Câu 2") && w.includes("ít nhất 2"))).toBe(true);
    expect(r.questions[0].options.every((o) => !o.isCorrect)).toBe(true);
  });

  it("không có câu nào thì báo rõ định dạng", () => {
    expect(parseQuizText("xin chào").warnings[0]).toMatch(/Không tìm thấy câu hỏi/);
  });

  it("htmlToMarkedText giữ in đậm/gạch chân thành dấu ⟦⟧, bỏ thẻ khác", () => {
    const t = htmlToMarkedText("<p>Câu 1: A &amp; B?</p><p>A. x</p><p><strong>B. y</strong></p><p>C. <u>z</u></p>");
    const r = parseQuizText(t);
    expect(r.questions[0].prompt).toBe("Câu 1: A & B?".replace("Câu 1: ", ""));
    expect(r.questions[0].options.map((o) => o.isCorrect)).toEqual([false, true, true]);
    expect(r.questions[0].type).toBe("MULTI");
  });
});

describe("parseQuizRows (Excel)", () => {
  it("đọc theo tiêu đề cột không phân biệt dấu/hoa thường", () => {
    const r = parseQuizRows([
      ["Câu hỏi", "A", "B", "C", "D", "Đáp án", "Điểm"],
      ["1 + 1 = ?", "1", "2", "3", "", "B", 2],
      ["Chọn số chẵn", "2", "3", "4", "", "A,C", ""],
      ["", "", "", "", "", "", ""],
    ]);
    expect(r.warnings).toEqual([]);
    expect(r.questions).toHaveLength(2);
    expect(r.questions[0]).toMatchObject({ type: "SINGLE", points: 2 });
    expect(r.questions[0].options).toHaveLength(3);
    expect(r.questions[1].type).toBe("MULTI");
  });

  it("thiếu cột bắt buộc → báo lỗi", () => {
    expect(parseQuizRows([["Nội dung", "X"]]).warnings[0]).toMatch(/Câu hỏi/);
  });
});

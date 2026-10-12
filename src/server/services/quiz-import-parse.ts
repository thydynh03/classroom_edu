/**
 * Tách đề trắc nghiệm từ văn bản (dán từ Word hoặc trích từ .docx) và từ bảng Excel. Hàm thuần, không phụ thuộc DB.
 *
 * Văn bản hỗ trợ:
 *   Câu 1: Nội dung câu hỏi (2 điểm)
 *   A. Phương án        hoặc nhiều phương án trên một dòng:  A. 1   B. 2   C. 3   D. 4
 *   *B. Phương án đúng  (dấu * đầu phương án = đáp án đúng)
 *   Đáp án: B           (hoặc "Đáp án: A, C" cho câu nhiều đáp án)
 * Trong .docx, phương án in đậm hoặc gạch chân được coi là đúng (đánh dấu ⟦…⟧ trước khi gọi parseQuizText).
 */

export type ParsedQuestion = {
  type: "SINGLE" | "MULTI" | "TRUE_FALSE";
  prompt: string;
  points: number;
  options: { label: string; isCorrect: boolean }[];
};
export type ParseResult = { questions: ParsedQuestion[]; warnings: string[] };

export const MARK_OPEN = "⟦";
export const MARK_CLOSE = "⟧";

const Q_START = /^\s*(?:câu|cau|question|q)\s*(\d+)\s*[:.)\-–]?\s*(.*)$/i;
const Q_NUM = /^\s*(\d{1,3})\s*[.)]\s+(.+)$/;
const ANSWER = /^\s*(?:đáp\s*án(?:\s*đúng)?|dap\s*an|đa|answer|key)\s*[:.\-–]?\s*([A-Ha-h](?:\s*[,;/&\s]\s*[A-Ha-h])*)\s*\.?\s*$/i;
// Một phương án: có thể có "*" hoặc dấu in đậm phía trước chữ cái
const OPT_SPLIT = /(?:^|\s{2,}|\t|\s(?=\*?⟦?[A-H]\s*[.)]\s))/;
const OPT = /^\s*(\*)?\s*(⟦)?\s*([A-Ha-h])\s*[.)]\s*([\s\S]*)$/;
const POINTS = /\(\s*(\d+(?:[.,]\d+)?)\s*(?:điểm|đ|diem|points?)\s*\)\s*$/i;
const TRUE_WORDS = ["đúng", "true", "đ"];
const FALSE_WORDS = ["sai", "false", "s"];

const stripMarks = (s: string) => s.replaceAll(MARK_OPEN, "").replaceAll(MARK_CLOSE, "").replace(/\s+/g, " ").trim();

/** Tách một dòng thành các phương án nếu dòng bắt đầu bằng "A." (có thể nhiều phương án trên một dòng). */
function splitOptions(line: string): { letter: string; text: string; marked: boolean }[] | null {
  if (!/^\s*\*?\s*⟦?\s*[A-Ha-h]\s*[.)]\s*\S/.test(line)) return null;
  const parts = line
    .split(OPT_SPLIT)
    .map((p) => p?.trim())
    .filter(Boolean) as string[];
  const out: { letter: string; text: string; marked: boolean }[] = [];
  for (const p of parts) {
    const m = OPT.exec(p);
    if (!m) {
      if (out.length) out[out.length - 1].text += ` ${p}`;
      continue;
    }
    out.push({ letter: m[3].toUpperCase(), text: m[4], marked: !!m[1] || !!m[2] || p.includes(MARK_OPEN) });
  }
  // Chữ cái phải liên tiếp A, B, C… (tránh nhầm câu bắt đầu bằng "A. " là nội dung)
  return out.length && out.every((o, i) => o.letter === String.fromCharCode(65 + (out[0].letter.charCodeAt(0) - 65) + i)) ? out : null;
}

export function parseQuizText(raw: string, maxQuestions = 100): ParseResult {
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");
  type Block = { no: number; prompt: string[]; opts: { letter: string; text: string; marked: boolean }[]; answer: string[] | null; points: number };
  const blocks: Block[] = [];
  let cur = null as Block | null;
  let autoNo = 0;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const plain = stripMarks(line);
    const ans = ANSWER.exec(plain);
    if (ans && cur) {
      cur.answer = ans[1].toUpperCase().split(/[^A-H]+/).filter(Boolean);
      continue;
    }
    const start: RegExpExecArray | null = Q_START.exec(plain) ?? (cur?.opts.length || !cur ? Q_NUM.exec(plain) : null);
    if (start) {
      cur = { no: Number(start[1]) || ++autoNo, prompt: start[2] ? [start[2]] : [], opts: [], answer: null, points: 1 };
      blocks.push(cur);
      continue;
    }
    const opts = cur ? splitOptions(line) : null;
    if (cur && opts && (cur.opts.length === 0 ? opts[0].letter === "A" : true)) {
      cur.opts.push(...opts);
      continue;
    }
    if (!cur) continue; // văn bản trước câu 1 (tiêu đề đề thi…) bỏ qua
    if (cur.opts.length) cur.opts[cur.opts.length - 1].text += ` ${line}`;
    else cur.prompt.push(line);
  }

  const warnings: string[] = [];
  const questions: ParsedQuestion[] = [];
  for (const b of blocks.slice(0, maxQuestions)) {
    let prompt = stripMarks(b.prompt.join(" "));
    const pm = POINTS.exec(prompt);
    if (pm) {
      b.points = Number(pm[1].replace(",", "."));
      prompt = prompt.slice(0, pm.index).trim();
    }
    const options = b.opts.map((o) => ({
      letter: o.letter,
      label: stripMarks(o.text).slice(0, 500),
      isCorrect: b.answer ? b.answer.includes(o.letter) : o.marked,
    }));
    const label = `Câu ${b.no}`;
    if (!prompt) warnings.push(`${label}: thiếu nội dung câu hỏi.`);
    if (options.length < 2) warnings.push(`${label}: cần ít nhất 2 phương án (A, B…).`);
    const correct = options.filter((o) => o.isCorrect).length;
    if (!correct) warnings.push(`${label}: chưa có đáp án đúng (in đậm, gạch chân, dấu * hoặc dòng "Đáp án: …").`);
    const words = options.map((o) => o.label.toLowerCase());
    const isTF = options.length === 2 && TRUE_WORDS.includes(words[0]) && FALSE_WORDS.includes(words[1]);
    questions.push({
      type: isTF ? "TRUE_FALSE" : correct > 1 ? "MULTI" : "SINGLE",
      prompt: prompt.slice(0, 2000),
      points: Math.min(100, Math.max(0.25, b.points || 1)),
      options: options.slice(0, 8).map(({ label: l, isCorrect }) => ({ label: l, isCorrect })),
    });
    if (options.length > 8) warnings.push(`${label}: chỉ giữ 8 phương án đầu.`);
  }
  if (blocks.length > maxQuestions) warnings.push(`Chỉ nhập ${maxQuestions} câu đầu.`);
  if (!questions.length) warnings.push('Không tìm thấy câu hỏi nào. Mỗi câu bắt đầu bằng "Câu 1:", phương án bắt đầu bằng "A.", "B."…');
  return { questions, warnings };
}

/** Đổi HTML (mammoth) sang văn bản: mỗi đoạn một dòng, chữ in đậm/gạch chân bọc trong ⟦…⟧. */
export function htmlToMarkedText(html: string) {
  return html
    .replace(/<(strong|b|u)(\s[^>]*)?>/gi, MARK_OPEN)
    .replace(/<\/(strong|b|u)>/gi, MARK_CLOSE)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|h[1-6]|tr|div)>/gi, "\n")
    .replace(/<\/t[dh]>/gi, "  ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

const norm = (s: unknown) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim();

/**
 * Bảng Excel (dòng đầu là tiêu đề): "Câu hỏi" | "A" | "B" | … | "H" | "Đáp án" (vd "B" hoặc "A,C") | "Điểm" (tùy chọn).
 */
export function parseQuizRows(rows: unknown[][], maxQuestions = 100): ParseResult {
  const warnings: string[] = [];
  const header = (rows[0] ?? []).map(norm);
  const col = (names: string[]) => header.findIndex((h) => names.includes(h));
  const qCol = col(["cau hoi", "noi dung", "question", "cau"]);
  const aCol = col(["dap an", "dap an dung", "answer", "key"]);
  const pCol = col(["diem", "points", "point"]);
  const optCols = "ABCDEFGH".split("").map((l) => header.findIndex((h) => h === l.toLowerCase() || h === `phuong an ${l.toLowerCase()}`));
  if (qCol < 0 || optCols[0] < 0 || optCols[1] < 0) {
    return { questions: [], warnings: ['File Excel cần dòng tiêu đề có các cột "Câu hỏi", "A", "B" (… "D") và "Đáp án".'] };
  }
  const questions: ParsedQuestion[] = [];
  for (const [i, r] of rows.slice(1).entries()) {
    if (questions.length >= maxQuestions) {
      warnings.push(`Chỉ nhập ${maxQuestions} câu đầu.`);
      break;
    }
    const prompt = String(r[qCol] ?? "").trim();
    if (!prompt) continue;
    const label = `Dòng ${i + 2}`;
    const answer = aCol >= 0 ? String(r[aCol] ?? "").toUpperCase().split(/[^A-H]+/).filter(Boolean) : [];
    const options = optCols
      .map((c, j) => ({ letter: String.fromCharCode(65 + j), label: c >= 0 ? String(r[c] ?? "").trim() : "" }))
      .filter((o) => o.label)
      .map((o) => ({ label: o.label.slice(0, 500), isCorrect: answer.includes(o.letter) }));
    const correct = options.filter((o) => o.isCorrect).length;
    if (options.length < 2) warnings.push(`${label}: cần ít nhất 2 phương án.`);
    if (!correct) warnings.push(`${label}: cột "Đáp án" trống hoặc không khớp phương án.`);
    const pts = pCol >= 0 ? Number(String(r[pCol] ?? "").replace(",", ".")) : 1;
    const words = options.map((o) => o.label.toLowerCase());
    const isTF = options.length === 2 && TRUE_WORDS.includes(words[0]) && FALSE_WORDS.includes(words[1]);
    questions.push({
      type: isTF ? "TRUE_FALSE" : correct > 1 ? "MULTI" : "SINGLE",
      prompt: prompt.slice(0, 2000),
      points: Number.isFinite(pts) && pts > 0 ? Math.min(100, Math.max(0.25, pts)) : 1,
      options,
    });
  }
  if (!questions.length && !warnings.length) warnings.push("Không có dòng câu hỏi nào trong file.");
  return { questions, warnings };
}

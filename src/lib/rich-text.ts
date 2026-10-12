import sanitizeHtml from "sanitize-html";

/** Màu chữ cho phép trong bài làm (ánh xạ sang token ở globals.css, không lưu mã màu). */
export const ANSWER_COLORS = ["red", "blue", "green", "orange"] as const;
export const ANSWER_ALIGNS = ["left", "center", "right", "justify"] as const;
export const ANSWER_MAX_INDENT = 4;

const BLOCK_ATTRS = ["data-align", "data-indent"];

/**
 * Lọc HTML bài làm của học sinh theo danh sách cho phép: không link, ảnh, script, style hay thuộc tính sự kiện.
 * Gọi khi ghi (bắt buộc) và khi đọc ra cho giáo viên/học sinh (phòng thủ thêm một lớp).
 */
export function sanitizeAnswerHtml(html: string): string {
  const clean = sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "em", "u", "s", "sub", "sup", "ul", "ol", "li", "blockquote", "h2", "h3", "span"],
    allowedAttributes: { p: BLOCK_ATTRS, h2: BLOCK_ATTRS, h3: BLOCK_ATTRS, span: ["data-color"] },
    allowedSchemes: [],
    disallowedTagsMode: "discard",
    transformTags: { b: "strong", i: "em" },
    exclusiveFilter: (frame) => frame.tag === "span" && !frame.attribs["data-color"] && !frame.text.trim(),
    textFilter: (text) => text,
  });
  // Chỉ giữ giá trị thuộc tính nằm trong danh sách; giá trị lạ thì bỏ thuộc tính.
  return clean
    .replace(/ data-color="([^"]*)"/g, (m, v: string) => ((ANSWER_COLORS as readonly string[]).includes(v) ? m : ""))
    .replace(/ data-align="([^"]*)"/g, (m, v: string) => ((ANSWER_ALIGNS as readonly string[]).includes(v) ? m : ""))
    .replace(/ data-indent="([^"]*)"/g, (m, v: string) => (/^[1-4]$/.test(v) ? m : ""));
}

/** Phần chữ của bài làm HTML (để kiểm tra bài trống, đếm từ). */
export function answerHtmlToText(html: string): string {
  return sanitizeHtml(html.replace(/<\/(p|li|h2|h3|blockquote)>|<br\s*\/?>/gi, "$&\n"), { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .trim();
}

/** Chuẩn hóa bài làm trước khi lưu: lọc HTML, bài chỉ có thẻ rỗng thì coi là trống. */
export function normalizeAnswer(content: string, format: "text" | "html"): string {
  if (format === "text") return content;
  const clean = sanitizeAnswerHtml(content);
  return answerHtmlToText(clean) ? clean : "";
}

export function answerText(content: string, format: "text" | "html"): string {
  return format === "html" ? answerHtmlToText(content) : content.trim();
}

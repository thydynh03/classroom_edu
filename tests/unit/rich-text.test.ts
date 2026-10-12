import { describe, expect, it } from "vitest";
import { answerHtmlToText, normalizeAnswer, sanitizeAnswerHtml } from "@/lib/rich-text";

describe("sanitizeAnswerHtml", () => {
  it("giữ định dạng cho phép", () => {
    const html = '<p data-align="center" data-indent="2"><strong>Bài 1</strong> <em>x</em><sup>2</sup> <span data-color="red">sai</span></p><ul><li>a</li></ul>';
    expect(sanitizeAnswerHtml(html)).toBe(html);
  });

  it("bỏ script, ảnh, link và thuộc tính sự kiện", () => {
    const out = sanitizeAnswerHtml('<p onclick="x()">a<script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">b</a><iframe src="//evil"></iframe></p>');
    expect(out).toBe("<p>ab</p>");
  });

  it("bỏ style và giá trị thuộc tính lạ", () => {
    const out = sanitizeAnswerHtml('<p style="position:fixed" data-align="evil" data-indent="99"><span data-color="url(x)" style="color:red">a</span></p>');
    expect(out).not.toContain("style");
    expect(out).not.toContain("data-align");
    expect(out).not.toContain("data-indent");
    expect(out).not.toContain("data-color");
    expect(out).toContain("a");
  });
});

describe("normalizeAnswer", () => {
  it("bài HTML chỉ có thẻ rỗng là bài trống", () => {
    expect(normalizeAnswer("<p></p><p><br></p>", "html")).toBe("");
  });

  it("không đụng tới văn bản thuần", () => {
    expect(normalizeAnswer("a < b <script>", "text")).toBe("a < b <script>");
  });

  it("lấy được phần chữ", () => {
    expect(answerHtmlToText("<p>Bài 1</p><ul><li>a</li><li>b</li></ul>")).toBe("Bài 1\na\nb");
  });
});

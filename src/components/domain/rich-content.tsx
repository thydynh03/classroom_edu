import { cn } from "@/lib/utils";

/**
 * Hiển thị bài làm. `format="html"`: nội dung PHẢI đã qua sanitizeAnswerHtml ở server (lúc ghi và lúc đọc).
 * `format="text"`: văn bản thuần của bài cũ, giữ nguyên xuống dòng.
 */
export function RichContent({ content, format, className }: { content: string; format: "text" | "html"; className?: string }) {
  if (format === "html") {
    return <div className={cn("rich-content", className)} dangerouslySetInnerHTML={{ __html: content }} />;
  }
  return <p className={cn("text-base leading-7 whitespace-pre-wrap", className)}>{content}</p>;
}

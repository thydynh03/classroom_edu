"use client";

import "./globals.css";
import { ErrorView } from "@/components/feedback/error-view";

/** Lỗi ở root layout: tự dựng <html>/<body> (không có layout gốc). */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="vi">
      <body className="bg-background text-foreground flex min-h-screen flex-col font-sans">
        <title>Có lỗi · Classroom Edu</title>
        <ErrorView error={error} retry={retry} />
      </body>
    </html>
  );
}

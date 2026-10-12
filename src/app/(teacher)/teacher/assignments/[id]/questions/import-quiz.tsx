"use client";

import * as React from "react";
import { useTransition } from "react";
import Link from "next/link";
import { FileUp, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { importQuizAction } from "../../../actions";

export type ImportedQuestion = {
  type: "SINGLE" | "MULTI" | "TRUE_FALSE";
  prompt: string;
  points: number;
  options: { label: string; isCorrect: boolean }[];
};

const SAMPLE = `Câu 1: Mệnh đề nào sau đây đúng? (2 điểm)
A. 2 là số lẻ
B. π > 3
C. 1 + 1 = 3
Đáp án: B
Câu 2: Chọn các số nguyên tố
A. 2    B. 4    C. 5
Đáp án: A, C`;

/** Nhập đề trắc nghiệm từ văn bản dán / .docx / .xlsx (tính năng nâng cao). Tách ở server, GV xem lại rồi mới lưu. */
export function ImportQuiz({
  assignmentId,
  unlocked,
  onImport,
}: {
  assignmentId: string;
  unlocked: boolean;
  onImport: (qs: ImportedQuestion[], mode: "append" | "replace") => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [result, setResult] = React.useState<{ questions: ImportedQuestion[]; warnings: string[] } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!unlocked)
    return (
      <Link
        href="/teacher/upgrade?feature=QUIZ_IMPORT#QUIZ_IMPORT"
        className="border-border bg-surface hover:bg-surface-2 rounded-control inline-flex h-10 items-center gap-2 border px-4 text-sm font-bold"
      >
        <Lock className="size-4" aria-hidden="true" /> Nhập đề từ Word/Excel
        <span className="bg-primary-soft text-primary rounded-full px-2 py-0.5 text-[11px]">Nâng cao</span>
      </Link>
    );

  function parse() {
    setError(null);
    setResult(null);
    const fd = new FormData();
    if (file) fd.set("file", file);
    else fd.set("text", text);
    start(async () => {
      const r = await importQuizAction(assignmentId, fd);
      if (r.error) return void setError(r.error);
      setResult({ questions: r.questions ?? [], warnings: r.warnings ?? [] });
    });
  }

  function apply(mode: "append" | "replace") {
    if (!result?.questions.length) return;
    onImport(result.questions, mode);
    setOpen(false);
    setResult(null);
    setText("");
    setFile(null);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Sparkles aria-hidden="true" /> Nhập đề từ Word/Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nhập đề trắc nghiệm</DialogTitle>
          <DialogDescription>
            Dán đề từ Word, hoặc chọn file .docx (đáp án đúng in đậm/gạch chân/có dấu *) hay .xlsx (cột Câu hỏi, A, B, C, D, Đáp án, Điểm).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="import-file">File .docx hoặc .xlsx (tối đa 4 MB)</Label>
            <input
              id="import-file"
              type="file"
              accept=".docx,.xlsx"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setResult(null);
              }}
              className="file:bg-surface-2 block w-full text-sm file:mr-3 file:rounded-[10px] file:border-0 file:px-3 file:py-2 file:font-semibold"
            />
          </div>
          {!file && (
            <div className="space-y-1.5">
              <Label htmlFor="import-text">Hoặc dán nội dung đề</Label>
              <Textarea id="import-text" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={SAMPLE} />
            </div>
          )}
          {error && (
            <p role="alert" className="bg-danger-soft text-danger rounded-control px-3 py-2 text-sm font-medium">
              {error}
            </p>
          )}
          {result && (
            <div role="status" className="space-y-2">
              <p className="text-sm font-bold">Tách được {result.questions.length} câu.</p>
              {result.warnings.length > 0 && (
                <ul className="bg-warning-soft text-warning rounded-control max-h-40 space-y-1 overflow-y-auto px-3 py-2 text-sm">
                  {result.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}
              <p className="text-muted text-xs">Câu thiếu đáp án vẫn được thêm, hãy sửa trước khi lưu.</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {!result ? (
              <Button onClick={parse} disabled={pending || (!file && !text.trim())}>
                <FileUp aria-hidden="true" /> {pending ? "Đang đọc…" : "Tách đề"}
              </Button>
            ) : (
              <>
                <Button onClick={() => apply("append")} disabled={!result.questions.length}>
                  Thêm vào cuối
                </Button>
                <Button variant="outline" onClick={() => apply("replace")} disabled={!result.questions.length}>
                  Thay toàn bộ câu đang soạn
                </Button>
                <Button variant="ghost" onClick={() => setResult(null)}>
                  Chọn lại
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

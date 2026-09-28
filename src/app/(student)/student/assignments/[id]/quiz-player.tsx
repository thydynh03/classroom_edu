"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { submitQuizAction } from "../../actions";
import { cn } from "@/lib/utils";

type Q = {
  id: string;
  type: "SINGLE" | "MULTI" | "TRUE_FALSE";
  prompt: string;
  points: number;
  options: { id: string; label: string; isCorrect?: boolean }[];
};

export function QuizPlayer({
  assignmentId,
  questions,
  answers: initialAnswers,
  mode,
}: {
  assignmentId: string;
  questions: Q[];
  answers: Record<string, string[]>;
  mode: "take" | "review" | "submitted";
}) {
  const [answers, setAnswers] = React.useState<Record<string, string[]>>(initialAnswers);
  const [pending, start] = useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();
  const answered = questions.filter((q) => (answers[q.id] ?? []).length > 0).length;
  const readOnly = mode !== "take";

  function pick(q: Q, optionId: string, checked: boolean) {
    setAnswers((a) => {
      const cur = a[q.id] ?? [];
      if (q.type === "MULTI") return { ...a, [q.id]: checked ? [...cur, optionId] : cur.filter((x) => x !== optionId) };
      return { ...a, [q.id]: [optionId] };
    });
  }

  function submit() {
    setError(null);
    start(async () => {
      const r = await submitQuizAction(assignmentId, answers);
      if (r.error) setError(r.error);
      else {
        toast.success(r.message ?? "Đã nộp");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      {mode === "submitted" && (
        <p className="bg-info-soft text-info rounded-control px-4 py-3 text-sm font-semibold">
          Đã nộp. Kết quả sẽ hiện khi giáo viên cho phép xem.
        </p>
      )}
      <ol className="space-y-4">
        {questions.map((q, i) => {
          const chosen = answers[q.id] ?? [];
          const correctIds = q.options.filter((o) => o.isCorrect).map((o) => o.id);
          const isRight = mode === "review" && chosen.length === correctIds.length && chosen.every((c) => correctIds.includes(c));
          return (
            <li key={q.id} className="bg-surface border-border rounded-card border p-5">
              <fieldset>
                <legend className="mb-3 font-bold">
                  <span className="text-muted mr-1 text-sm">Câu {i + 1}.</span> {q.prompt}
                  <span className="text-muted ml-2 text-xs font-medium">
                    ({q.points} điểm{q.type === "MULTI" ? " · chọn tất cả đáp án đúng" : ""})
                  </span>
                  {mode === "review" && (
                    <span className={cn("ml-2 rounded-full px-2 py-0.5 text-xs font-bold", isRight ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}>
                      {isRight ? "Đúng" : "Sai"}
                    </span>
                  )}
                </legend>
                <div className="grid gap-2">
                  {q.options.map((o, oi) => {
                    const checked = chosen.includes(o.id);
                    return (
                      <label
                        key={o.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-[14px] border px-4 py-3 text-sm font-medium transition-colors",
                          readOnly && "cursor-default",
                          mode === "review" && o.isCorrect && "border-success bg-success-soft",
                          mode === "review" && checked && !o.isCorrect && "border-danger bg-danger-soft",
                          mode !== "review" && checked ? "border-primary bg-primary-soft" : "border-border",
                        )}
                      >
                        <input
                          type={q.type === "MULTI" ? "checkbox" : "radio"}
                          name={`q-${q.id}`}
                          checked={checked}
                          disabled={readOnly}
                          onChange={(e) => pick(q, o.id, e.target.checked)}
                          className="accent-primary size-4"
                        />
                        <span className="text-muted w-5 font-bold">{String.fromCharCode(65 + oi)}</span>
                        {o.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </li>
          );
        })}
      </ol>
      {mode === "take" && (
        <div className="bg-surface border-border sticky bottom-24 z-10 flex flex-wrap items-center gap-3 rounded-[18px] border p-3 shadow-lg md:bottom-4">
          <p className="text-sm">
            Đã trả lời <b>{answered}</b>/{questions.length} câu
          </p>
          {error && <p role="alert" className="text-danger text-sm font-semibold">{error}</p>}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="ml-auto" disabled={pending}>Nộp bài</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Nộp bài trắc nghiệm?</AlertDialogTitle>
                <AlertDialogDescription>
                  {answered < questions.length
                    ? `Bạn còn ${questions.length - answered} câu chưa trả lời. `
                    : ""}
                  Bài trắc nghiệm chỉ được nộp một lần.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Làm tiếp</AlertDialogCancel>
                <AlertDialogAction onClick={submit}>Nộp bài</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}

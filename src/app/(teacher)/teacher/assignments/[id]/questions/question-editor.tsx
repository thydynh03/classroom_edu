"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { publishAssignmentAction, saveQuestionsAction } from "../../../actions";
import { cn } from "@/lib/utils";

type QType = "SINGLE" | "MULTI" | "TRUE_FALSE";
type Opt = { key: string; label: string; isCorrect: boolean };
type Q = { key: string; type: QType; prompt: string; points: number; options: Opt[] };

const k = () => Math.random().toString(36).slice(2);
const TYPE_LABEL: Record<QType, string> = { SINGLE: "Một đáp án", MULTI: "Nhiều đáp án", TRUE_FALSE: "Đúng / Sai" };

function blank(type: QType = "SINGLE"): Q {
  if (type === "TRUE_FALSE")
    return { key: k(), type, prompt: "", points: 1, options: [{ key: k(), label: "Đúng", isCorrect: true }, { key: k(), label: "Sai", isCorrect: false }] };
  return {
    key: k(),
    type,
    prompt: "",
    points: 1,
    options: [0, 1, 2, 3].map((i) => ({ key: k(), label: "", isCorrect: i === 0 })),
  };
}

export function QuestionEditor({
  assignmentId,
  initial,
  locked,
  isDraft,
}: {
  assignmentId: string;
  initial: { type: QType; prompt: string; points: number; options: { label: string; isCorrect: boolean }[] }[];
  locked: boolean;
  isDraft: boolean;
}) {
  const [qs, setQs] = React.useState<Q[]>(() =>
    initial.length
      ? initial.map((q) => ({ ...q, key: k(), options: q.options.map((o) => ({ ...o, key: k() })) }))
      : [blank()],
  );
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const total = qs.reduce((s, q) => s + (Number(q.points) || 0), 0);

  const update = (i: number, patch: Partial<Q>) => setQs((all) => all.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const setOpt = (i: number, oi: number, patch: Partial<Opt>) =>
    update(i, {
      options: qs[i].options.map((o, j) => {
        if (patch.isCorrect && qs[i].type !== "MULTI") return { ...o, isCorrect: j === oi };
        return j === oi ? { ...o, ...patch } : o;
      }),
    });
  const move = (i: number, d: -1 | 1) =>
    setQs((all) => {
      const n = [...all];
      const t = n[i + d];
      if (!t) return all;
      n[i + d] = n[i];
      n[i] = t;
      return n;
    });

  function save(thenPublish: boolean) {
    setError(null);
    const payload = qs.map((q) => ({
      type: q.type,
      prompt: q.prompt,
      points: Number(q.points),
      options: q.options.filter((o) => o.label.trim()).map((o) => ({ label: o.label, isCorrect: o.isCorrect })),
    }));
    start(async () => {
      const r = await saveQuestionsAction(assignmentId, payload);
      if (r.error) {
        setError(r.error);
        return;
      }
      if (thenPublish) {
        const p = await publishAssignmentAction(assignmentId);
        if (p.error) return setError(p.error);
        toast.success("Đã lưu và đăng quiz");
        router.push(`/teacher/assignments/${assignmentId}`);
      } else toast.success("Đã lưu câu hỏi");
    });
  }

  if (locked)
    return (
      <div className="space-y-4">
        <p className="bg-warning-soft text-warning rounded-control px-4 py-3 text-sm font-semibold">
          Đã có học sinh nộp bài, không sửa câu hỏi được nữa để điểm không bị sai lệch.
        </p>
        <ol className="space-y-3">
          {initial.map((q, i) => (
            <li key={i} className="bg-surface border-border rounded-card border p-5">
              <p className="font-bold">
                Câu {i + 1}. {q.prompt} <span className="text-muted text-xs font-medium">({q.points} điểm)</span>
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {q.options.map((o, j) => (
                  <li key={j} className={o.isCorrect ? "text-success font-semibold" : "text-muted"}>
                    {o.isCorrect ? "✓ " : "· "}
                    {o.label}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    );

  return (
    <div className="space-y-4">
      {qs.map((q, i) => (
        <fieldset key={q.key} className="bg-surface border-border rounded-card space-y-4 border p-5">
          <div className="flex flex-wrap items-center gap-2">
            <legend className="font-extrabold">Câu {i + 1}</legend>
            <select
              aria-label={`Loại câu ${i + 1}`}
              value={q.type}
              onChange={(e) => {
                const t = e.target.value as QType;
                update(i, t === "TRUE_FALSE" ? { type: t, options: blank("TRUE_FALSE").options } : { type: t, options: q.type === "TRUE_FALSE" ? blank().options : q.options.map((o, j) => (t === "SINGLE" ? { ...o, isCorrect: j === q.options.findIndex((x) => x.isCorrect) } : o)) });
              }}
              className="border-border bg-surface rounded-control h-9 border px-2 text-sm"
            >
              {(Object.keys(TYPE_LABEL) as QType[]).map((t) => (
                <option key={t} value={t}>{TYPE_LABEL[t]}</option>
              ))}
            </select>
            <div className="ml-auto flex items-center gap-1">
              <Label htmlFor={`pts-${q.key}`} className="text-muted text-xs">Điểm</Label>
              <Input id={`pts-${q.key}`} type="number" min={0.25} step={0.25} value={q.points} onChange={(e) => update(i, { points: Number(e.target.value) })} className="h-9 w-20" />
              <Button type="button" variant="ghost" size="icon" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Đưa câu lên">
                <ArrowUp />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => move(i, 1)} disabled={i === qs.length - 1} aria-label="Đưa câu xuống">
                <ArrowDown />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="text-danger" onClick={() => setQs((all) => all.filter((_, j) => j !== i))} disabled={qs.length === 1} aria-label={`Xóa câu ${i + 1}`}>
                <Trash2 />
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`p-${q.key}`}>Nội dung câu hỏi</Label>
            <Textarea id={`p-${q.key}`} rows={2} value={q.prompt} onChange={(e) => update(i, { prompt: e.target.value })} />
          </div>
          <div className="space-y-2">
            <p className="text-muted text-xs font-semibold">
              {q.type === "MULTI" ? "Đánh dấu tất cả đáp án đúng" : "Chọn đáp án đúng"}
            </p>
            {q.options.map((o, oi) => (
              <div key={o.key} className="flex items-center gap-2">
                <input
                  type={q.type === "MULTI" ? "checkbox" : "radio"}
                  name={`correct-${q.key}`}
                  checked={o.isCorrect}
                  onChange={(e) => setOpt(i, oi, { isCorrect: q.type === "MULTI" ? e.target.checked : true })}
                  className="accent-success size-4"
                  aria-label={`Đáp án đúng: lựa chọn ${oi + 1}`}
                />
                <Input
                  value={o.label}
                  readOnly={q.type === "TRUE_FALSE"}
                  onChange={(e) => setOpt(i, oi, { label: e.target.value })}
                  placeholder={`Lựa chọn ${String.fromCharCode(65 + oi)}`}
                  aria-label={`Lựa chọn ${String.fromCharCode(65 + oi)}`}
                  className={cn(o.isCorrect && "border-success")}
                />
                {q.type !== "TRUE_FALSE" && q.options.length > 2 && (
                  <Button type="button" variant="ghost" size="icon" aria-label="Bỏ lựa chọn" onClick={() => update(i, { options: q.options.filter((_, j) => j !== oi) })}>
                    <Trash2 />
                  </Button>
                )}
              </div>
            ))}
            {q.type !== "TRUE_FALSE" && q.options.length < 8 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => update(i, { options: [...q.options, { key: k(), label: "", isCorrect: false }] })}>
                <Plus /> Thêm lựa chọn
              </Button>
            )}
          </div>
        </fieldset>
      ))}

      <Button type="button" variant="outline" onClick={() => setQs((all) => [...all, blank()])}>
        <Plus /> Thêm câu hỏi
      </Button>

      <div className="bg-surface border-border rounded-card sticky bottom-4 flex flex-wrap items-center gap-3 border p-4 shadow-lg">
        <p className="text-sm">
          <b>{qs.length}</b> câu · tổng trọng số <b>{total}</b>
        </p>
        {error && <p role="alert" className="text-danger text-sm font-semibold">{error}</p>}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" disabled={pending} onClick={() => save(false)}>
            Lưu
          </Button>
          {isDraft && (
            <Button disabled={pending} onClick={() => save(true)}>
              Lưu và đăng quiz
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

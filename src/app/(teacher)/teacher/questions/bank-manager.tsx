"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Library, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/domain/page-parts";
import { cn } from "@/lib/utils";
import { deleteBankQuestionAction, saveBankQuestionAction } from "../actions";

type QType = "SINGLE" | "MULTI" | "TRUE_FALSE";
type Opt = { label: string; isCorrect: boolean };
export type BankItem = { id: string; type: QType; prompt: string; points: number; topic: string; options: Opt[] };
type Draft = { id: string | null; type: QType; prompt: string; points: number; topic: string; options: Opt[] };

export const TYPE_LABEL: Record<QType, string> = { SINGLE: "Một đáp án", MULTI: "Nhiều đáp án", TRUE_FALSE: "Đúng / Sai" };
const TF: Opt[] = [
  { label: "Đúng", isCorrect: true },
  { label: "Sai", isCorrect: false },
];
const blank = (topic = ""): Draft => ({ id: null, type: "SINGLE", prompt: "", points: 1, topic, options: [0, 1, 2, 3].map((i) => ({ label: "", isCorrect: i === 0 })) });

export function BankManager({ items }: { items: BankItem[] }) {
  const [query, setQuery] = React.useState("");
  const [topic, setTopic] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmId, setConfirmId] = React.useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const topics = [...new Set(items.map((i) => i.topic).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi"));
  const q = query.trim().toLowerCase();
  const shown = items.filter((i) => (topic === null || i.topic === topic) && (!q || i.prompt.toLowerCase().includes(q) || i.options.some((o) => o.label.toLowerCase().includes(q))));

  function save() {
    if (!draft) return;
    setError(null);
    const payload = {
      topic: draft.topic,
      question: { type: draft.type, prompt: draft.prompt, points: Number(draft.points), options: draft.options.filter((o) => o.label.trim()) },
    };
    start(async () => {
      const r = await saveBankQuestionAction(draft.id, payload);
      if (r.error) return setError(r.error);
      toast.success(r.message ?? "Đã lưu");
      setDraft(null);
      router.refresh();
    });
  }

  function remove(id: string) {
    start(async () => {
      const r = await deleteBankQuestionAction(id);
      if (r.error) toast.error(r.error);
      else toast.success(r.message ?? "Đã xóa");
      setConfirmId(null);
      router.refresh();
    });
  }

  const form = draft && (
    <QuestionForm draft={draft} topics={topics} onChange={setDraft} onCancel={() => setDraft(null)} onSave={save} pending={pending} error={error} />
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden="true" />
          <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm theo nội dung câu hỏi hoặc lựa chọn" aria-label="Tìm câu hỏi" className="pl-9" />
        </div>
        <Button
          onClick={() => {
            setError(null);
            setDraft(blank(topic ?? ""));
          }}
          disabled={!!draft}
        >
          <Plus /> Thêm câu hỏi
        </Button>
      </div>
      {topics.length > 0 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Lọc theo chủ đề">
          {[null, ...topics].map((t) => (
            <button
              key={t ?? "__all"}
              type="button"
              aria-pressed={topic === t}
              onClick={() => setTopic(t)}
              className={cn(
                "focus-visible:ring-ring min-h-9 rounded-full px-3 text-xs font-bold focus-visible:ring-2 focus-visible:outline-hidden",
                topic === t ? "bg-primary text-on-primary" : "bg-surface-2 text-muted hover:text-foreground",
              )}
            >
              {t ?? "Tất cả"} · {t === null ? items.length : items.filter((i) => i.topic === t).length}
            </button>
          ))}
        </div>
      )}

      {draft && draft.id === null && form}

      {items.length === 0 && !draft ? (
        <EmptyState
          icon={<Library className="size-6" />}
          title="Ngân hàng chưa có câu hỏi"
          description="Thêm câu hỏi ở đây, hoặc khi soạn một đề trắc nghiệm bấm “Lưu các câu này vào ngân hàng” để dùng lại cho đề sau."
        />
      ) : shown.length === 0 && !draft ? (
        <p className="text-muted border-border rounded-card border border-dashed px-4 py-8 text-center text-sm">Không có câu hỏi nào khớp. Thử từ khóa khác hoặc bỏ lọc chủ đề.</p>
      ) : (
        <ol className="space-y-3">
          {shown.map((it, i) =>
            draft?.id === it.id ? (
              <li key={it.id}>{form}</li>
            ) : (
              <li key={it.id} className="bg-surface border-border rounded-card border p-4 md:p-5">
                <div className="flex flex-wrap items-start gap-2">
                  <p className="min-w-0 flex-1 font-bold whitespace-pre-line">
                    <span className="text-muted mr-1.5 tabular-nums">{i + 1}.</span>
                    {it.prompt}
                  </p>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Sửa câu ${i + 1}`}
                      disabled={!!draft}
                      onClick={() => {
                        setError(null);
                        setDraft({ ...it, options: it.options.map((o) => ({ ...o })) });
                      }}
                    >
                      <Pencil />
                    </Button>
                    {confirmId === it.id ? (
                      <>
                        <Button variant="outline" size="sm" className="text-danger" disabled={pending} onClick={() => remove(it.id)}>
                          Xóa hẳn
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>
                          Hủy
                        </Button>
                      </>
                    ) : (
                      <Button variant="ghost" size="icon" className="text-danger" aria-label={`Xóa câu ${i + 1}`} disabled={!!draft} onClick={() => setConfirmId(it.id)}>
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </div>
                <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                  {it.options.map((o, j) => (
                    <li key={j} className={cn("flex items-start gap-1.5", o.isCorrect ? "text-success font-semibold" : "text-muted")}>
                      {o.isCorrect ? <Check className="mt-0.5 size-4 shrink-0" aria-label="Đáp án đúng" /> : <span className="w-4 shrink-0 text-center" aria-hidden="true">·</span>}
                      <span className="min-w-0">
                        {String.fromCharCode(65 + j)}. {o.label}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-muted mt-3 flex flex-wrap gap-1.5 text-xs font-semibold">
                  <span className="bg-surface-2 rounded-full px-2 py-0.5">{TYPE_LABEL[it.type]}</span>
                  <span className="bg-surface-2 rounded-full px-2 py-0.5">{it.points} điểm</span>
                  {it.topic && <span className="bg-primary-soft text-primary rounded-full px-2 py-0.5">{it.topic}</span>}
                </p>
              </li>
            ),
          )}
        </ol>
      )}
    </div>
  );
}

function QuestionForm({
  draft,
  topics,
  onChange,
  onCancel,
  onSave,
  pending,
  error,
}: {
  draft: Draft;
  topics: string[];
  onChange: (d: Draft) => void;
  onCancel: () => void;
  onSave: () => void;
  pending: boolean;
  error: string | null;
}) {
  const uid = React.useId();
  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch });
  const setOpt = (oi: number, patch: Partial<Opt>) =>
    set({
      options: draft.options.map((o, j) => {
        if (patch.isCorrect && draft.type !== "MULTI") return { ...o, isCorrect: j === oi };
        return j === oi ? { ...o, ...patch } : o;
      }),
    });
  function setType(t: QType) {
    if (t === "TRUE_FALSE") return set({ type: t, options: TF.map((o) => ({ ...o })) });
    const base = draft.type === "TRUE_FALSE" ? blank().options : draft.options;
    const first = base.findIndex((o) => o.isCorrect);
    set({ type: t, options: t === "SINGLE" ? base.map((o, j) => ({ ...o, isCorrect: j === Math.max(first, 0) })) : base });
  }
  return (
    <fieldset className="bg-surface border-primary rounded-card space-y-4 border-2 p-4 md:p-5">
      <legend className="px-1 font-extrabold">{draft.id ? "Sửa câu hỏi" : "Câu hỏi mới"}</legend>
      <div className="grid gap-3 sm:grid-cols-[1fr_160px_100px]">
        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-topic`}>Chủ đề (không bắt buộc)</Label>
          <Input id={`${uid}-topic`} value={draft.topic} maxLength={60} list={`${uid}-topics`} onChange={(e) => set({ topic: e.target.value })} placeholder="Ví dụ: Hàm số bậc hai" />
          <datalist id={`${uid}-topics`}>
            {topics.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-type`}>Loại câu</Label>
          <select id={`${uid}-type`} value={draft.type} onChange={(e) => setType(e.target.value as QType)} className="border-border bg-surface rounded-control h-10 w-full border px-2 text-sm">
            {(Object.keys(TYPE_LABEL) as QType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-pts`}>Điểm</Label>
          <Input id={`${uid}-pts`} type="number" min={0.25} step={0.25} value={draft.points} onChange={(e) => set({ points: Number(e.target.value) })} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${uid}-prompt`}>Nội dung câu hỏi</Label>
        <Textarea id={`${uid}-prompt`} rows={2} value={draft.prompt} onChange={(e) => set({ prompt: e.target.value })} />
      </div>
      <div className="space-y-2">
        <p className="text-muted text-xs font-semibold">{draft.type === "MULTI" ? "Đánh dấu tất cả đáp án đúng" : "Chọn đáp án đúng"}</p>
        {draft.options.map((o, oi) => (
          <div key={oi} className="flex items-center gap-2">
            <input
              type={draft.type === "MULTI" ? "checkbox" : "radio"}
              name={`${uid}-correct`}
              checked={o.isCorrect}
              onChange={(e) => setOpt(oi, { isCorrect: draft.type === "MULTI" ? e.target.checked : true })}
              className="accent-success size-4"
              aria-label={`Đáp án đúng: lựa chọn ${String.fromCharCode(65 + oi)}`}
            />
            <Input
              value={o.label}
              readOnly={draft.type === "TRUE_FALSE"}
              onChange={(e) => setOpt(oi, { label: e.target.value })}
              placeholder={`Lựa chọn ${String.fromCharCode(65 + oi)}`}
              aria-label={`Lựa chọn ${String.fromCharCode(65 + oi)}`}
              className={cn(o.isCorrect && "border-success")}
            />
            {draft.type !== "TRUE_FALSE" && draft.options.length > 2 && (
              <Button type="button" variant="ghost" size="icon" aria-label={`Bỏ lựa chọn ${String.fromCharCode(65 + oi)}`} onClick={() => set({ options: draft.options.filter((_, j) => j !== oi) })}>
                <Trash2 />
              </Button>
            )}
          </div>
        ))}
        {draft.type !== "TRUE_FALSE" && draft.options.length < 8 && (
          <Button type="button" variant="ghost" size="sm" onClick={() => set({ options: [...draft.options, { label: "", isCorrect: false }] })}>
            <Plus /> Thêm lựa chọn
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-danger text-sm font-semibold">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          Hủy
        </Button>
        <Button type="button" onClick={onSave} disabled={pending}>
          {pending ? "Đang lưu…" : "Lưu câu hỏi"}
        </Button>
      </div>
    </fieldset>
  );
}

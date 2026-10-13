"use client";

import * as React from "react";
import Link from "next/link";
import { Library, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TYPE_LABEL, type BankItem } from "../../../questions/bank-manager";

/** Chọn câu từ ngân hàng để chép vào đề đang soạn. Câu đã chép độc lập với ngân hàng. */
export function BankPicker({ bank, onPick }: { bank: BankItem[]; onPick: (items: BankItem[]) => void }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [topic, setTopic] = React.useState("");
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const topics = [...new Set(bank.map((b) => b.topic).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi"));
  const q = query.trim().toLowerCase();
  const shown = bank.filter((b) => (!topic || b.topic === topic) && (!q || b.prompt.toLowerCase().includes(q)));
  const toggle = (id: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <>
      <Button type="button" variant="outline" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Library /> Chọn từ ngân hàng ({bank.length})
      </Button>
      {open && (
        <section aria-label="Chọn câu hỏi từ ngân hàng" className="bg-surface border-border rounded-card order-last w-full space-y-3 border p-4">
          {bank.length === 0 ? (
            <p className="text-muted text-sm">
              Ngân hàng chưa có câu nào. Soạn câu ở bên dưới rồi bấm “Lưu các câu này vào ngân hàng”, hoặc thêm ở{" "}
              <Link href="/teacher/questions" className="text-primary font-semibold hover:underline">
                Ngân hàng câu hỏi
              </Link>
              .
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <div className="relative min-w-48 flex-1">
                  <Search className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden="true" />
                  <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm câu hỏi" aria-label="Tìm câu hỏi trong ngân hàng" className="pl-9" />
                </div>
                {topics.length > 0 && (
                  <select aria-label="Lọc theo chủ đề" value={topic} onChange={(e) => setTopic(e.target.value)} className="border-border bg-surface rounded-control h-10 border px-2 text-sm">
                    <option value="">Mọi chủ đề</option>
                    {topics.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <ul className="divide-border border-border max-h-80 divide-y overflow-y-auto rounded-[12px] border">
                {shown.length === 0 && <li className="text-muted px-3 py-4 text-center text-sm">Không có câu nào khớp.</li>}
                {shown.map((b) => (
                  <li key={b.id}>
                    <label className="hover:bg-surface-2 flex cursor-pointer items-start gap-3 px-3 py-2.5">
                      <input type="checkbox" checked={picked.has(b.id)} onChange={() => toggle(b.id)} className="accent-primary mt-1 size-4 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-sm font-semibold">{b.prompt}</span>
                        <span className="text-muted text-xs">
                          {TYPE_LABEL[b.type]} · {b.options.length} lựa chọn{b.topic ? ` · ${b.topic}` : ""}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setPicked(new Set(shown.map((b) => b.id)))}>
                  Chọn tất cả đang hiện
                </Button>
                <Button
                  type="button"
                  disabled={picked.size === 0}
                  onClick={() => {
                    onPick(bank.filter((b) => picked.has(b.id)));
                    setPicked(new Set());
                    setOpen(false);
                  }}
                >
                  Thêm {picked.size || ""} câu vào đề
                </Button>
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
}

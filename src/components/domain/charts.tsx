"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Màu series theo thứ tự cố định (token --chart-1..4 ở globals.css, đã kiểm tra bằng validate_palette). */
const SERIES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];
const nf = new Intl.NumberFormat("vi-VN");

export type LineSeries = { label: string; values: number[] };

/** Đỉnh trục tròn số, chia được 4 khoảng nguyên. */
function niceMax(v: number) {
  if (v <= 4) return 4;
  const raw = v / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * pow).find((x) => x >= raw) ?? raw;
  return step * 4;
}

/** Biểu đồ đường theo ngày, tối đa 4 series, một trục. Rê chuột/chạm để xem số của từng ngày. */
export function LineChart({ title, labels, series, className }: { title: string; labels: string[]; series: LineSeries[]; className?: string }) {
  const [hover, setHover] = React.useState<number | null>(null);
  const W = 640;
  const H = 240;
  const pad = { l: 36, r: 12, t: 12, b: 26 };
  const n = labels.length;
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const x = (i: number) => pad.l + (n <= 1 ? 0 : (i * (W - pad.l - pad.r)) / (n - 1));
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));
  const empty = series.every((s) => s.values.every((v) => v === 0));
  const labelEvery = Math.ceil(n / 7);

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  }

  return (
    <figure className={cn("min-w-0", className)}>
      <figcaption className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="text-[15px] font-bold">{title}</span>
        {series.length > 1 && (
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            {series.map((s, i) => (
              <span key={s.label} className="text-muted flex items-center gap-1.5 text-xs font-semibold">
                <span className="h-0.5 w-4 rounded-full" style={{ background: SERIES[i] }} aria-hidden="true" />
                {s.label}
              </span>
            ))}
          </span>
        )}
      </figcaption>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full touch-none" role="img" aria-label={`${title}. Số liệu chi tiết ở bảng bên dưới.`} onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
              <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--muted)">
                {nf.format(t)}
              </text>
            </g>
          ))}
          {labels.map((l, i) =>
            i % labelEvery === 0 || i === n - 1 ? (
              <text key={i} x={x(i)} y={H - 6} textAnchor={i === n - 1 ? "end" : i === 0 ? "start" : "middle"} fontSize={11} fill="var(--muted)">
                {l}
              </text>
            ) : null,
          )}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="var(--muted)" strokeWidth={1} strokeDasharray="3 3" />}
          {series.map((s, si) => (
            <g key={s.label}>
              <polyline fill="none" stroke={SERIES[si]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
              {hover !== null && <circle cx={x(hover)} cy={y(s.values[hover] ?? 0)} r={4.5} fill={SERIES[si]} stroke="var(--surface)" strokeWidth={2} />}
            </g>
          ))}
        </svg>
        {empty && <p className="text-muted absolute inset-0 flex items-center justify-center text-sm">Chưa có số liệu trong khoảng thời gian này.</p>}
        {hover !== null && !empty && (
          <div
            className="bg-surface border-border pointer-events-none absolute top-1 z-10 rounded-[10px] border px-3 py-2 text-xs shadow-md"
            style={x(hover) > W / 2 ? { right: `${100 - (x(hover) / W) * 100 + 2}%` } : { left: `${(x(hover) / W) * 100 + 2}%` }}
          >
            <p className="mb-1 font-bold">{labels[hover]}</p>
            {series.map((s, i) => (
              <p key={s.label} className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="size-2 rounded-full" style={{ background: SERIES[i] }} aria-hidden="true" />
                <span className="text-muted">{s.label}</span>
                <b className="ml-auto pl-3 tabular-nums">{nf.format(s.values[hover] ?? 0)}</b>
              </p>
            ))}
          </div>
        )}
      </div>
      <details className="mt-1">
        <summary className="text-muted cursor-pointer text-xs font-semibold">Xem dạng bảng</summary>
        <div className="mt-2 max-h-56 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-muted">
                <th className="py-1 pr-3 font-semibold">Ngày</th>
                {series.map((s) => (
                  <th key={s.label} className="py-1 pr-3 text-right font-semibold">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {labels.map((l, i) => (
                <tr key={i} className="border-border border-t">
                  <td className="py-1 pr-3">{l}</td>
                  {series.map((s) => (
                    <td key={s.label} className="py-1 pr-3 text-right tabular-nums">
                      {nf.format(s.values[i] ?? 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

export type Slice = { label: string; value: number };

/** Biểu đồ tròn (dạng vành) cho tỉ lệ trong một tổng, tối đa 4 phần. Chú giải kèm số và phần trăm nên không phụ thuộc màu. */
export function DonutChart({ title, slices, unit, className }: { title: string; slices: Slice[]; unit: string; className?: string }) {
  const [hover, setHover] = React.useState<number | null>(null);
  const total = slices.reduce((s, x) => s + x.value, 0);
  const R = 42;
  const C = 2 * Math.PI * R;
  const GAP = total > 0 && slices.filter((s) => s.value > 0).length > 1 ? 2 : 0;
  const segments = slices.reduce<{ len: number; offset: number }[]>((acc, s) => {
    const prev = acc.at(-1);
    const offset = prev ? prev.offset + prev.len : 0;
    return [...acc, { len: total ? (s.value / total) * C : 0, offset }];
  }, []);
  const pct = (v: number) => (total ? Math.round((v / total) * 100) : 0);
  const shown = hover !== null ? slices[hover] : null;

  return (
    <figure className={cn("min-w-0", className)}>
      <figcaption className="mb-3 text-[15px] font-bold">{title}</figcaption>
      <div className="flex items-center gap-5">
        <svg viewBox="0 0 100 100" className="size-32 shrink-0 -rotate-90" role="img" aria-label={`${title}: ${slices.map((s) => `${s.label} ${nf.format(s.value)}`).join(", ")}`}>
          <circle cx={50} cy={50} r={R} fill="none" stroke="var(--surface-2)" strokeWidth={12} />
          {slices.map((s, i) =>
            s.value > 0 ? (
              <circle
                key={s.label}
                cx={50}
                cy={50}
                r={R}
                fill="none"
                stroke={SERIES[i]}
                strokeWidth={hover === i ? 15 : 12}
                strokeDasharray={`${Math.max(0, segments[i].len - GAP)} ${C}`}
                strokeDashoffset={-segments[i].offset}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
              />
            ) : null,
          )}
          <text x={50} y={50} transform="rotate(90 50 50)" textAnchor="middle" dominantBaseline="central" fontSize={shown ? 15 : 18} fontWeight={800} fill="var(--foreground)">
            {shown ? `${pct(shown.value)}%` : nf.format(total)}
          </text>
          <text x={50} y={64} transform="rotate(90 50 50)" textAnchor="middle" fontSize={7} fill="var(--muted)">
            {shown ? shown.label : unit}
          </text>
        </svg>
        <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
          {slices.map((s, i) => (
            <li key={s.label} className={cn("flex items-center gap-2 rounded-[8px] px-1.5 py-0.5", hover === i && "bg-surface-2")} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: SERIES[i] }} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{s.label}</span>
              <b className="tabular-nums">{nf.format(s.value)}</b>
              <span className="text-muted w-10 text-right text-xs tabular-nums">{pct(s.value)}%</span>
            </li>
          ))}
        </ul>
      </div>
      {total === 0 && <p className="text-muted mt-2 text-xs">Chưa có số liệu.</p>}
    </figure>
  );
}

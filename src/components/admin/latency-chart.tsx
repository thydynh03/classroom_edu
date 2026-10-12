/**
 * Biểu đồ đường p50/p95/p99 (ms) theo thời gian. SVG thuần, màu lấy từ token (info/warning/danger),
 * có chú thích và bảng số liệu ẩn cho trình đọc màn hình.
 */
type Point = { t: Date; p50: number | null; p95: number | null; p99: number | null };
const SERIES = [
  { key: "p50", label: "p50", color: "var(--info)" },
  { key: "p95", label: "p95", color: "var(--warning)" },
  { key: "p99", label: "p99", color: "var(--danger)" },
] as const;

export function LatencyChart({ points, label }: { points: Point[]; label: (d: Date) => string }) {
  if (points.length < 2) return <p className="text-muted text-sm">Chưa đủ số liệu để vẽ biểu đồ.</p>;
  const W = 640;
  const H = 200;
  const P = { l: 44, r: 8, t: 8, b: 24 };
  const max = Math.max(1, ...points.flatMap((p) => [p.p50 ?? 0, p.p95 ?? 0, p.p99 ?? 0]));
  const x = (i: number) => P.l + (i * (W - P.l - P.r)) / (points.length - 1);
  const y = (v: number) => P.t + (1 - v / max) * (H - P.t - P.b);
  const ticks = [0, max / 2, max];
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Độ trễ p50, p95, p99 theo thời gian (ms)">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="var(--border)" />
            <text x={P.l - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="var(--muted)">
              {Math.round(t)}
            </text>
          </g>
        ))}
        {SERIES.map((s) => (
          <polyline
            key={s.key}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            points={points
              .map((p, i) => (p[s.key] === null ? null : `${x(i)},${y(p[s.key] as number)}`))
              .filter(Boolean)
              .join(" ")}
          />
        ))}
        {[0, points.length - 1].map((i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor={i ? "end" : "start"} fontSize="10" fill="var(--muted)">
            {label(points[i].t)}
          </text>
        ))}
      </svg>
      <figcaption className="text-muted mt-1 flex gap-4 text-xs">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4" style={{ background: s.color }} aria-hidden="true" /> {s.label} (ms)
          </span>
        ))}
      </figcaption>
      <table className="sr-only">
        <caption>Độ trễ theo thời gian</caption>
        <thead>
          <tr>
            <th>Thời điểm</th>
            <th>p50</th>
            <th>p95</th>
            <th>p99</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.t.toISOString()}>
              <td>{label(p.t)}</td>
              <td>{p.p50 === null ? "" : Math.round(p.p50)}</td>
              <td>{p.p95 === null ? "" : Math.round(p.p95)}</td>
              <td>{p.p99 === null ? "" : Math.round(p.p99)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

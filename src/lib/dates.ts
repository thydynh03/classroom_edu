const TZ = "Asia/Ho_Chi_Minh";

/** "Thứ Hai, 29 tháng 9" */
export function longDateVN(d = new Date()) {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TZ,
  }).format(d);
}

const WD = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function vnParts(d: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wdIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(g("weekday"));
  return { wd: WD[wdIndex] ?? "", day: g("day"), month: g("month"), hour: g("hour") === "24" ? "00" : g("hour"), minute: g("minute") };
}

/** "T3 30/09 · 23:59" */
export function dueLabel(d: Date) {
  const p = vnParts(d);
  return `${p.wd} ${p.day}/${p.month} · ${p.hour}:${p.minute}`;
}

/** Thứ trong tuần theo giờ VN: "T2" … "CN" */
export function weekdayVN(d: Date) {
  return vnParts(d).wd;
}

/** Ngày trong tháng theo giờ VN */
export function dayOfMonthVN(d: Date) {
  return Number(vnParts(d).day);
}

/** "29/09 21:14" */
export function shortDateTime(d: Date) {
  const p = vnParts(d);
  return `${p.day}/${p.month} ${p.hour}:${p.minute}`;
}

/** "2 ngày 5 giờ", "3 giờ 10 phút" */
export function durationVN(ms: number) {
  const abs = Math.abs(ms);
  const d = Math.floor(abs / 86400_000);
  const h = Math.floor((abs % 86400_000) / 3600_000);
  const m = Math.floor((abs % 3600_000) / 60_000);
  if (d > 0) return h ? `${d} ngày ${h} giờ` : `${d} ngày`;
  if (h > 0) return m ? `${h} giờ ${m} phút` : `${h} giờ`;
  return `${Math.max(m, 1)} phút`;
}

/** Giá trị cho <input type="datetime-local"> theo giờ VN. */
export function toLocalInputValue(d: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour") === "24" ? "00" : g("hour")}:${g("minute")}`;
}

/** Chuỗi "2026-09-30T23:59" (giờ VN) → Date UTC. */
export function fromLocalInputValue(v: string) {
  return new Date(`${v}:00+07:00`);
}

/** Ngày (theo giờ VN) dạng yyyy-mm-dd, để nhóm theo ngày. */
export function dayKeyVN(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

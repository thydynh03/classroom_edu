/**
 * Format numeric score using Vietnamese decimal separator (,).
 * Example: formatScore(8.5) -> "8,5"
 * Example: formatScore(10) -> "10"
 * Example: formatScore(7.25) -> "7,25"
 */
const scoreFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 2,
});

export function formatScore(score: number): string {
  if (typeof score !== "number" || Number.isNaN(score)) {
    return "";
  }
  return scoreFormatter.format(score);
}

/**
 * Format date/time in Asia/Ho_Chi_Minh timezone as "DD/MM HH:mm".
 * Example: formatDateTimeVN(new Date("2026-09-30T16:59:00Z")) -> "30/09 23:59"
 */
const vnDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatDateTimeVN(date: Date | string | number): string {
  const d =
    typeof date === "object" && date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) {
    return "";
  }

  const parts = vnDateTimeFormatter.formatToParts(d);
  let day = "";
  let month = "";
  let hour = "";
  let minute = "";

  for (const part of parts) {
    if (part.type === "day") day = part.value;
    else if (part.type === "month") month = part.value;
    else if (part.type === "hour") hour = part.value;
    else if (part.type === "minute") minute = part.value;
  }

  return `${day}/${month} ${hour}:${minute}`;
}

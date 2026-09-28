import { describe, expect, it } from "vitest";
import { formatDateTimeVN, formatScore } from "@/lib/format";

describe("formatScore", () => {
  it("formats decimal score with comma separator", () => {
    expect(formatScore(8.5)).toBe("8,5");
    expect(formatScore(7.25)).toBe("7,25");
    expect(formatScore(9.75)).toBe("9,75");
  });

  it("formats integer score without decimal digits", () => {
    expect(formatScore(10)).toBe("10");
    expect(formatScore(0)).toBe("0");
    expect(formatScore(5)).toBe("5");
  });

  it("handles invalid number inputs safely", () => {
    expect(formatScore(Number.NaN)).toBe("");
  });
});

describe("formatDateTimeVN", () => {
  it("formats Date according to Asia/Ho_Chi_Minh in DD/MM HH:mm pattern", () => {
    // 2026-09-30 16:59 UTC = 2026-09-30 23:59 Asia/Ho_Chi_Minh (UTC+7)
    const date = new Date("2026-09-30T16:59:00.000Z");
    expect(formatDateTimeVN(date)).toBe("30/09 23:59");
  });

  it("accepts ISO string input", () => {
    expect(formatDateTimeVN("2026-09-30T16:59:00.000Z")).toBe("30/09 23:59");
  });

  it("accepts millisecond timestamp input", () => {
    const timestamp = Date.parse("2026-09-30T16:59:00.000Z");
    expect(formatDateTimeVN(timestamp)).toBe("30/09 23:59");
  });

  it("handles day/month rollover when UTC crosses midnight in Asia/Ho_Chi_Minh", () => {
    // 2026-09-30 18:00 UTC = 2026-10-01 01:00 Asia/Ho_Chi_Minh
    const date = new Date("2026-09-30T18:00:00.000Z");
    expect(formatDateTimeVN(date)).toBe("01/10 01:00");
  });

  it("pads single-digit days, months, hours, and minutes with leading zeros", () => {
    // 2026-01-05 01:05 UTC = 2026-01-05 08:05 Asia/Ho_Chi_Minh
    const date = new Date("2026-01-05T01:05:00.000Z");
    expect(formatDateTimeVN(date)).toBe("05/01 08:05");
  });

  it("returns empty string for invalid dates", () => {
    expect(formatDateTimeVN("invalid-date-string")).toBe("");
  });
});

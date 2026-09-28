// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  DeadlineChip,
  getDeadlineInfo,
} from "@/components/domain/deadline-chip";

describe("DeadlineChip", () => {
  const baseNow = new Date("2026-09-28T10:00:00Z");

  it("calculates overdue days correctly", () => {
    const dueDate = new Date("2026-09-26T10:00:00Z"); // 2 days ago
    const info = getDeadlineInfo(dueDate, baseNow);
    expect(info.status).toBe("overdue");
    expect(info.text).toBe("Quá hạn 2 ngày");

    render(<DeadlineChip dueDate={dueDate} now={baseNow} />);
    expect(screen.getByText("Quá hạn 2 ngày")).toBeDefined();
  });

  it("calculates overdue hours correctly", () => {
    const dueDate = new Date("2026-09-28T07:00:00Z"); // 3 hours ago
    const info = getDeadlineInfo(dueDate, baseNow);
    expect(info.status).toBe("overdue");
    expect(info.text).toBe("Quá hạn 3 giờ");
  });

  it("calculates urgent hours and minutes correctly", () => {
    const dueDate = new Date("2026-09-28T15:30:00Z"); // in 5 hours 30 mins
    const info = getDeadlineInfo(dueDate, baseNow);
    expect(info.status).toBe("urgent");
    expect(info.text).toBe("Còn 5 giờ 30 phút");

    render(<DeadlineChip dueDate={dueDate} now={baseNow} />);
    expect(screen.getByText("Còn 5 giờ 30 phút")).toBeDefined();
  });

  it("calculates urgent 1 day remaining with hours", () => {
    const dueDate = new Date("2026-09-29T15:00:00Z"); // in 29 hours (1 day 5 hours)
    const info = getDeadlineInfo(dueDate, baseNow);
    expect(info.status).toBe("urgent");
    expect(info.text).toBe("Còn 1 ngày 5 giờ");
  });

  it("calculates normal days remaining correctly", () => {
    const dueDate = new Date("2026-10-02T10:00:00Z"); // in 4 days
    const info = getDeadlineInfo(dueDate, baseNow);
    expect(info.status).toBe("normal");
    expect(info.text).toBe("Còn 4 ngày");

    render(<DeadlineChip dueDate={dueDate} now={baseNow} />);
    expect(screen.getByText("Còn 4 ngày")).toBeDefined();
  });
});

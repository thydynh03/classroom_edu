// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SegmentedProgress } from "@/components/domain/segmented-progress";

describe("SegmentedProgress", () => {
  it("renders progressbar with accessible aria-label", () => {
    render(
      <SegmentedProgress
        graded={10}
        pending={5}
        late={2}
        missing={3}
        total={20}
      />
    );

    const bar = screen.getByRole("progressbar");
    expect(bar).toBeDefined();
    expect(bar.getAttribute("aria-label")).toContain(
      "Tiến độ bài tập: 10 đã chấm, 5 chờ chấm, 2 nộp trễ, 3 chưa nộp trên tổng số 20"
    );
    expect(bar.getAttribute("aria-valuenow")).toBe("17");
    expect(bar.getAttribute("aria-valuemax")).toBe("20");
  });

  it("renders legend when showLegend is true", () => {
    render(
      <SegmentedProgress
        graded={12}
        pending={14}
        late={3}
        missing={9}
        showLegend={true}
      />
    );

    expect(screen.getByText("Đã chấm")).toBeDefined();
    expect(screen.getByText("(12)")).toBeDefined();
    expect(screen.getByText("Chờ chấm")).toBeDefined();
    expect(screen.getByText("(14)")).toBeDefined();
    expect(screen.getByText("Nộp trễ")).toBeDefined();
    expect(screen.getByText("(3)")).toBeDefined();
    expect(screen.getByText("Chưa nộp")).toBeDefined();
    expect(screen.getByText("(9)")).toBeDefined();
  });
});

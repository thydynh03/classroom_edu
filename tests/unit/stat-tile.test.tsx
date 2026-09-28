// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatTile } from "@/components/domain/stat-tile";

describe("StatTile", () => {
  it("renders default variant with label, value, and description", () => {
    const { container } = render(
      <StatTile
        label="Tổng số bài"
        value={42}
        description="Trong 4 lớp học kỳ I"
      />
    );

    expect(screen.getByText("Tổng số bài")).toBeDefined();
    expect(screen.getByText("42")).toBeDefined();
    expect(screen.getByText("Trong 4 lớp học kỳ I")).toBeDefined();

    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain("bg-surface");
    expect(root.className).toContain("border-border");
  });

  it("renders hero variant with primary background and badge", () => {
    const { container } = render(
      <StatTile
        label="Cần chấm"
        value={17}
        description="bài đang chờ cô"
        variant="hero"
        badge={<span>3 lớp</span>}
        action={<button>Bắt đầu chấm</button>}
      />
    );

    expect(screen.getByText("Cần chấm")).toBeDefined();
    expect(screen.getByText("17")).toBeDefined();
    expect(screen.getByText("3 lớp")).toBeDefined();
    expect(screen.getByText("Bắt đầu chấm")).toBeDefined();

    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain("bg-primary");
    expect(root.className).toContain("text-on-primary");
  });
});

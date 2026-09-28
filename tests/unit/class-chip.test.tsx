// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClassChip, type ClassColor } from "@/components/domain/class-chip";

describe("ClassChip", () => {
  const colors: ClassColor[] = [
    "sky",
    "mint",
    "peach",
    "lilac",
    "butter",
    "rose",
  ];

  colors.forEach((color) => {
    it(`renders correctly with color "${color}"`, () => {
      render(<ClassChip color={color}>Lớp 10A1</ClassChip>);
      const chip = screen.getByText("Lớp 10A1");
      expect(chip).toBeDefined();
      expect(chip.className).toContain(`bg-class-${color}-bg`);
      expect(chip.className).toContain(`text-class-${color}-fg`);
    });
  });
});

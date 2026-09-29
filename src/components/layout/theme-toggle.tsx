"use client";

import type { MouseEvent } from "react";
import { flushSync } from "react-dom";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

// Một nút đổi sáng/tối. Trình duyệt có View Transitions thì giao diện mới lan ra thành vòng tròn từ chính nút này
// (CSS tắt hiệu ứng mờ chéo mặc định ở globals.css); trình duyệt cũ đổi ngay.
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  function toggle(e: MouseEvent<HTMLButtonElement>) {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    const root = document.documentElement;
    const apply = () => {
      // Đổi class ngay trong callback để ảnh chụp "sau" của view transition đã mang theme mới.
      root.classList.toggle("dark", next === "dark");
      root.style.colorScheme = next;
      flushSync(() => setTheme(next));
    };
    if (typeof document.startViewTransition !== "function") return apply();

    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(apply).ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 600, easing: "cubic-bezier(0.4, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    });
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Đổi giao diện sáng/tối" title="Đổi giao diện sáng/tối">
      <Sun className="size-5 dark:hidden" aria-hidden />
      <Moon className="hidden size-5 dark:block" aria-hidden />
    </Button>
  );
}

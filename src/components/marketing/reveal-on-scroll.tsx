"use client";

import { useEffect } from "react";

// Hiện dần các phần tử .reveal một lần khi vào khung nhìn (không "lơ lửng" nửa mờ như hiệu ứng gắn theo thanh cuộn).
// Không có JS thì nội dung vẫn hiện bình thường vì class "reveal-ready" chỉ được gắn ở đây.
export function RevealOnScroll() {
  useEffect(() => {
    // Giảm chuyển động: vẫn hiện dần bằng độ mờ, chỉ bỏ phần trượt (xem CSS .reveal-ready).
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    // So le nhẹ giữa các phần tử cùng một khối cha.
    for (const el of els) {
      const idx = el.parentElement ? Array.from(el.parentElement.children).indexOf(el) : 0;
      el.style.transitionDelay = `${Math.min(idx, 4) * 90}ms`;
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight) el.classList.add("is-visible");
      else io.observe(el);
    }
    document.documentElement.classList.add("reveal-ready");
    return () => io.disconnect();
  }, []);
  return null;
}

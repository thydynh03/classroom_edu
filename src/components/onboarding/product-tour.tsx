"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { completeTourAction } from "@/app/account-actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TourStep = {
  /** CSS selector của phần cần làm nổi; bỏ trống (hoặc không thấy trên màn hình) thì hiện thẻ ở giữa */
  target?: string;
  title: string;
  body: string;
};

type Box = { top: number; left: number; width: number; height: number };

const PAD = 8; // khoảng hở quanh phần được làm nổi
const GAP = 14; // khoảng cách từ vùng sáng tới thẻ hướng dẫn
const EDGE = 16;

const noopSubscribe = () => () => {};

/** Phần tử đầu tiên khớp selector và đang hiển thị (thanh bên trên desktop hoặc thanh dưới trên điện thoại). */
function findTarget(selector?: string) {
  if (!selector) return null;
  for (const el of document.querySelectorAll<HTMLElement>(selector)) {
    if (el.getClientRects().length && getComputedStyle(el).visibility !== "hidden") return el;
  }
  return null;
}

function sameBox(a: Box | null, b: Box | null) {
  if (!a || !b) return a === b;
  return Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;
}

/**
 * Hướng dẫn từng bước khi đăng nhập lần đầu: làm tối phần còn lại, chỉ để sáng chỗ cần chú ý.
 * Bỏ qua / Xong đều lưu tour_completed_at để lần sau không tự hiện; xem lại bằng ?tour=1.
 */
export function ProductTour({ steps, initialOpen, replay = false }: { steps: TourStep[]; initialOpen: boolean; replay?: boolean }) {
  const mounted = React.useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [open, setOpen] = React.useState(initialOpen);
  const [index, setIndex] = React.useState(0);
  const [spot, setSpot] = React.useState<Box | null>(null);
  const [cardH, setCardH] = React.useState(220);
  const [view, setView] = React.useState({ w: 1024, h: 768 });
  const cardRef = React.useRef<HTMLDivElement>(null);
  const nextRef = React.useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  const step = steps[index];
  const last = index === steps.length - 1;

  const finish = React.useCallback(() => {
    setOpen(false);
    void completeTourAction();
    if (replay) router.replace(pathname, { scroll: false });
  }, [replay, pathname, router]);

  // Khóa cuộn trang khi đang hướng dẫn (vẫn cuộn được bằng code để đưa phần cần xem vào giữa màn hình).
  React.useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = prev;
    };
  }, [open]);

  // Mỗi bước: đưa phần cần xem vào giữa màn hình, rồi bám theo vị trí của nó mỗi khung hình.
  React.useEffect(() => {
    if (!open) return;
    findTarget(step.target)?.scrollIntoView({ block: "center", inline: "nearest" });
    let raf = 0;
    let prevSpot: Box | null = null;
    const tick = () => {
      const el = findTarget(step.target);
      const r = el?.getBoundingClientRect();
      const next = r ? { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 } : null;
      if (!sameBox(prevSpot, next)) {
        prevSpot = next;
        setSpot(next);
      }
      setView((v) => (v.w === innerWidth && v.h === innerHeight ? v : { w: innerWidth, h: innerHeight }));
      const h = cardRef.current?.offsetHeight;
      if (h) setCardH((p) => (p === h ? p : h));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    nextRef.current?.focus({ preventScroll: true });
    return () => cancelAnimationFrame(raf);
  }, [open, step.target]);

  // Bàn phím: Esc bỏ qua, ←/→ chuyển bước, Tab chỉ đi trong thẻ hướng dẫn.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return finish();
      if (e.key === "ArrowRight") return last ? finish() : setIndex((i) => i + 1);
      if (e.key === "ArrowLeft") return setIndex((i) => Math.max(0, i - 1));
      if (e.key === "Tab" && cardRef.current) {
        const f = [...cardRef.current.querySelectorAll<HTMLElement>("button")];
        if (!f.length) return;
        const at = f.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        f[(at + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, last, finish]);

  if (!mounted || !open || !step) return null;

  const width = Math.min(360, view.w - EDGE * 2);
  const clampX = (x: number) => Math.min(Math.max(x, EDGE), view.w - width - EDGE);
  const clampY = (y: number) => Math.min(Math.max(y, EDGE), view.h - cardH - EDGE);
  let pos: { top: number; left: number };
  if (!spot) pos = { top: clampY((view.h - cardH) / 2), left: clampX((view.w - width) / 2) };
  else if (spot.width < 160 && view.w - (spot.left + spot.width) > width + GAP + EDGE)
    pos = { top: clampY(spot.top + spot.height / 2 - cardH / 2), left: spot.left + spot.width + GAP }; // mục thanh bên: thẻ bên phải
  else if (view.h - (spot.top + spot.height) > cardH + GAP + EDGE)
    pos = { top: spot.top + spot.height + GAP, left: clampX(spot.left + spot.width / 2 - width / 2) }; // bên dưới
  else if (spot.top > cardH + GAP + EDGE)
    pos = { top: spot.top - GAP - cardH, left: clampX(spot.left + spot.width / 2 - width / 2) }; // bên trên
  else pos = { top: view.h - cardH - EDGE, left: clampX((view.w - width) / 2) }; // phần lớn hơn màn hình: thẻ nằm đáy

  return createPortal(
    <div className="fixed inset-0 z-[100]" data-testid="product-tour">
      {spot ? (
        <div
          aria-hidden="true"
          className="ring-primary pointer-events-none fixed rounded-[20px] shadow-[0_0_0_9999px_var(--scrim)] ring-2 transition-all duration-300 ease-out"
          style={spot}
        />
      ) : (
        <div aria-hidden="true" className="bg-scrim fixed inset-0" />
      )}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        className="bg-surface border-border rounded-card fixed border p-5 shadow-2xl transition-[top,left] duration-300 ease-out"
        style={{ ...pos, width }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-primary text-xs font-bold tracking-wide uppercase">
            Bước {index + 1}/{steps.length}
          </span>
          <button
            type="button"
            onClick={finish}
            className="text-muted hover:text-foreground focus-visible:ring-ring rounded-md px-1.5 py-0.5 text-xs font-semibold focus-visible:ring-2 focus-visible:outline-hidden"
          >
            Bỏ qua hướng dẫn
          </button>
        </div>
        <h2 id="tour-title" className="mt-2 text-lg font-extrabold tracking-tight">
          {step.title}
        </h2>
        <p id="tour-body" className="text-muted mt-1.5 text-sm leading-relaxed" aria-live="polite">
          {step.body}
        </p>
        <div className="mt-4 flex gap-1" aria-hidden="true">
          {steps.map((_, i) => (
            <span key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= index ? "bg-primary" : "bg-surface-2")} />
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          {index > 0 ? (
            <Button variant="outline" size="sm" onClick={() => setIndex((i) => i - 1)}>
              <ArrowLeft aria-hidden="true" /> Quay lại
            </Button>
          ) : (
            <span />
          )}
          <Button ref={nextRef} size="sm" onClick={() => (last ? finish() : setIndex((i) => i + 1))}>
            {last ? "Bắt đầu dùng" : index === 0 ? "Bắt đầu hướng dẫn" : "Tiếp"}
            {!last && <ArrowRight aria-hidden="true" />}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

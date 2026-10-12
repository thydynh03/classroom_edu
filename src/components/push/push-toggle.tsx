"use client";

import * as React from "react";
import { useTransition } from "react";
import { BellRing, BellOff, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deletePushSubscriptionAction, savePushSubscriptionAction, sendTestPushAction } from "@/app/account-actions";

function b64ToBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
const noop = () => () => {};
const supported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

async function currentSubscription() {
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  return reg.pushManager.getSubscription();
}

/** Bật / tắt Web Push trên thiết bị đang dùng. variant "banner" cho trang Hôm nay của HS (ẩn được). */
export function PushToggle({ publicKey, variant = "card" }: { publicKey: string | null; variant?: "card" | "banner" }) {
  const ok = React.useSyncExternalStore(noop, supported, () => false);
  const iosNeedsInstall = React.useSyncExternalStore(noop, () => supported() === false && isIos() && !isStandalone(), () => false);
  const [subscribed, setSubscribed] = React.useState<boolean | null>(null);
  const storedDismissed = React.useSyncExternalStore(
    noop,
    () => {
      try {
        return localStorage.getItem("push-banner-dismissed") === "1";
      } catch {
        return false;
      }
    },
    () => false,
  );
  const [dismissedNow, setDismissed] = React.useState(false);
  const dismissed = storedDismissed || dismissedNow;
  const [pending, start] = useTransition();

  React.useEffect(() => {
    if (!ok || !publicKey) return;
    let alive = true;
    currentSubscription()
      .then((s) => alive && setSubscribed(!!s))
      .catch(() => alive && setSubscribed(false));
    return () => {
      alive = false;
    };
  }, [ok, publicKey]);

  if (!publicKey) return null;

  function enable() {
    start(async () => {
      try {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") return void toast.error("Bạn chưa cho phép thông báo. Mở cài đặt trình duyệt để cho phép.");
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey!) }));
        const json = sub.toJSON() as { endpoint: string; keys?: { p256dh?: string; auth?: string } };
        const r = await savePushSubscriptionAction({ endpoint: json.endpoint, p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" });
        if (r.error) return void toast.error(r.error);
        setSubscribed(true);
        toast.success(r.message);
      } catch {
        toast.error("Không bật được thông báo trên trình duyệt này.");
      }
    });
  }

  function disable() {
    start(async () => {
      const sub = await currentSubscription().catch(() => null);
      if (sub) {
        await deletePushSubscriptionAction(sub.endpoint);
        await sub.unsubscribe().catch(() => {});
      }
      setSubscribed(false);
      toast.success("Đã tắt thông báo trên thiết bị này.");
    });
  }

  if (variant === "banner") {
    if (dismissed || subscribed !== false || (!ok && !iosNeedsInstall)) return null;
    return (
      <div role="status" className="bg-info-soft text-info rounded-card flex items-start gap-3 p-4 text-sm">
        <BellRing className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-bold">Bật thông báo để không lỡ hạn nộp</p>
          {iosNeedsInstall ? (
            <p className="mt-0.5">Trên iPhone: bấm nút Chia sẻ → “Thêm vào màn hình chính”, mở app từ màn hình chính rồi bật thông báo.</p>
          ) : (
            <Button size="sm" className="mt-2" disabled={pending} onClick={enable}>
              Bật thông báo
            </Button>
          )}
        </div>
        <button
          type="button"
          aria-label="Ẩn gợi ý bật thông báo"
          className="rounded-full p-1"
          onClick={() => {
            setDismissed(true);
            try {
              localStorage.setItem("push-banner-dismissed", "1");
            } catch {}
          }}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      {!ok ? (
        <p className="text-muted">
          {iosNeedsInstall
            ? "Trên iPhone: bấm Chia sẻ → “Thêm vào màn hình chính”, mở app từ màn hình chính rồi bật thông báo tại đây."
            : "Trình duyệt này không hỗ trợ thông báo đẩy."}
        </p>
      ) : subscribed ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={pending} onClick={() => start(async () => {
            const r = await sendTestPushAction();
            if (r.error) toast.error(r.error);
            else toast.success(r.message);
          })}>
            Gửi thử
          </Button>
          <Button variant="ghost" size="sm" disabled={pending} onClick={disable}>
            <BellOff aria-hidden="true" /> Tắt trên thiết bị này
          </Button>
        </div>
      ) : (
        <Button size="sm" disabled={pending || subscribed === null} onClick={enable}>
          <BellRing aria-hidden="true" /> Bật thông báo trên thiết bị này
        </Button>
      )}
    </div>
  );
}

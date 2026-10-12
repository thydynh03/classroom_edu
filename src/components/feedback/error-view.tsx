"use client";

import * as React from "react";
import { RefreshCw, TriangleAlert, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusScreen } from "./status-screen";

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

/** Nội dung cho error.tsx: phân biệt mất mạng với lỗi hệ thống, có nút Thử lại và mã lỗi để báo admin. */
export function ErrorView({ error, retry, homeHref = "/" }: { error: Error & { digest?: string }; retry: () => void; homeHref?: string }) {
  const online = React.useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  if (!online) {
    return (
      <StatusScreen
        icon={<WifiOff />}
        tone="warning"
        title="Mất kết nối mạng"
        description="Kiểm tra Wi-Fi hoặc dữ liệu di động. Bài đang viết dở vẫn được lưu trên máy này."
        actions={
          <Button onClick={() => retry()}>
            <RefreshCw aria-hidden="true" /> Thử lại
          </Button>
        }
      />
    );
  }
  return (
    <StatusScreen
      icon={<TriangleAlert />}
      tone="danger"
      title="Có lỗi khi tải trang"
      description="Bấm Thử lại. Nếu vẫn lỗi, hãy báo giáo viên hoặc quản trị viên kèm mã lỗi bên dưới."
      code={error.digest}
      actions={
        <>
          <Button onClick={() => retry()}>
            <RefreshCw aria-hidden="true" /> Thử lại
          </Button>
          <Button variant="outline" asChild>
            <a href={homeHref}>Về trang chính</a>
          </Button>
        </>
      }
    />
  );
}

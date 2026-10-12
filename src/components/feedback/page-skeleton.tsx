import { Skeleton } from "@/components/ui/skeleton";

/** Khung chờ khi trang đang tải (mạng chậm): giữ bố cục để người dùng biết đã bấm trúng. */
export function PageSkeleton({ variant = "list" }: { variant?: "list" | "dashboard" | "detail" }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="space-y-5">
      <span className="sr-only">Đang tải…</span>
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-2/3 max-w-md" />
      </div>
      {variant === "dashboard" && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="rounded-card h-24" />
          ))}
        </div>
      )}
      {variant === "detail" ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <Skeleton className="rounded-card h-64" />
          <Skeleton className="rounded-card h-80" />
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="rounded-card h-16" />
          ))}
        </div>
      )}
    </div>
  );
}

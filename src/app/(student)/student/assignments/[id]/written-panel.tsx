"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CloudOff, Send, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileList, FileUploader, type UploadedFileInfo } from "@/components/domain/file-uploader";
import { saveDraftAction, submitAction, unsubmitAction } from "../../actions";

export function WrittenPanel({
  assignmentId,
  initialContent,
  initialFiles,
  canEdit,
  editBlockedReason,
  status,
  dueLabelText,
}: {
  assignmentId: string;
  initialContent: string;
  initialFiles: UploadedFileInfo[];
  canEdit: boolean;
  editBlockedReason?: string;
  status: "NONE" | "DRAFT" | "SUBMITTED" | "GRADED" | "RETURNED";
  dueLabelText: string;
}) {
  const router = useRouter();
  const storageKey = `draft:${assignmentId}`;
  const [content, setContent] = React.useState(initialContent);
  const [files, setFiles] = React.useState(initialFiles);
  const [savedAt, setSavedAt] = React.useState<Date | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [saveFailed, setSaveFailed] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = useTransition();
  const dirty = React.useRef(false);
  const online = React.useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const offline = !online || saveFailed;
  const localDraft = React.useSyncExternalStore(
    subscribeStorage,
    () => {
      try {
        return localStorage.getItem(storageKey);
      } catch {
        return null;
      }
    },
    () => null,
  );
  const canRestore = canEdit && !!localDraft && localDraft !== content;

  const save = React.useCallback(async () => {
    if (!dirty.current || !canEdit) return;
    setSaving(true);
    try {
      const r = await saveDraftAction(assignmentId, { content, fileIds: files.map((f) => f.id) });
      if (r.error) setError(r.error);
      else {
        dirty.current = false;
        setSavedAt(new Date());
        try {
          localStorage.removeItem(storageKey);
        } catch {}
      }
      setSaveFailed(false);
    } catch {
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  }, [assignmentId, canEdit, content, files, storageKey]);

  // Tự lưu 2 giây sau lần gõ cuối
  React.useEffect(() => {
    if (!dirty.current) return;
    try {
      localStorage.setItem(storageKey, content);
    } catch {}
    const t = setTimeout(save, 2000);
    return () => clearTimeout(t);
  }, [content, files, save, storageKey]);

  function submit() {
    setError(null);
    start(async () => {
      const r = await submitAction(assignmentId, { content, fileIds: files.map((f) => f.id) });
      if (r.error) setError(r.error);
      else {
        try {
          localStorage.removeItem(storageKey);
        } catch {}
        toast.success(r.message ?? "Đã nộp bài");
        router.refresh();
      }
    });
  }

  if (!canEdit) {
    return (
      <div className="space-y-3">
        {content.trim() && <p className="bg-surface-2 rounded-[14px] p-3 text-sm whitespace-pre-wrap">{content}</p>}
        <FileList files={files} />
        {!content.trim() && files.length === 0 && <p className="text-muted text-sm">Chưa có bài làm.</p>}
        {status === "SUBMITTED" ? (
          <Button
            variant="outline"
            className="w-full"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await unsubmitAction(assignmentId);
                if (r.error) toast.error(r.error);
                else router.refresh();
              })
            }
          >
            <Undo2 aria-hidden="true" /> Rút lại để sửa
          </Button>
        ) : (
          editBlockedReason && status !== "GRADED" && status !== "RETURNED" && (
            <p className="bg-danger-soft text-danger rounded-control px-3 py-2 text-sm font-medium">{editBlockedReason}</p>
          )
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canRestore && (
        <div role="status" className="bg-info-soft text-info rounded-control flex flex-wrap items-center gap-2 px-3 py-2 text-sm font-semibold">
          Có bản nháp chưa gửi lên máy chủ trên máy này.
          <button
            type="button"
            className="underline"
            onClick={() => {
              dirty.current = true;
              setContent(localDraft ?? "");
            }}
          >
            Khôi phục
          </button>
        </div>
      )}
      {offline && (
        <p role="status" className="bg-warning-soft text-warning rounded-control flex items-center gap-2 px-3 py-2 text-sm font-semibold">
          <CloudOff className="size-4" aria-hidden="true" /> Mất kết nối. Bài viết vẫn được lưu trên máy này.
        </p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="content">Bài làm / ghi chú cho giáo viên</Label>
        <Textarea
          id="content"
          rows={6}
          value={content}
          onChange={(e) => {
            dirty.current = true;
            setContent(e.target.value);
          }}
          onBlur={save}
          placeholder="Viết bài trực tiếp ở đây, hoặc ghi chú cho giáo viên"
        />
      </div>
      <FileUploader
        purpose="SUBMISSION"
        contextId={assignmentId}
        value={files}
        onChange={(f) => {
          dirty.current = true;
          setFiles(f);
        }}
      />
      <p className="text-muted flex items-center gap-1.5 text-xs font-semibold" aria-live="polite">
        <span className={saving ? "bg-warning size-2 rounded-full" : "bg-success size-2 rounded-full"} aria-hidden="true" />
        {saving ? "Đang lưu nháp…" : savedAt ? `Nháp đã lưu lúc ${savedAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}` : "Nháp tự lưu khi bạn gõ"}
      </p>
      {error && <p role="alert" className="bg-danger-soft text-danger rounded-control px-3 py-2 text-sm font-medium">{error}</p>}
      <div className="bg-surface border-border sticky bottom-24 z-10 flex items-center gap-3 rounded-[18px] border p-3 shadow-lg md:static md:border-0 md:p-0 md:shadow-none">
        <p className="text-muted text-xs md:hidden">
          Hạn nộp<b className="text-warning block text-sm">{dueLabelText}</b>
        </p>
        <Button className="flex-1" size="lg" disabled={pending || offline} onClick={submit}>
          <Send aria-hidden="true" /> {status === "RETURNED" ? "Nộp lại" : "Nộp bài"}
        </Button>
      </div>
    </div>
  );
}

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

function subscribeStorage(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

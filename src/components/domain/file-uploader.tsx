"use client";

import * as React from "react";
import { Camera, FileText, Loader2, Paperclip, X } from "lucide-react";
import { completeUploadAction, requestUploadAction } from "@/app/files/actions";
import { ACCEPT_ATTR, FILE_RULES, formatBytes } from "@/server/storage/file-rules";
import { cn } from "@/lib/utils";

export type UploadedFileInfo = { id: string; name: string; mime: string; size: number };
type Pending = { key: string; name: string; progress: "uploading" | "error"; error?: string };

/**
 * Ảnh JPEG/PNG/WebP được vẽ lại qua canvas: thu nhỏ (cạnh dài ≤ 2000px) và
 * mất toàn bộ EXIF (kể cả vị trí GPS) trước khi upload.
 */
async function prepareImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob) return file;
    const base = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function FileUploader({
  purpose,
  contextId,
  value,
  onChange,
  inputName,
  disabled,
  compact,
}: {
  purpose: "ATTACHMENT" | "SUBMISSION";
  contextId: string;
  value: UploadedFileInfo[];
  onChange: (files: UploadedFileInfo[]) => void;
  inputName?: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [pending, setPending] = React.useState<Pending[]>([]);
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const valueRef = React.useRef(value);
  React.useEffect(() => {
    valueRef.current = value;
  }, [value]);
  const rule = FILE_RULES[purpose];

  async function uploadOne(raw: File) {
    const key = `${raw.name}-${Math.random()}`;
    setPending((p) => [...p, { key, name: raw.name, progress: "uploading" }]);
    const fail = (error: string) =>
      setPending((p) => p.map((x) => (x.key === key ? { ...x, progress: "error", error } : x)));
    try {
      const file = await prepareImage(raw);
      const mime = file.type || "application/octet-stream";
      const ticket = await requestUploadAction({ purpose, contextId, name: file.name, mime, size: file.size });
      if (!ticket.ok) return fail(ticket.error);
      const put = await fetch(ticket.url, { method: "PUT", body: file, headers: { "Content-Type": mime } });
      if (!put.ok) return fail("Tải lên thất bại. Kiểm tra mạng rồi thử lại.");
      const done = await completeUploadAction(ticket.fileId);
      if (!done.ok) return fail(done.error);
      setPending((p) => p.filter((x) => x.key !== key));
      onChange([...valueRef.current, done.file]);
    } catch {
      fail("Mất kết nối khi tải lên. Thử lại.");
    }
  }

  function handleFiles(list: FileList | null) {
    if (!list) return;
    const room = rule.maxFiles - value.length - pending.filter((p) => p.progress === "uploading").length;
    Array.from(list)
      .slice(0, Math.max(0, room))
      .forEach((f) => void uploadOne(f));
  }

  const full = value.length >= rule.maxFiles;

  return (
    <div className="space-y-2">
      {inputName && value.map((f) => <input key={f.id} type="hidden" name={inputName} value={f.id} />)}
      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((f) => (
            <li key={f.id} className="border-border bg-surface flex items-center gap-3 rounded-[14px] border px-3 py-2">
              <FileIcon mime={f.mime} />
              <a href={`/files/${f.id}?inline=1`} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">
                {f.name}
              </a>
              <span className="text-muted text-xs tabular-nums">{formatBytes(f.size)}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onChange(value.filter((x) => x.id !== f.id))}
                  className="text-muted hover:bg-danger-soft hover:text-danger rounded-full p-1"
                  aria-label={`Bỏ file ${f.name}`}
                >
                  <X className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {pending.map((p) => (
        <div
          key={p.key}
          className={cn(
            "flex items-center gap-3 rounded-[14px] border px-3 py-2 text-sm",
            p.progress === "error" ? "border-danger/40 bg-danger-soft text-danger" : "border-border text-muted",
          )}
          role={p.progress === "error" ? "alert" : "status"}
        >
          {p.progress === "uploading" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <X className="size-4" aria-hidden="true" />}
          <span className="min-w-0 flex-1 truncate">{p.progress === "uploading" ? `Đang tải ${p.name}…` : `${p.name}: ${p.error}`}</span>
          {p.progress === "error" && (
            <button type="button" className="text-xs font-bold underline" onClick={() => setPending((x) => x.filter((y) => y.key !== p.key))}>
              Đóng
            </button>
          )}
        </div>
      ))}
      {!disabled && !full && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex flex-col items-center gap-2 rounded-[16px] border-2 border-dashed px-4 text-center",
            compact ? "py-4" : "py-6",
            dragOver ? "border-primary bg-primary-soft" : "border-border",
          )}
        >
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="bg-primary-soft text-primary rounded-control focus-visible:ring-ring inline-flex h-9 items-center gap-1.5 px-3 text-sm font-bold focus-visible:ring-2 focus-visible:outline-hidden"
            >
              <Paperclip className="size-4" aria-hidden="true" /> Chọn file
            </button>
            {purpose === "SUBMISSION" && (
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="bg-surface-2 rounded-control focus-visible:ring-ring inline-flex h-9 items-center gap-1.5 px-3 text-sm font-bold focus-visible:ring-2 focus-visible:outline-hidden"
              >
                <Camera className="size-4" aria-hidden="true" /> Chụp ảnh
              </button>
            )}
          </div>
          <p className="text-muted text-xs">
            PDF, Word, PowerPoint, Excel, ảnh, zip · tối đa {rule.maxBytes / 1024 / 1024} MB/file · {rule.maxFiles} file
          </p>
          <input ref={inputRef} type="file" multiple accept={ACCEPT_ATTR} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
        </div>
      )}
    </div>
  );
}

export function FileIcon({ mime }: { mime: string }) {
  const label = mime.startsWith("image/") ? "ẢNH" : mime === "application/pdf" ? "PDF" : mime.includes("word") ? "DOC" : mime.includes("sheet") || mime.includes("excel") ? "XLS" : mime.includes("presentation") || mime.includes("powerpoint") ? "PPT" : "";
  const tone = mime.startsWith("image/") ? "bg-class-sky-bg text-class-sky-fg" : mime === "application/pdf" ? "bg-class-rose-bg text-class-rose-fg" : "bg-class-mint-bg text-class-mint-fg";
  return (
    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-[10px] text-[10px] font-extrabold", tone)} aria-hidden="true">
      {label || <FileText className="size-4" />}
    </span>
  );
}

export function FileList({ files }: { files: UploadedFileInfo[] }) {
  if (!files.length) return null;
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {files.map((f) => (
        <li key={f.id}>
          <a
            href={`/files/${f.id}?inline=1`}
            target="_blank"
            rel="noreferrer"
            className="border-border bg-surface hover:bg-surface-2 flex items-center gap-3 rounded-[14px] border px-3 py-2"
          >
            <FileIcon mime={f.mime} />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{f.name}</span>
            <span className="text-muted text-xs tabular-nums">{formatBytes(f.size)}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

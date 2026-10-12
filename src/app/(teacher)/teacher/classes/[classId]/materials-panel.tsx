"use client";

import * as React from "react";
import { useActionState, useTransition } from "react";
import { FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormAlert } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { FileList, FileUploader, type UploadedFileInfo } from "@/components/domain/file-uploader";
import { createMaterialAction, deleteMaterialAction } from "../../actions";
import type { ActionState } from "@/lib/action";

type Material = { id: string; title: string; body: string; createdAt: Date; files: UploadedFileInfo[] };

export function MaterialsPanel({ classId, materials }: { classId: string; materials: Material[] }) {
  const [files, setFiles] = React.useState<UploadedFileInfo[]>([]);
  const [formKey, setFormKey] = React.useState(0);
  const [state, action] = useActionState(async (prev: ActionState, fd: FormData) => {
    const r = await createMaterialAction(classId, prev, fd);
    if (r.ok) {
      setFiles([]);
      setFormKey((k) => k + 1);
    }
    return r;
  }, {});
  const [pending, start] = useTransition();

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section aria-labelledby="mat-list" className="space-y-3">
        <h2 id="mat-list" className="text-[15px] font-bold">Tài liệu đã đăng ({materials.length})</h2>
        {materials.length === 0 ? (
          <p className="text-muted bg-surface border-border rounded-card border border-dashed p-6 text-center text-sm">
            Chưa có tài liệu. Đăng bài giảng, đề cương, phiếu ôn tập… học sinh xem được mà không cần nộp bài.
          </p>
        ) : (
          materials.map((m) => (
            <article key={m.id} className="bg-surface border-border rounded-card border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 font-bold">
                    <FileText className="text-muted size-4 shrink-0" aria-hidden="true" /> {m.title}
                  </h3>
                  <p className="text-muted text-xs">{new Date(m.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" })}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger"
                  disabled={pending}
                  aria-label={`Xóa tài liệu ${m.title}`}
                  onClick={() => start(async () => void (confirm("Xóa tài liệu này?") && (await deleteMaterialAction(m.id))))}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
              {m.body && <p className="mt-2 text-sm whitespace-pre-line">{m.body}</p>}
              {m.files.length > 0 && (
                <div className="mt-3">
                  <FileList files={m.files} />
                </div>
              )}
            </article>
          ))
        )}
      </section>
      <section aria-labelledby="mat-new" className="bg-surface border-border rounded-card h-fit border p-5">
        <h2 id="mat-new" className="mb-3 text-[15px] font-bold">Đăng tài liệu</h2>
        <form key={formKey} action={action} className="space-y-3">
          <FormAlert state={state} />
          <Field label="Tiêu đề" name="title" maxLength={200} error={state.fieldErrors?.title} />
          <div className="space-y-1.5">
            <Label htmlFor="mat-body">Nội dung</Label>
            <Textarea id="mat-body" name="body" rows={4} maxLength={20000} aria-invalid={state.fieldErrors?.body ? true : undefined} />
            {state.fieldErrors?.body && <p className="text-danger text-xs font-medium">{state.fieldErrors.body}</p>}
          </div>
          <FileUploader purpose="ATTACHMENT" contextId={classId} value={files} onChange={setFiles} inputName="attachmentIds" compact />
          <SubmitButton>Đăng tài liệu</SubmitButton>
        </form>
      </section>
    </div>
  );
}

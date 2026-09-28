"use client";

import * as React from "react";
import { useActionState } from "react";
import { Field, FormAlert } from "@/components/forms/field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FileUploader, type UploadedFileInfo } from "@/components/domain/file-uploader";
import { COLOR_CLASSES, type ClassColor } from "@/components/domain/class-chip";
import type { ActionState } from "@/lib/action";
import { cn } from "@/lib/utils";

type ClassOption = { id: string; name: string; color: ClassColor };

export function AssignmentForm({
  action,
  classes,
  mode,
  initial,
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  classes: ClassOption[];
  mode: "create" | "edit";
  initial: {
    classIds: string[];
    type: "WRITTEN" | "QUIZ";
    title: string;
    body: string;
    maxPoints: number;
    dueAt: string;
    allowLate: boolean;
    allowResubmit: boolean;
    showResults: "IMMEDIATE" | "AFTER_DUE" | "MANUAL";
    attachments: UploadedFileInfo[];
  };
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [type, setType] = React.useState(initial.type);
  const [selected, setSelected] = React.useState<string[]>(initial.classIds);
  const [files, setFiles] = React.useState<UploadedFileInfo[]>(initial.attachments);
  const fe = state.fieldErrors ?? {};
  const uploadContext = selected[0] ?? initial.classIds[0];

  return (
    <form action={formAction} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]" noValidate>
      <div className="bg-surface border-border rounded-card space-y-5 border p-5 sm:p-6">
        <FormAlert state={state} />
        {mode === "create" ? (
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Loại bài</legend>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["WRITTEN", "Tự luận", "Học sinh viết bài hoặc nộp file, bạn chấm tay."],
                  ["QUIZ", "Trắc nghiệm", "Tự chấm điểm. Soạn câu hỏi ở bước sau."],
                ] as const
              ).map(([v, label, hint]) => (
                <label key={v} className="cursor-pointer">
                  <input type="radio" name="type" value={v} checked={type === v} onChange={() => setType(v)} className="peer sr-only" />
                  <span className="peer-checked:border-primary peer-checked:bg-primary-soft peer-focus-visible:ring-ring border-border rounded-control block h-full border p-3 peer-focus-visible:ring-2">
                    <b className="block text-sm">{label}</b>
                    <span className="text-muted text-xs">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          <input type="hidden" name="type" value={type} />
        )}

        <Field label="Tiêu đề" name="title" required defaultValue={initial.title} placeholder="Bài tập Hàm số bậc hai" error={fe.title} />

        <div className="space-y-1.5">
          <Label htmlFor="body">{type === "QUIZ" ? "Hướng dẫn (tùy chọn)" : "Đề bài"}</Label>
          <Textarea
            id="body"
            name="body"
            rows={8}
            defaultValue={initial.body}
            placeholder={type === "QUIZ" ? "Làm trong 20 phút, không dùng tài liệu." : "Làm bài 1 đến 5 trang 42 SGK…"}
            aria-describedby="body-hint"
          />
          <p id="body-hint" className="text-muted text-xs">Văn bản thuần, xuống dòng được giữ nguyên.</p>
        </div>

        {type === "WRITTEN" && uploadContext && (
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Tài liệu đính kèm</p>
            <FileUploader purpose="ATTACHMENT" contextId={uploadContext} value={files} onChange={setFiles} inputName="attachmentIds" compact />
          </div>
        )}
      </div>

      <aside className="space-y-5">
        <div className="bg-surface border-border rounded-card space-y-4 border p-5">
          {mode === "create" ? (
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Giao cho lớp</legend>
              {classes.length === 0 && <p className="text-muted text-sm">Bạn chưa có lớp nào đang hoạt động.</p>}
              <div className="flex flex-wrap gap-2">
                {classes.map((c) => (
                  <label key={c.id} className="cursor-pointer">
                    <input
                      type="checkbox"
                      name="classIds"
                      value={c.id}
                      checked={selected.includes(c.id)}
                      onChange={(e) => setSelected((s) => (e.target.checked ? [...s, c.id] : s.filter((x) => x !== c.id)))}
                      className="peer sr-only"
                    />
                    <span className={cn("peer-checked:ring-foreground peer-focus-visible:ring-ring inline-flex h-8 items-center rounded-full px-3 text-xs font-bold opacity-60 ring-offset-2 peer-checked:opacity-100 peer-checked:ring-2 peer-focus-visible:ring-2", COLOR_CLASSES[c.color])}>
                      {c.name}
                    </span>
                  </label>
                ))}
              </div>
              {fe.classIds && <p className="text-danger mt-1 text-xs font-medium">{fe.classIds}</p>}
              {selected.length > 1 && <p className="text-muted mt-2 text-xs">Mỗi lớp nhận một bản riêng để theo dõi và chấm tách biệt.</p>}
            </fieldset>
          ) : (
            initial.classIds.map((id) => <input key={id} type="hidden" name="classIds" value={id} />)
          )}

          <Field label="Hạn nộp (giờ Việt Nam)" name="dueAt" type="datetime-local" required defaultValue={initial.dueAt} error={fe.dueAt} />
          <Field
            label={type === "QUIZ" ? "Thang điểm (điểm các câu được quy đổi về thang này)" : "Điểm tối đa"}
            name="maxPoints"
            type="number"
            inputMode="decimal"
            min={1}
            max={1000}
            step="0.25"
            defaultValue={initial.maxPoints}
            error={fe.maxPoints}
          />
          <Check name="allowLate" label="Nhận bài nộp trễ (đánh dấu trễ)" defaultChecked={initial.allowLate} />
          {type === "WRITTEN" ? (
            <Check name="allowResubmit" label="Cho phép nộp lại sau khi trả bài" defaultChecked={initial.allowResubmit} />
          ) : (
            <input type="hidden" name="allowResubmit" value="" />
          )}
          {type === "QUIZ" ? (
            <div className="space-y-1.5">
              <Label htmlFor="showResults">Học sinh xem kết quả</Label>
              <select id="showResults" name="showResults" defaultValue={initial.showResults} className="border-border bg-surface rounded-control focus-visible:ring-ring h-10 w-full border px-3 text-sm focus-visible:ring-2 focus-visible:outline-hidden">
                <option value="IMMEDIATE">Ngay sau khi nộp</option>
                <option value="AFTER_DUE">Sau hạn nộp</option>
                <option value="MANUAL">Khi tôi trả bài</option>
              </select>
            </div>
          ) : (
            <input type="hidden" name="showResults" value="MANUAL" />
          )}
        </div>

        {mode === "create" && type === "WRITTEN" && (
          <div className="bg-surface border-border rounded-card space-y-2 border p-5">
            <Field
              label="Lên lịch đăng (tùy chọn)"
              name="publishAt"
              type="datetime-local"
              hint="Bài tự đăng và gửi thông báo cho học sinh vào giờ này."
              error={fe.publishAt}
            />
            <Button type="submit" name="intent" value="schedule" variant="outline" className="w-full" disabled={pending}>
              Lên lịch đăng
            </Button>
          </div>
        )}
        <div className="flex flex-col gap-2">
          {mode === "create" && type === "WRITTEN" && (
            <Button type="submit" name="intent" value="publish" disabled={pending}>
              Đăng ngay
            </Button>
          )}
          <Button type="submit" name="intent" value="draft" variant={mode === "create" && type === "WRITTEN" ? "outline" : "default"} disabled={pending}>
            {mode === "edit" ? "Lưu thay đổi" : type === "QUIZ" ? "Tiếp: soạn câu hỏi" : "Lưu nháp"}
          </Button>
        </div>
      </aside>
    </form>
  );
}

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="accent-primary mt-0.5 size-4" />
      {label}
    </label>
  );
}

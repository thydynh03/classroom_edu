"use client";

import { useActionState } from "react";
import { Field, FormAlert } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { COLOR_CLASSES, type ClassColor } from "@/components/domain/class-chip";
import type { ActionState } from "@/lib/action";
import { cn } from "@/lib/utils";

const COLORS: { value: ClassColor; label: string }[] = [
  { value: "sky", label: "Xanh trời" },
  { value: "mint", label: "Xanh bạc hà" },
  { value: "peach", label: "Cam đào" },
  { value: "lilac", label: "Tím nhạt" },
  { value: "butter", label: "Vàng bơ" },
  { value: "rose", label: "Hồng" },
];

export function ClassForm({
  action,
  initial,
  submitLabel,
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  initial?: { name: string; subject: string; schoolYear: string | null; color: ClassColor };
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="max-w-xl space-y-4" noValidate>
      <FormAlert state={state} />
      <Field label="Tên lớp" name="name" required defaultValue={initial?.name} placeholder="Ví dụ: 10A1 · Toán" error={state.fieldErrors?.name} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Môn học" name="subject" required defaultValue={initial?.subject} placeholder="Toán" error={state.fieldErrors?.subject} />
        <Field label="Năm học (tùy chọn)" name="schoolYear" defaultValue={initial?.schoolYear ?? ""} placeholder="2026–2027" error={state.fieldErrors?.schoolYear} />
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Màu lớp</legend>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c, i) => (
            <label key={c.value} className="cursor-pointer">
              <input
                type="radio"
                name="color"
                value={c.value}
                defaultChecked={initial ? initial.color === c.value : i === 0}
                className="peer sr-only"
              />
              <span
                className={cn(
                  "peer-checked:ring-foreground peer-focus-visible:ring-ring inline-flex h-9 items-center rounded-full px-3.5 text-sm font-semibold ring-offset-2 peer-checked:ring-2 peer-focus-visible:ring-2",
                  COLOR_CLASSES[c.value],
                )}
              >
                {c.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}

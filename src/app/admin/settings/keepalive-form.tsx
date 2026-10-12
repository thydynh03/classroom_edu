"use client";

import { useActionState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FormAlert } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { pingNowAction, saveKeepaliveAction } from "../actions";

export function KeepaliveForm({ enabled, intervalHours, min, max }: { enabled: boolean; intervalHours: number; min: number; max: number }) {
  const [state, action] = useActionState(saveKeepaliveAction, {});
  const [pending, start] = useTransition();
  return (
    <form action={action} className="mt-4 space-y-4">
      <FormAlert state={state} />
      <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold">
        <input type="checkbox" name="enabled" defaultChecked={enabled} className="accent-primary size-5" />
        Tự động ping database định kỳ
      </label>
      <Field
        label="Chu kỳ (giờ)"
        name="intervalHours"
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        defaultValue={intervalHours}
        hint="Gợi ý: 24 giờ. Không quá 144 giờ."
        error={state.fieldErrors?.intervalHours}
      />
      <div className="flex flex-wrap gap-2">
        <SubmitButton>Lưu cài đặt</SubmitButton>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await pingNowAction();
              if (r.error) toast.error(r.error);
              else toast.success(r.message);
            })
          }
        >
          Ping ngay
        </Button>
      </div>
    </form>
  );
}

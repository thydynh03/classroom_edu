"use client";

import { useActionState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Field, FormAlert } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { grantFeatureAction, markContactedAction, rejectRequestAction, revokeGrantAction } from "../actions";

const MONTHS = [
  ["1", "1 tháng"],
  ["3", "3 tháng"],
  ["6", "6 tháng"],
  ["12", "12 tháng"],
  ["forever", "Không thời hạn"],
] as const;

function MonthsSelect({ id }: { id: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Thời hạn</Label>
      <select id={id} name="months" defaultValue="1" className="border-border bg-surface rounded-control h-10 w-full border px-3 text-sm">
        {MONTHS.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

export function RequestActions({ id, status, featureKey, canGrant }: { id: string; status: string; featureKey: string; canGrant: boolean }) {
  const [pending, start] = useTransition();
  const [state, action] = useActionState(grantFeatureAction, {});
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) toast.error(r.error ?? "Không thực hiện được");
      else toast.success(ok);
    });
  return (
    <div className="flex w-full flex-col gap-2 sm:w-64">
      {canGrant && (
        <form action={action} className="space-y-2">
          <FormAlert state={state} />
          <input type="hidden" name="requestId" value={id} />
          <input type="hidden" name="featureKey" value={featureKey} />
          <MonthsSelect id={`months-${id}`} />
          <SubmitButton className="w-full">Mở khóa</SubmitButton>
        </form>
      )}
      <div className="flex gap-2">
        {status === "NEW" && (
          <Button variant="outline" size="sm" className="flex-1" disabled={pending} onClick={() => run(() => markContactedAction(id), "Đã đánh dấu đã liên hệ")}>
            Đã liên hệ
          </Button>
        )}
        <Button variant="ghost" size="sm" className="text-danger flex-1" disabled={pending} onClick={() => run(() => rejectRequestAction(id), "Đã từ chối")}>
          Từ chối
        </Button>
      </div>
    </div>
  );
}

export function RevokeButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-danger"
      disabled={pending}
      onClick={() =>
        start(async () => {
          if (!confirm("Thu hồi quyền dùng tính năng này?")) return;
          const r = await revokeGrantAction(id);
          if (!r.ok) toast.error(r.error);
          else toast.success("Đã thu hồi");
        })
      }
    >
      Thu hồi
    </Button>
  );
}

export function GrantForm({ features }: { features: { key: string; title: string }[] }) {
  const [state, action] = useActionState(grantFeatureAction, {});
  return (
    <form action={action} className="space-y-3">
      <FormAlert state={state} />
      <Field label="Tên đăng nhập giáo viên" name="username" error={state.fieldErrors?.username} />
      <div className="space-y-1.5">
        <Label htmlFor="grant-feature">Tính năng</Label>
        <select id="grant-feature" name="featureKey" className="border-border bg-surface rounded-control h-10 w-full border px-3 text-sm">
          {features.map((f) => (
            <option key={f.key} value={f.key}>
              {f.title}
            </option>
          ))}
        </select>
      </div>
      <MonthsSelect id="grant-months" />
      <SubmitButton>Mở khóa</SubmitButton>
    </form>
  );
}

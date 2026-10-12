"use client";

import { useActionState } from "react";
import { ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/forms/submit-button";
import { reauthAction } from "./actions";

/** Thao tác nhạy cảm (khóa, cấp mật khẩu, tạo/duyệt GV, mở khóa tính năng) cần nhập lại mật khẩu sau 15 phút. */
export function ReauthBar() {
  const [state, action] = useActionState(reauthAction, {});
  return (
    <div className="bg-warning-soft border-warning/30 border-b px-4 py-3 md:px-8">
      <form action={action} className="mx-auto flex max-w-6xl flex-wrap items-end gap-3">
        <p className="text-warning flex min-w-60 flex-1 items-center gap-2 text-sm font-semibold">
          <ShieldAlert className="size-4 shrink-0" aria-hidden="true" />
          Xác nhận lại mật khẩu để khóa tài khoản, cấp mật khẩu tạm, tạo/duyệt giáo viên hoặc mở khóa tính năng (hiệu lực 15 phút).
        </p>
        <div className="space-y-1">
          <Label htmlFor="reauth-password" className="sr-only">
            Mật khẩu của bạn
          </Label>
          <Input
            id="reauth-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Mật khẩu của bạn"
            className="h-9 w-56"
            aria-invalid={state.fieldErrors?.password ? true : undefined}
            aria-describedby={state.fieldErrors?.password || state.error ? "reauth-err" : undefined}
          />
        </div>
        <SubmitButton size="sm">Xác nhận</SubmitButton>
        {(state.fieldErrors?.password || state.error) && (
          <p id="reauth-err" role="alert" className="text-danger w-full text-xs font-medium">
            {state.fieldErrors?.password ?? state.error}
          </p>
        )}
      </form>
    </div>
  );
}

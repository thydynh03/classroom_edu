"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordAction } from "../actions";
import { Field, FormAlert } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, {});
  if (state.ok)
    return (
      <div className="space-y-4">
        <FormAlert state={state} />
        <Link href="/login" className="text-primary font-semibold hover:underline">
          Đến trang đăng nhập
        </Link>
      </div>
    );
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormAlert state={state} />
      <input type="hidden" name="token" value={token} />
      <Field
        label="Mật khẩu mới"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.newPassword}
      />
      <Field
        label="Nhập lại mật khẩu mới"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.confirm}
      />
      <SubmitButton className="w-full">Đặt mật khẩu mới</SubmitButton>
    </form>
  );
}

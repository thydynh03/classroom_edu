"use client";

import { useActionState } from "react";
import { changePasswordAction } from "../actions";
import { Field, FormAlert } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";

export function ChangeForm() {
  const [state, action] = useActionState(changePasswordAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormAlert state={state} />
      <Field
        label="Mật khẩu hiện tại"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        required
        error={state.fieldErrors?.currentPassword}
      />
      <Field
        label="Mật khẩu mới"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        required
        hint="Ít nhất 8 ký tự"
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
      <SubmitButton className="w-full">Lưu mật khẩu mới</SubmitButton>
    </form>
  );
}

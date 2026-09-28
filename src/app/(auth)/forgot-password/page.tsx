"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction } from "../actions";
import { Field, FormAlert } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";

export default function ForgotPasswordPage() {
  const [state, action] = useActionState(forgotPasswordAction, {});
  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">Quên mật khẩu</h1>
      <p className="text-muted mt-1 mb-6 text-sm">
        Nhập email tài khoản. Học sinh không có email: nhờ giáo viên của lớp cấp lại mật khẩu.
      </p>
      {state.ok ? (
        <FormAlert state={state} />
      ) : (
        <form action={action} className="space-y-4" noValidate>
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            error={state.fieldErrors?.email}
          />
          <SubmitButton className="w-full">Gửi liên kết đặt lại</SubmitButton>
        </form>
      )}
      <p className="text-muted mt-6 text-center text-sm">
        <Link href="/login" className="text-primary font-semibold hover:underline">
          Quay lại đăng nhập
        </Link>
      </p>
    </>
  );
}

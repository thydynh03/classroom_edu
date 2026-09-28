"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction } from "../actions";
import { Field, FormAlert } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";

export default function RegisterPage() {
  const [state, action] = useActionState(registerAction, {});
  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">Tạo tài khoản giáo viên</h1>
      <p className="text-muted mt-1 mb-6 text-sm">
        Học sinh không cần đăng ký: giáo viên tạo tài khoản hoặc gửi mã lớp.
      </p>
      {state.ok ? (
        <FormAlert state={state} />
      ) : (
        <form action={action} className="space-y-4" noValidate>
          <FormAlert state={state} />
          <Field
            label="Họ và tên"
            name="fullName"
            autoComplete="name"
            required
            error={state.fieldErrors?.fullName}
          />
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            error={state.fieldErrors?.email}
          />
          <Field
            label="Tên đăng nhập"
            name="username"
            autoComplete="username"
            required
            hint="Chữ thường, số, dấu chấm. Ví dụ: co.ha"
            error={state.fieldErrors?.username}
          />
          <Field
            label="Mật khẩu"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            hint="Ít nhất 8 ký tự"
            error={state.fieldErrors?.password}
          />
          <SubmitButton className="w-full" pendingText="Đang tạo tài khoản…">
            Tạo tài khoản
          </SubmitButton>
        </form>
      )}
      <p className="text-muted mt-6 text-center text-sm">
        Đã có tài khoản?{" "}
        <Link href="/login" className="text-primary font-semibold hover:underline">
          Đăng nhập
        </Link>
      </p>
    </>
  );
}

"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "../actions";
import { Field, FormAlert } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormAlert state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field
        label="Email hoặc tên đăng nhập"
        name="identifier"
        autoComplete="username"
        required
        autoFocus
        error={state.fieldErrors?.identifier}
      />
      <Field
        label="Mật khẩu"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password}
      />
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-primary text-sm font-semibold hover:underline">
          Quên mật khẩu?
        </Link>
      </div>
      <SubmitButton className="w-full" pendingText="Đang đăng nhập…">
        Đăng nhập
      </SubmitButton>
    </form>
  );
}

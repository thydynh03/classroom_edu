"use client";

import { useActionState, useTransition, useState } from "react";
import { joinSignupAction, joinWithCodeAction } from "@/app/account-actions";
import { Field, FormAlert } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";

export function JoinSignupForm({ code }: { code: string }) {
  const [state, action] = useActionState(joinSignupAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormAlert state={state} />
      <input type="hidden" name="code" value={code} />
      <Field label="Họ và tên" name="fullName" autoComplete="name" required error={state.fieldErrors?.fullName} />
      <Field
        label="Tên đăng nhập"
        name="username"
        autoComplete="username"
        required
        hint="Chữ thường, số, dấu chấm. Ví dụ: tranminhkhoa"
        error={state.fieldErrors?.username}
      />
      <Field label="Mật khẩu" name="password" type="password" autoComplete="new-password" required hint="Ít nhất 8 ký tự" error={state.fieldErrors?.password} />
      <SubmitButton className="w-full" pendingText="Đang tham gia…">
        Tạo tài khoản và vào lớp
      </SubmitButton>
    </form>
  );
}

export function JoinButton({ code }: { code: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      {error && <p role="alert" className="bg-danger-soft text-danger rounded-control px-3 py-2.5 text-sm font-medium">{error}</p>}
      <Button
        className="w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await joinWithCodeAction(code);
            if (r?.error) setError(r.error);
          })
        }
      >
        Vào lớp
      </Button>
    </div>
  );
}

"use client";

import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FormAlert } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { clearLockAction, createTeacherAction, resetPasswordAction, setStatusAction, type CreateTeacherState } from "./actions";

export function UserActions({
  userId,
  name,
  status,
  loginLocked,
}: {
  userId: string;
  name: string;
  status: "ACTIVE" | "LOCKED" | "DISABLED";
  loginLocked: boolean;
}) {
  const [pending, start] = useTransition();
  const [temp, setTemp] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {temp && (
        <span role="status" className="bg-warning-soft text-warning rounded-control px-2 py-1 font-mono text-xs select-all">
          Mật khẩu tạm: {temp}
        </span>
      )}
      {loginLocked && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(() => clearLockAction(userId))}>
          Gỡ khóa tạm
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await resetPasswordAction(userId);
            if (r.ok) setTemp(r.value);
            else toast.error(r.error);
          })
        }
        aria-label={`Cấp mật khẩu tạm cho ${name}`}
      >
        Cấp mật khẩu tạm
      </Button>
      {status === "ACTIVE" ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline" className="text-danger" disabled={pending} aria-label={`Khóa ${name}`}>
              Khóa
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Khóa tài khoản {name}?</AlertDialogTitle>
              <AlertDialogDescription>Người dùng bị đăng xuất khỏi mọi thiết bị và không đăng nhập được cho tới khi được mở khóa. Dữ liệu vẫn được giữ.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction
                className="bg-danger hover:bg-danger/90"
                onClick={() =>
                  start(async () => {
                    const r = await setStatusAction(userId, "LOCKED");
                    if (!r.ok) toast.error(r.error);
                  })
                }
              >
                Khóa tài khoản
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await setStatusAction(userId, "ACTIVE");
              if (!r.ok) toast.error(r.error);
            })
          }
        >
          Mở khóa
        </Button>
      )}
    </div>
  );
}

export function CreateTeacherForm() {
  const [state, action] = useActionState(createTeacherAction, {} as CreateTeacherState);
  return (
    <section className="bg-surface border-border rounded-card h-fit border p-5">
      <h2 className="mb-1 text-[15px] font-bold">Tạo tài khoản giáo viên</h2>
      <p className="text-muted mb-3 text-sm">Tài khoản đã xác minh, phải đổi mật khẩu khi đăng nhập lần đầu.</p>
      {state.ok && state.tempPassword ? (
        <div role="status" className="bg-success-soft text-success rounded-control space-y-1 px-3 py-2.5 text-sm">
          <p className="font-bold">Đã tạo {state.username}</p>
          <p className="font-mono select-all">Mật khẩu tạm: {state.tempPassword}</p>
          <p className="text-xs">Chỉ hiện một lần. Gửi cho giáo viên qua kênh riêng.</p>
        </div>
      ) : (
        <form action={action} className="space-y-3" noValidate>
          <FormAlert state={state} />
          <Field label="Họ và tên" name="fullName" required error={state.fieldErrors?.fullName} />
          <Field label="Tên đăng nhập" name="username" required error={state.fieldErrors?.username} />
          <Field label="Email" name="email" type="email" required error={state.fieldErrors?.email} />
          <SubmitButton className="w-full">Tạo giáo viên</SubmitButton>
        </form>
      )}
    </section>
  );
}

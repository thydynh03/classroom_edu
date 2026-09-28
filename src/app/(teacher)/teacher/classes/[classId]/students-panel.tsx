"use client";

import * as React from "react";
import { useActionState, useTransition } from "react";
import { Copy, KeyRound, UserMinus } from "lucide-react";
import { toast } from "sonner";
import {
  addExistingStudentAction,
  bulkCreateStudentsAction,
  removeStudentAction,
  resetStudentPasswordAction,
  type BulkResult,
} from "../../actions";
import { Field, FormAlert } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
import { initials } from "@/lib/utils";

type Student = { id: string; fullName: string; username: string; mustChangePassword: boolean };

export function StudentsPanel({ classId, students }: { classId: string; students: Student[] }) {
  const [bulk, bulkAction] = useActionState(bulkCreateStudentsAction.bind(null, classId), {} as BulkResult);
  const [add, addAction] = useActionState(addExistingStudentAction.bind(null, classId), {});
  const [reset, setReset] = React.useState<{ name: string; username: string; password: string } | null>(null);
  const [pending, start] = useTransition();

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(
      () => toast.success("Đã sao chép"),
      () => toast.error("Không sao chép được, hãy chọn và sao chép thủ công"),
    );
  }

  const credentials = bulk.created?.length
    ? bulk.created.map((c) => `${c.fullName}\t${c.username}\t${c.tempPassword}`).join("\n")
    : "";

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <section className="bg-surface border-border rounded-card border p-5">
        <h2 className="mb-3 text-[15px] font-bold">Danh sách học sinh ({students.length})</h2>
        {students.length === 0 ? (
          <p className="text-muted text-sm">Chưa có học sinh. Thêm bằng danh sách họ tên hoặc gửi mã lớp ở tab Cài đặt.</p>
        ) : (
          <ul className="divide-border divide-y">
            {students.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-2.5">
                <span className="bg-primary-soft text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                  {initials(s.fullName)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{s.fullName}</p>
                  <p className="text-muted font-mono text-xs">
                    {s.username}
                    {s.mustChangePassword && <span className="text-warning ml-2 font-sans font-semibold">chưa đổi mật khẩu tạm</span>}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const r = await resetStudentPasswordAction(classId, s.id);
                      setReset({ name: s.fullName, username: s.username, password: r.tempPassword });
                    })
                  }
                  aria-label={`Cấp lại mật khẩu cho ${s.fullName}`}
                >
                  <KeyRound aria-hidden="true" />
                  <span className="hidden sm:inline">Cấp lại mật khẩu</span>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-danger" aria-label={`Xóa ${s.fullName} khỏi lớp`}>
                      <UserMinus aria-hidden="true" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Xóa {s.fullName} khỏi lớp?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Học sinh sẽ không thấy lớp này nữa. Bài đã nộp vẫn được giữ lại để bạn xem.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Hủy</AlertDialogCancel>
                      <AlertDialogAction onClick={() => start(() => removeStudentAction(classId, s.id))} className="bg-danger hover:bg-danger/90">
                        Xóa khỏi lớp
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="space-y-5">
        {reset && (
          <section role="status" className="bg-warning-soft rounded-card p-5">
            <h2 className="mb-1 text-[15px] font-bold">Mật khẩu tạm mới cho {reset.name}</h2>
            <p className="text-muted mb-3 text-sm">Chỉ hiện một lần. Học sinh phải đổi mật khẩu khi đăng nhập.</p>
            <p className="bg-surface rounded-control px-3 py-2 font-mono text-sm">
              {reset.username} · {reset.password}
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => copy(`${reset.username}\t${reset.password}`)}>
                <Copy aria-hidden="true" /> Sao chép
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setReset(null)}>
                Đóng
              </Button>
            </div>
          </section>
        )}

        <section className="bg-surface border-border rounded-card border p-5">
          <h2 className="mb-1 text-[15px] font-bold">Tạo tài khoản học sinh</h2>
          <p className="text-muted mb-3 text-sm">Mỗi dòng một họ tên. Hệ thống tạo tên đăng nhập và mật khẩu tạm.</p>
          {bulk.created?.length ? (
            <div role="status" className="space-y-3">
              <p className="bg-success-soft text-success rounded-control px-3 py-2 text-sm font-semibold">
                Đã tạo {bulk.created.length} tài khoản. Lưu danh sách này ngay: mật khẩu tạm chỉ hiện một lần.
              </p>
              <div className="border-border max-h-64 overflow-auto rounded-[14px] border">
                <table className="w-full text-sm">
                  <thead className="bg-surface-2 text-muted text-left text-xs">
                    <tr>
                      <th scope="col" className="px-3 py-2">Họ tên</th>
                      <th scope="col" className="px-3 py-2">Tên đăng nhập</th>
                      <th scope="col" className="px-3 py-2">Mật khẩu tạm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border divide-y">
                    {bulk.created.map((c) => (
                      <tr key={c.username}>
                        <td className="px-3 py-2">{c.fullName}</td>
                        <td className="px-3 py-2 font-mono">{c.username}</td>
                        <td className="px-3 py-2 font-mono">{c.tempPassword}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button size="sm" variant="outline" onClick={() => copy(credentials)}>
                <Copy aria-hidden="true" /> Sao chép cả danh sách (dán vào Excel)
              </Button>
            </div>
          ) : (
            <form action={bulkAction} className="space-y-3">
              <FormAlert state={bulk} />
              <div className="space-y-1.5">
                <Label htmlFor="names">Họ tên học sinh</Label>
                <Textarea
                  id="names"
                  name="names"
                  rows={6}
                  placeholder={"Lê Hoàng Anh\nNgô Bảo Châu\nPhạm Đức Duy"}
                  aria-invalid={bulk.fieldErrors?.names ? true : undefined}
                  aria-describedby={bulk.fieldErrors?.names ? "names-err" : undefined}
                />
                {bulk.fieldErrors?.names && (
                  <p id="names-err" className="text-danger text-xs font-medium">{bulk.fieldErrors.names}</p>
                )}
              </div>
              <SubmitButton pendingText="Đang tạo tài khoản…">Tạo tài khoản</SubmitButton>
            </form>
          )}
        </section>

        <section className="bg-surface border-border rounded-card border p-5">
          <h2 className="mb-3 text-[15px] font-bold">Thêm học sinh đã có tài khoản</h2>
          <form action={addAction} className="space-y-3">
            <FormAlert state={add} />
            <Field label="Tên đăng nhập" name="username" placeholder="lehoanganh" error={add.fieldErrors?.username} />
            <SubmitButton variant="outline">Thêm vào lớp</SubmitButton>
          </form>
        </section>
      </div>
    </div>
  );
}

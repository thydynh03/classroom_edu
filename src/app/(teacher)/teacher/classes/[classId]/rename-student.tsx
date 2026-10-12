"use client";

import * as React from "react";
import { useTransition } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { renameStudentAction } from "../../actions";

/** Sửa họ tên học sinh (gõ sai lúc tạo tài khoản). */
export function RenameStudent({ classId, studentId, fullName }: { classId: string; studentId: string; fullName: string }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(fullName);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = useTransition();
  const inputId = `rename-${studentId}`;
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setName(fullName);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`Sửa họ tên ${fullName}`}>
          <Pencil aria-hidden="true" />
          <span className="hidden sm:inline">Sửa tên</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            start(async () => {
              const r = await renameStudentAction(classId, studentId, name);
              if (r.error) return void setError(r.error);
              toast.success(r.message);
              setOpen(false);
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Sửa họ tên học sinh</DialogTitle>
            <DialogDescription>Tên đăng nhập và mật khẩu của em không đổi.</DialogDescription>
          </DialogHeader>
          <div className="my-4 space-y-1.5">
            <Label htmlFor={inputId}>Họ và tên</Label>
            <Input
              id={inputId}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              autoFocus
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${inputId}-err` : undefined}
            />
            {error && (
              <p id={`${inputId}-err`} role="alert" className="text-danger text-xs font-medium">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={pending || name.trim().length < 2}>
              Lưu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

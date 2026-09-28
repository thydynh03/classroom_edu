"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Send, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  scheduleAssignmentAction,
  unscheduleAssignmentAction,
  archiveAssignmentAction,
  deleteAssignmentAction,
  publishAssignmentAction,
  returnAllAction,
} from "../../actions";

export function PublishButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await publishAssignmentAction(id);
          if (r.error) toast.error(r.error);
          else toast.success(r.message ?? "Đã đăng");
        })
      }
    >
      <Send aria-hidden="true" /> Đăng bài
    </Button>
  );
}

export function ArchiveButton({ id, archived }: { id: string; archived: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button variant="outline" disabled={pending} onClick={() => start(() => archiveAssignmentAction(id, !archived))}>
      {archived ? <Undo2 aria-hidden="true" /> : <Archive aria-hidden="true" />}
      {archived ? "Khôi phục" : "Lưu trữ"}
    </Button>
  );
}

export function DeleteDraftButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" className="text-danger" disabled={pending}>
          <Trash2 aria-hidden="true" /> Xóa nháp
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa bài nháp này?</AlertDialogTitle>
          <AlertDialogDescription>Bài chưa đăng nên học sinh chưa thấy. Không khôi phục được sau khi xóa.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Hủy</AlertDialogCancel>
          <AlertDialogAction
            className="bg-danger hover:bg-danger/90"
            onClick={() =>
              start(async () => {
                const r = await deleteAssignmentAction(id);
                if (r?.error) toast.error(r.error);
                else router.push("/teacher/assignments");
              })
            }
          >
            Xóa
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ReturnAllButton({ id, count }: { id: string; count: number }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="soft"
      size="sm"
      disabled={pending || count === 0}
      onClick={() =>
        start(async () => {
          const r = await returnAllAction(id);
          toast.success(r.message ?? "Đã trả bài");
        })
      }
    >
      <Send aria-hidden="true" /> Trả {count} bài đã chấm
    </Button>
  );
}

export function ScheduleControl({ id, scheduledLabel, defaultValue }: { id: string; scheduledLabel?: string; defaultValue: string }) {
  const [pending, start] = useTransition();
  const [value, setValue] = useState(defaultValue);
  if (scheduledLabel)
    return (
      <div className="bg-info-soft text-info rounded-card flex flex-wrap items-center gap-3 p-4 text-sm font-semibold">
        Bài sẽ tự đăng lúc {scheduledLabel}. Học sinh chưa thấy bài cho tới lúc đó.
        <Button size="sm" variant="outline" className="ml-auto" disabled={pending} onClick={() => start(() => unscheduleAssignmentAction(id))}>
          Hủy lịch
        </Button>
      </div>
    );
  return (
    <form
      className="bg-surface border-border rounded-card flex flex-wrap items-end gap-3 border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await scheduleAssignmentAction(id, value);
          if (r.error) toast.error(r.error);
          else toast.success(r.message ?? "Đã lên lịch");
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="publishAt">Lên lịch đăng (giờ Việt Nam)</Label>
        <Input id="publishAt" type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} className="w-56" />
      </div>
      <Button type="submit" variant="outline" disabled={pending || !value}>
        Lên lịch
      </Button>
    </form>
  );
}

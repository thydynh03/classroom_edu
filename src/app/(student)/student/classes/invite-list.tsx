"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MailOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { respondInviteAction } from "../actions";

export type InviteItem = { id: string; className: string; subject: string; teacherName: string };

/** Lời mời vào lớp đang chờ: HS tự quyết định, GV không tự thêm HS vào lớp được. */
export function InviteList({ invites }: { invites: InviteItem[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  if (!invites.length) return null;
  function respond(inv: InviteItem, accept: boolean) {
    start(async () => {
      const r = await respondInviteAction(inv.id, accept);
      if (r.error) return void toast.error(r.error);
      toast.success(r.message);
      if (accept && r.classId) router.push(`/student/classes/${r.classId}`);
      else router.refresh();
    });
  }
  return (
    <section aria-labelledby="invites-title" className="bg-info-soft rounded-card mb-6 p-4">
      <h2 id="invites-title" className="text-info mb-3 flex items-center gap-2 text-[15px] font-bold">
        <MailOpen className="size-4" aria-hidden="true" /> Lời mời vào lớp ({invites.length})
      </h2>
      <ul className="space-y-2">
        {invites.map((inv) => (
          <li key={inv.id} className="bg-surface rounded-tile flex flex-wrap items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{inv.className}</p>
              <p className="text-muted truncate text-sm">
                {inv.subject} · {inv.teacherName} mời bạn
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={pending} onClick={() => respond(inv, false)}>
                Từ chối
              </Button>
              <Button size="sm" disabled={pending} onClick={() => respond(inv, true)}>
                Đồng ý
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

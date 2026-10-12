"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TimelineSearch({ initial }: { initial: string }) {
  const [u, setU] = React.useState(initial);
  const router = useRouter();
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (u.trim()) router.push(`?u=${encodeURIComponent(u.trim())}`);
      }}
    >
      <div className="min-w-48 flex-1 space-y-1.5">
        <Label htmlFor="timeline-user">Tên đăng nhập</Label>
        <Input id="timeline-user" value={u} onChange={(e) => setU(e.target.value)} maxLength={64} />
      </div>
      <Button type="submit">Xem</Button>
    </form>
  );
}

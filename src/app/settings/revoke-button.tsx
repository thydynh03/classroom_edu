"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { revokeSessionAction } from "@/app/account-actions";

export function RevokeButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={() => start(() => revokeSessionAction(id))}>
      Đăng xuất
    </Button>
  );
}

"use client";

import * as React from "react";
import { useActionState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormAlert } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cancelUpgradeAction, requestUpgradeAction } from "../actions";
import type { ActionState } from "@/lib/action";

export function RequestUpgradeDialog({ featureKey, title, comingSoon }: { featureKey: string; title: string; comingSoon: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [state, action] = useActionState(async (prev: ActionState, fd: FormData) => {
    const r = await requestUpgradeAction(prev, fd);
    if (r.ok) setOpen(false);
    return r;
  }, {});
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={comingSoon ? "outline" : "default"}>
          <Sparkles aria-hidden="true" /> {comingSoon ? "Tôi quan tâm" : "Yêu cầu mở khóa"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{comingSoon ? "Báo quan tâm" : "Yêu cầu mở khóa"}</DialogTitle>
          <DialogDescription>
            {title}.{" "}
            {comingSoon ? "Quản trị viên sẽ báo bạn khi tính năng ra mắt." : "Quản trị viên nhận yêu cầu qua email và sẽ liên hệ để hoàn tất."}
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <FormAlert state={state} />
          <input type="hidden" name="featureKey" value={featureKey} />
          {comingSoon ? (
            <input type="hidden" name="plan" value="INTEREST" />
          ) : (
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">Gói</legend>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="plan" value="MONTH" defaultChecked className="accent-primary size-4" /> Theo tháng
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="plan" value="YEAR" className="accent-primary size-4" /> Theo năm
              </label>
            </fieldset>
          )}
          <Field label="Số điện thoại / Zalo để liên hệ (không bắt buộc)" name="contact" maxLength={100} error={state.fieldErrors?.contact} />
          <div className="space-y-1.5">
            <Label htmlFor={`note-${featureKey}`}>Ghi chú (không bắt buộc)</Label>
            <Textarea id={`note-${featureKey}`} name="note" rows={3} maxLength={500} />
          </div>
          <SubmitButton pendingText="Đang gửi…">Gửi yêu cầu</SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CancelRequestButton({ featureKey }: { featureKey: string }) {
  const [pending, start] = useTransition();
  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={() => start(() => cancelUpgradeAction(featureKey))}>
      Hủy yêu cầu
    </Button>
  );
}

"use client";

import { useActionState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormAlert } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { saveBillingAction } from "../actions";

export function BillingForm({ priceText, paymentInfo }: { priceText: string; paymentInfo: string }) {
  const [state, action] = useActionState(saveBillingAction, {});
  return (
    <form action={action} className="mt-4 space-y-4">
      <FormAlert state={state} />
      <Field label="Giá" name="priceText" defaultValue={priceText} maxLength={300} placeholder="Ví dụ: 99.000đ/tháng, 990.000đ/năm cho mỗi tính năng" error={state.fieldErrors?.priceText} />
      <div className="space-y-1.5">
        <Label htmlFor="paymentInfo">Thông tin thanh toán</Label>
        <Textarea id="paymentInfo" name="paymentInfo" rows={4} maxLength={1000} defaultValue={paymentInfo} placeholder={"Ngân hàng …, STK …, chủ TK …\nNội dung: CE + tên đăng nhập"} />
      </div>
      <SubmitButton>Lưu</SubmitButton>
    </form>
  );
}

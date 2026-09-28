"use client";

import { useState, useTransition } from "react";
import { joinWithCodeAction } from "@/app/account-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function JoinByCode() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="bg-surface border-border rounded-card flex flex-wrap items-end gap-3 border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await joinWithCodeAction(code.trim());
          if (r?.error) setError(r.error);
        });
      }}
    >
      <div className="min-w-48 flex-1 space-y-1.5">
        <Label htmlFor="join-code">Tham gia lớp bằng mã</Label>
        <Input
          id="join-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Ví dụ: TOAN10A1"
          className="font-mono tracking-widest uppercase"
          maxLength={16}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "join-code-err" : undefined}
        />
        {error && <p id="join-code-err" className="text-danger text-xs font-medium">{error}</p>}
      </div>
      <Button type="submit" disabled={pending || code.trim().length < 4}>
        Vào lớp
      </Button>
    </form>
  );
}

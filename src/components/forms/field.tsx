import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function Field({
  label,
  name,
  error,
  hint,
  className,
  ...props
}: React.ComponentProps<typeof Input> & {
  label: string;
  name: string;
  error?: string;
  hint?: string;
}) {
  const id = props.id ?? `f-${name}`;
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {error ? (
        <p id={`${id}-err`} className="text-danger text-xs font-medium">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-muted text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FormAlert({
  state,
}: {
  state: { error?: string; message?: string; ok?: boolean; fieldErrors?: Record<string, string> };
}) {
  const formError = state.error ?? state.fieldErrors?._form;
  if (formError)
    return (
      <p
        role="alert"
        className="bg-danger-soft text-danger rounded-control px-3 py-2.5 text-sm font-medium"
      >
        {formError}
      </p>
    );
  if (state.ok && state.message)
    return (
      <p
        role="status"
        className="bg-success-soft text-success rounded-control px-3 py-2.5 text-sm font-medium"
      >
        {state.message}
      </p>
    );
  return null;
}

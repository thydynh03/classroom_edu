export type ActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
};

export function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = i.path.length ? String(i.path[0]) : "_form";
    out[k] ??= i.message;
  }
  return out;
}

export function formToObject(fd: FormData) {
  const o: Record<string, string> = {};
  fd.forEach((v, k) => {
    if (typeof v === "string" && !k.startsWith("$")) o[k] = v;
  });
  return o;
}

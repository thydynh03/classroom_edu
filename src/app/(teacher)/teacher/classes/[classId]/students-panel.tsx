"use client";

import * as React from "react";
import { useActionState, useTransition } from "react";
import { Copy, FileDown, FileUp, KeyRound, Search, UserMinus, X } from "lucide-react";
import { toast } from "sonner";
import {
  addExistingStudentAction,
  bulkCreateStudentsAction,
  removeStudentAction,
  resetStudentPasswordAction,
  resetStudentPasswordsAction,
  type BulkResult,
} from "../../actions";
import type { AccountRow } from "@/lib/student-accounts-xlsx";
import { Field, FormAlert } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { cn, initials } from "@/lib/utils";

export type Student = {
  id: string;
  fullName: string;
  username: string;
  status: "ACTIVE" | "LOCKED" | "DISABLED";
  mustChangePassword: boolean;
  /** Đang bị khóa tạm do nhập sai mật khẩu nhiều lần (server tính). */
  locked: boolean;
};

type Credentials = { title: string; rows: AccountRow[] };

function statusOf(s: Student) {
  if (s.status !== "ACTIVE") return { label: "Đã khóa", tone: "bg-danger-soft text-danger" };
  if (s.locked) return { label: "Tạm khóa do nhập sai", tone: "bg-danger-soft text-danger" };
  if (s.mustChangePassword) return { label: "Chưa đổi mật khẩu tạm", tone: "bg-warning-soft text-warning" };
  return { label: "Đã kích hoạt", tone: "bg-success-soft text-success" };
}

const countNames = (text: string) => text.split(/\r?\n/).filter((n) => n.trim().length >= 2).length;

export function StudentsPanel({
  classId,
  className,
  loginUrl,
  students,
}: {
  classId: string;
  className: string;
  loginUrl: string;
  students: Student[];
}) {
  const [creds, setCreds] = React.useState<Credentials | null>(null);
  const [names, setNames] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [importing, setImporting] = React.useState(false);
  const [pending, start] = useTransition();
  const credsRef = React.useRef<HTMLElement>(null);

  const [bulk, bulkAction] = useActionState(async (prev: BulkResult, fd: FormData) => {
    const r = await bulkCreateStudentsAction(classId, prev, fd);
    if (r.created?.length) {
      show({ title: `Đã tạo ${r.created.length} tài khoản`, rows: r.created });
      setNames("");
    }
    return r;
  }, {} as BulkResult);
  const [add, addAction] = useActionState(addExistingStudentAction.bind(null, classId), {});

  function show(c: Credentials) {
    setCreds(c);
    requestAnimationFrame(() => credsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(
      () => toast.success("Đã sao chép"),
      () => toast.error("Không sao chép được, hãy chọn và sao chép thủ công"),
    );
  }

  async function download(rows: AccountRow[], kind: "passwords" | "roster") {
    try {
      const { downloadAccountsXlsx } = await import("@/lib/student-accounts-xlsx");
      await downloadAccountsXlsx({ className, loginUrl, rows, kind });
    } catch {
      toast.error("Không tạo được file Excel. Hãy thử lại.");
    }
  }

  async function importFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) return void toast.error("Chỉ nhận file Excel .xlsx. File .xls hoặc .csv hãy lưu lại thành .xlsx.");
    if (file.size > 2 * 1024 * 1024) return void toast.error("File quá lớn (tối đa 2 MB).");
    setImporting(true);
    try {
      const { readNamesFromXlsx } = await import("@/lib/student-accounts-xlsx");
      const list = await readNamesFromXlsx(file);
      if (!list.length) toast.error("Không tìm thấy cột họ tên. Đặt tiêu đề cột là “Họ và tên” rồi thử lại.");
      else {
        setNames((prev) => [prev.trim(), ...list].filter(Boolean).join("\n"));
        toast.success(`Đã lấy ${list.length} họ tên từ file. Kiểm tra lại rồi bấm Tạo tài khoản.`);
      }
    } catch {
      toast.error("Không đọc được file. Hãy mở bằng Excel, lưu lại dạng .xlsx rồi thử lại.");
    } finally {
      setImporting(false);
    }
  }

  function resetMany() {
    const ids = [...selected];
    start(async () => {
      const r = await resetStudentPasswordsAction(classId, ids);
      if (!r.created.length) return void toast.error("Không cấp lại được mật khẩu. Tải lại trang rồi thử lại.");
      setSelected(new Set());
      show({ title: `Mật khẩu tạm mới cho ${r.created.length} học sinh`, rows: r.created });
    });
  }

  const q = query.trim().toLowerCase();
  const visible = q ? students.filter((s) => s.fullName.toLowerCase().includes(q) || s.username.toLowerCase().includes(q)) : students;
  const allVisibleSelected = visible.length > 0 && visible.every((s) => selected.has(s.id));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      visible.forEach((s) => (allVisibleSelected ? next.delete(s.id) : next.add(s.id)));
      return next;
    });
  const nameCount = countNames(names);

  return (
    <div className="space-y-5">
      {creds && (
        <section ref={credsRef} role="status" className="bg-surface border-primary/40 rounded-card scroll-mt-4 border-2 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold">{creds.title}</h2>
              <p className="text-muted mt-0.5 text-sm">
                Mật khẩu tạm chỉ hiện một lần. Tải file Excel để gửi cho học sinh; lần đầu đăng nhập các em sẽ tự đặt mật khẩu mới.
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setCreds(null)} aria-label="Đóng danh sách mật khẩu">
              <X aria-hidden="true" />
            </Button>
          </div>
          <div className="border-border mt-3 max-h-72 overflow-auto rounded-[14px] border">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-muted sticky top-0 text-left text-xs">
                <tr>
                  <th scope="col" className="w-10 px-3 py-2">#</th>
                  <th scope="col" className="px-3 py-2">Họ tên</th>
                  <th scope="col" className="px-3 py-2">Tên đăng nhập</th>
                  <th scope="col" className="px-3 py-2">Mật khẩu tạm</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {creds.rows.map((c, i) => (
                  <tr key={c.username}>
                    <td className="text-muted px-3 py-2 tabular-nums">{i + 1}</td>
                    <td className="px-3 py-2">{c.fullName}</td>
                    <td className="px-3 py-2 font-mono">{c.username}</td>
                    <td className="px-3 py-2 font-mono">{c.tempPassword}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => download(creds.rows, "passwords")}>
              <FileDown aria-hidden="true" /> Tải file Excel
            </Button>
            <Button
              variant="outline"
              onClick={() => copy(creds.rows.map((c) => `${c.fullName}\t${c.username}\t${c.tempPassword}`).join("\n"))}
            >
              <Copy aria-hidden="true" /> Sao chép (dán vào Excel)
            </Button>
          </div>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="bg-surface border-border rounded-card min-w-0 border p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[15px] font-bold">Danh sách học sinh ({students.length})</h2>
            {students.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => download(students.map((s) => ({ ...s, status: statusOf(s).label })), "roster")}
              >
                <FileDown aria-hidden="true" /> Xuất Excel
              </Button>
            )}
          </div>

          {students.length === 0 ? (
            <div className="border-border text-muted rounded-tile border border-dashed px-4 py-8 text-center text-sm">
              Chưa có học sinh. Dán danh sách họ tên ở khung bên cạnh để tạo tài khoản hàng loạt, hoặc gửi mã lớp ở tab Cài đặt.
            </div>
          ) : (
            <>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <div className="relative min-w-40 flex-1">
                  <Search className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden="true" />
                  <Input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Tìm theo tên hoặc tên đăng nhập"
                    aria-label="Tìm học sinh"
                    className="pl-9"
                  />
                </div>
              </div>

              <div
                className={cn(
                  "rounded-control mb-1 flex min-h-11 flex-wrap items-center gap-2 px-2 py-1.5",
                  selected.size ? "bg-primary-soft" : "bg-surface-2",
                )}
              >
                <label className="flex cursor-pointer items-center gap-2 px-1 text-sm font-semibold">
                  <input type="checkbox" className="accent-primary size-4" checked={allVisibleSelected} onChange={toggleAll} />
                  {selected.size ? `Đã chọn ${selected.size}` : "Chọn tất cả"}
                </label>
                {selected.size > 0 && (
                  <div className="ml-auto flex flex-wrap gap-1.5">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" disabled={pending}>
                          <KeyRound aria-hidden="true" /> Cấp lại mật khẩu ({selected.size})
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cấp lại mật khẩu cho {selected.size} học sinh?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Mật khẩu cũ của các em sẽ không dùng được nữa và các em bị đăng xuất khỏi mọi thiết bị. Bạn sẽ nhận danh sách
                            mật khẩu tạm mới để tải file Excel.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Hủy</AlertDialogCancel>
                          <AlertDialogAction onClick={resetMany}>Cấp lại mật khẩu</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                      Bỏ chọn
                    </Button>
                  </div>
                )}
              </div>

              {visible.length === 0 ? (
                <p className="text-muted py-6 text-center text-sm">Không có học sinh nào khớp “{query}”.</p>
              ) : (
                <ul className="divide-border divide-y">
                  {visible.map((s) => {
                    const st = statusOf(s);
                    return (
                      <li key={s.id} className="flex items-center gap-3 py-2.5">
                        <input
                          type="checkbox"
                          className="accent-primary size-4 shrink-0"
                          checked={selected.has(s.id)}
                          onChange={() => toggle(s.id)}
                          aria-label={`Chọn ${s.fullName}`}
                        />
                        <span className="bg-primary-soft text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold" aria-hidden="true">
                          {initials(s.fullName)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{s.fullName}</p>
                          <p className="text-muted flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                            <span className="font-mono">{s.username}</span>
                            <span className={cn("rounded-full px-2 py-0.5 font-semibold", st.tone)}>{st.label}</span>
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            start(async () => {
                              const r = await resetStudentPasswordAction(classId, s.id);
                              show({ title: `Mật khẩu tạm mới cho ${s.fullName}`, rows: [{ fullName: s.fullName, username: s.username, tempPassword: r.tempPassword }] });
                            })
                          }
                          aria-label={`Cấp lại mật khẩu cho ${s.fullName}`}
                        >
                          <KeyRound aria-hidden="true" />
                          <span className="hidden sm:inline">Cấp lại mật khẩu</span>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-danger" aria-label={`Xóa ${s.fullName} khỏi lớp`}>
                              <UserMinus aria-hidden="true" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Xóa {s.fullName} khỏi lớp?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Học sinh sẽ không thấy lớp này nữa. Bài đã nộp vẫn được giữ lại để bạn xem.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Hủy</AlertDialogCancel>
                              <AlertDialogAction onClick={() => start(() => removeStudentAction(classId, s.id))} className="bg-danger hover:bg-danger/90">
                                Xóa khỏi lớp
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </section>

        <div className="space-y-5">
          <section className="bg-surface border-border rounded-card border p-5" data-tour="create-students">
            <h2 className="mb-1 text-[15px] font-bold">Tạo tài khoản học sinh</h2>
            <p className="text-muted mb-3 text-sm">
              Mỗi dòng một họ tên, hoặc nhập từ file Excel danh sách lớp. Hệ thống tự tạo tên đăng nhập và mật khẩu tạm cho từng em.
            </p>
            <form action={bulkAction} className="space-y-3">
              <FormAlert state={bulk} />
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="names">Họ tên học sinh</Label>
                  <label
                    className={cn(
                      "text-primary hover:bg-primary-soft focus-within:ring-ring inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold focus-within:ring-2",
                      importing && "pointer-events-none opacity-60",
                    )}
                  >
                    <FileUp className="size-3.5" aria-hidden="true" />
                    {importing ? "Đang đọc file…" : "Nhập từ Excel"}
                    <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={importFile} />
                  </label>
                </div>
                <Textarea
                  id="names"
                  name="names"
                  rows={8}
                  value={names}
                  onChange={(e) => setNames(e.target.value)}
                  placeholder={"Lê Hoàng Anh\nNgô Bảo Châu\nPhạm Đức Duy"}
                  aria-invalid={bulk.fieldErrors?.names ? true : undefined}
                  aria-describedby={bulk.fieldErrors?.names ? "names-err" : "names-hint"}
                />
                {bulk.fieldErrors?.names ? (
                  <p id="names-err" className="text-danger text-xs font-medium">{bulk.fieldErrors.names}</p>
                ) : (
                  <p id="names-hint" className="text-muted text-xs">
                    {nameCount ? `${nameCount} học sinh` : "Tối đa 100 học sinh mỗi lần."}
                  </p>
                )}
              </div>
              <SubmitButton pendingText="Đang tạo tài khoản…">{nameCount ? `Tạo ${nameCount} tài khoản` : "Tạo tài khoản"}</SubmitButton>
            </form>
          </section>

          <section className="bg-surface border-border rounded-card border p-5">
            <h2 className="mb-3 text-[15px] font-bold">Thêm học sinh đã có tài khoản</h2>
            <form action={addAction} className="space-y-3">
              <FormAlert state={add} />
              <Field label="Tên đăng nhập" name="username" placeholder="lehoanganh" error={add.fieldErrors?.username} />
              <SubmitButton variant="outline">Thêm vào lớp</SubmitButton>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

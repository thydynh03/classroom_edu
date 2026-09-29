// Xuất / nhập file Excel cho tài khoản học sinh. Chạy hoàn toàn trên trình duyệt: mật khẩu tạm không đi qua server lần nữa.
// Gọi bằng import() động để thư viện Excel chỉ tải khi giáo viên bấm nút.
import writeXlsxFile from "write-excel-file/browser";
import { readSheet } from "read-excel-file/browser";

export type AccountRow = { fullName: string; username: string; tempPassword?: string; status?: string };

// Màu nền dòng tiêu đề trong file Excel (không phải màu giao diện web).
const HEADER_FILL = "#F3EDE4";

function slug(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function downloadAccountsXlsx(opts: { className: string; loginUrl: string; rows: AccountRow[]; kind: "passwords" | "roster" }) {
  const withPw = opts.kind === "passwords";
  const header = ["STT", "Họ và tên", "Tên đăng nhập", withPw ? "Mật khẩu tạm" : "Trạng thái"];
  const head = (value: string) => ({ value, fontWeight: "bold" as const, backgroundColor: HEADER_FILL });
  const data = [
    [{ value: `Lớp ${opts.className}`, fontWeight: "bold" as const, columnSpan: 4 }, null, null, null],
    [{ value: `Đăng nhập tại: ${opts.loginUrl}`, columnSpan: 4 }, null, null, null],
    [
      {
        value: withPw ? "Mật khẩu tạm chỉ dùng cho lần đăng nhập đầu, sau đó học sinh tự đặt mật khẩu mới." : "Danh sách không kèm mật khẩu.",
        columnSpan: 4,
      },
      null,
      null,
      null,
    ],
    [null, null, null, null],
    header.map(head),
    ...opts.rows.map((r, i) => [
      { value: i + 1 },
      { value: r.fullName },
      { value: r.username },
      { value: (withPw ? r.tempPassword : r.status) ?? "" },
    ]),
  ];
  const date = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
  await writeXlsxFile(data, {
    sheet: "Tài khoản",
    columns: [{ width: 6 }, { width: 28 }, { width: 22 }, { width: 22 }],
    stickyRowsCount: 5,
  }).toFile(`${withPw ? "tai-khoan" : "danh-sach"}-${slug(opts.className) || "lop"}-${date}.xlsx`);
}

const NAME_HEADER = /^(h[oọ]\s*(và|va)?\s*t[eê]n|t[eê]n\s*h[oọ]c\s*sinh|full\s*name|name)/i;
const LAST_HEADER = /^h[oọ](\s*(đệm|dem|lót|lot))?$/i;
const FIRST_HEADER = /^t[eê]n$/i;

/**
 * Đọc họ tên từ file Excel danh sách lớp. Nhận các kiểu hay gặp:
 * cột "Họ và tên"; hai cột "Họ (đệm)" + "Tên"; hoặc không có tiêu đề thì lấy cột chữ đầu tiên.
 */
export async function readNamesFromXlsx(file: File): Promise<string[]> {
  const rows = (await readSheet(file)).map((r) => r.map((c) => (c === null || c === undefined ? "" : String(c).trim())));
  const text = (s: string) => s.replace(/\s+/g, " ").trim();
  for (let h = 0; h < Math.min(rows.length, 10); h++) {
    const row = rows[h];
    const full = row.findIndex((c) => NAME_HEADER.test(c));
    if (full >= 0) return rows.slice(h + 1).map((r) => text(r[full] ?? "")).filter(isName);
    const last = row.findIndex((c) => LAST_HEADER.test(c));
    const first = row.findIndex((c) => FIRST_HEADER.test(c));
    if (last >= 0 && first >= 0) return rows.slice(h + 1).map((r) => text(`${r[last] ?? ""} ${r[first] ?? ""}`)).filter(isName);
  }
  const col = rows[0]?.findIndex((c) => isName(c)) ?? -1;
  return col < 0 ? [] : rows.map((r) => text(r[col] ?? "")).filter(isName);
}

function isName(s: string) {
  return s.length >= 2 && s.length <= 80 && /\p{L}/u.test(s) && !/^\d+$/.test(s);
}

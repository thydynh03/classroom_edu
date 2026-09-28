/** Quy tắc file upload (dùng chung client + server). */
export const FILE_RULES = {
  SUBMISSION: { maxBytes: 25 * 1024 * 1024, maxFiles: 10 },
  ATTACHMENT: { maxBytes: 50 * 1024 * 1024, maxFiles: 10 },
} as const;

export const ALLOWED_TYPES: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "application/msword": ["doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.ms-powerpoint": ["ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pptx"],
  "application/vnd.ms-excel": ["xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "text/plain": ["txt"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/heic": ["heic"],
  "application/zip": ["zip"],
};

export const ACCEPT_ATTR = Object.values(ALLOWED_TYPES)
  .flat()
  .map((e) => `.${e}`)
  .join(",");

export function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

export function isAllowed(name: string, mime: string) {
  const exts = ALLOWED_TYPES[mime];
  return !!exts && exts.includes(extOf(name));
}

/** Làm sạch tên file hiển thị: bỏ đường dẫn, ký tự điều khiển, giới hạn độ dài. */
export function sanitizeFilename(name: string) {
  const base = name.split(/[\\/]/).pop() ?? "file";
  const cleaned = base.replace(/[\u0000-\u001f<>:"|?*]/g, "").trim();
  return (cleaned || "file").slice(0, 150);
}

/** Kiểm tra magic bytes khớp loại file khai báo (office/zip dùng chung chữ ký PK). */
export function magicMatches(mime: string, head: Uint8Array) {
  const h = (n: number) => Array.from(head.slice(0, n));
  const eq = (sig: number[]) => sig.every((b, i) => head[i] === b);
  switch (mime) {
    case "application/pdf":
      return eq([0x25, 0x50, 0x44, 0x46]);
    case "image/png":
      return eq([0x89, 0x50, 0x4e, 0x47]);
    case "image/jpeg":
      return eq([0xff, 0xd8, 0xff]);
    case "image/webp":
      return eq([0x52, 0x49, 0x46, 0x46]) && String.fromCharCode(...h(12).slice(8)) === "WEBP";
    case "image/heic":
      return String.fromCharCode(...h(8).slice(4)) === "ftyp";
    case "application/zip":
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return eq([0x50, 0x4b, 0x03, 0x04]);
    case "application/msword":
    case "application/vnd.ms-powerpoint":
    case "application/vnd.ms-excel":
      return eq([0xd0, 0xcf, 0x11, 0xe0]);
    case "text/plain":
      return !head.includes(0);
    default:
      return false;
  }
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

/**
 * Chỉ cho chuyển hướng tới đường dẫn nội bộ.
 * Hợp lệ: "/teacher", "/join/ABC?x=1". Chặn: "//evil.com", "/\evil.com", "https://…", "javascript:…", khoảng trắng.
 */
export function isSafeRedirect(next: string): boolean {
  if (!next.startsWith("/")) return false;
  if (next.startsWith("//")) return false;
  if (next.includes("\\")) return false;
  if (/\s/.test(next)) return false;
  return true;
}

/**
 * Thời điểm hiện tại cho Server Component. Server Component chỉ render một lần mỗi request,
 * nên đọc đồng hồ ở đây là an toàn (luật react-hooks/purity nhắm tới Client Component render lại nhiều lần).
 * KHÔNG dùng trong Client Component.
 */
export function requestNow(): number {
  return Date.now();
}

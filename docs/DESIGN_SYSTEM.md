# DESIGN SYSTEM — classroom_edu

Hướng đã chốt (28/09/2026): **D · Pastel Bento làm nền**, mượn **heatmap của G** cho giáo viên, **chế độ tập trung khi chấm của E**, **dark mode theo bảng màu E**.
Tham chiếu hình: `docs/design/design-studio.html` (mở bằng trình duyệt; mục `#D`, `#E`, `#G`).

## 1. Token màu

Khai báo dưới dạng CSS variables trong `src/app/globals.css` và map vào Tailwind v4 `@theme`. Component chỉ dùng tên token.
Dark mode: class `.dark` trên `<html>` (next-themes), mặc định theo hệ thống, người dùng đổi được.

| Token             | Light (D) | Dark (E)                | Dùng cho                            |
| ----------------- | --------- | ----------------------- | ----------------------------------- |
| `--background` | `#FAF6F0` | `#14110F` | nền trang (kem) |
| `--sidebar` | `#FFFFFF` | `#110E0C` | rail / sidebar |
| `--surface` | `#FFFFFF` | `#1C1815` | card |
| `--surface-2` | `#F3EDE4` | `#26211C` | nền phụ, input nền, chip trung tính |
| `--border` | `#E9E1D5` | `#332B24` | viền |
| `--foreground` | `#1C1917` | `#F5EFE7` | chữ chính |
| `--muted` | `#6B6259` | `#A89F94` | chữ phụ |
| `--primary` | `#B93C0B` | `#FB923C` | nút chính, link, trạng thái chọn (cam đất) |
| `--primary-hover` | `#9A3412` | `#FDBA74` | hover nút chính |
| `--primary-soft` | `#FFEDD5` | `rgba(251,146,60,.14)` | nền mục đang chọn |
| `--on-primary` | `#FFFFFF` | `#1C1917` | chữ trên nút chính |
| `--progress` | `#B93C0B` | `#FB923C` | thanh tiến độ, ring |
| `--success` | `#167046` | `#58D68D` | Đã nộp đúng hạn, Đã chấm |
| `--success-soft` | `#DCF3E7` | `rgba(88,214,141,.13)` |  |
| `--warning` | `#8A5A00` | `#FACC15` | Nộp trễ, sắp hạn (chữ), tách khỏi màu cam chủ đạo |
| `--warning-soft` | `#FEF3C7` | `rgba(250,204,21,.12)` |  |
| `--late-bar` | `#F59E5B` | `#FACC15` | đoạn "trễ" trong biểu đồ |
| `--danger` | `#C0303D` | `#FF7474` | Quá hạn, lỗi, xóa |
| `--danger-soft` | `#FFE1E3` | `rgba(255,116,116,.13)` |  |
| `--info` | `#2360C4` | `#7AA2FF` | Đã trả bài |
| `--info-soft` | `#DFEBFF` | `rgba(122,162,255,.14)` |  |
| `--ring` | `#B93C0B` | `#FB923C` | focus ring 2px |
| `--scrim` | `rgb(28 25 23/.62)` | `rgb(0 0 0/.72)` | lớp phủ tối (hướng dẫn lần đầu) |

Bảng màu dùng chung cho landing, auth và app (2026-09-29, xem DECISIONS). Chữ cam trên `--surface-2` phải ≥ 4.5:1, vì vậy primary là `#B93C0B` chứ không phải `#C2410C`.

### Màu theo lớp / môn (pastel)

Mỗi lớp được gán 1 màu cố định (`class.color` ∈ sky, mint, peach, lilac, butter, rose). Dùng cho chip lớp, tile lớp, ô vuông môn học.

| Tên    | Nền light | Chữ light | Nền dark                | Chữ dark  |
| ------ | --------- | --------- | ----------------------- | --------- |
| sky    | `#DFEBFF` | `#2360C4` | `rgba(122,162,255,.14)` | `#7AA2FF` |
| mint   | `#DCF3E7` | `#1C7D50` | `rgba(63,210,192,.13)`  | `#3FD2C0` |
| peach  | `#FFE6D6` | `#B5501A` | `rgba(246,185,74,.13)`  | `#F6B94A` |
| lilac  | `#ECE5FF` | `#5F41C6` | `rgba(199,146,234,.14)` | `#C792EA` |
| butter | `#FFF1C2` | `#866100` | `rgba(255,209,102,.13)` | `#FFD166` |
| rose   | `#FFE1E3` | `#C0303D` | `rgba(255,116,116,.13)` | `#FF7474` |

Màu trạng thái luôn đi kèm chữ hoặc icon. Mọi cặp chữ/nền ≥ 4.5:1; viền input ≥ 3:1.

## 2. Typography

- Chữ chính: **Plus Jakarta Sans** (400, 500, 600, 700, 800) qua `next/font/google`, subset `latin`, `vietnamese`.
- Mono (phím tắt, mã lớp): **IBM Plex Mono** 400/500.
- Thang: 12 / 13 / 14 / 16 / 18 / 22 / 28 / 36 / 64 (số lớn trong hero card).
- Body 14px (mobile 15px), line-height 1.5. Tiêu đề 800, letter-spacing -0.02em.
- Số liệu: `tabular-nums`. Điểm hiển thị dấu phẩy thập phân: `8,5`.

## 3. Hình khối

- Bo góc: nút/input 14px, card 22px, chip 999px, tile 18px.
- Viền 1px `--border`. Bóng chỉ dùng cho nút chính (`0 6px 16px` màu primary 28%) và hero card.
- Khoảng cách: lưới 4px — 4, 8, 12, 16, 20, 24, 32. Padding card 20–22px. Gap bento 18px.
- Icon: lucide-react, stroke 1.8, cỡ 18–20.

## 4. Layout

**Giáo viên (desktop):** rail icon 80px bên trái (Tổng quan, Cần chấm có badge đếm, Lớp học, Bài tập, Thống kê; avatar dưới cùng) + top bar (tiêu đề trang, ô tìm ⌘K, chuông, nút "Tạo bài tập").
**Học sinh (mobile-first):** header chào + chuông; thanh tab nổi dạng viên thuốc ở đáy (Hôm nay, Lớp, Điểm, Thông báo).
**Breakpoint:** 640 / 768 / 1024 / 1280. Rail chuyển thành tab bar dưới 768px.

## 5. Màn hình chính (theo mockup D)

- **GV Tổng quan (bento 12 cột):** hero "Cần chấm" (primary, số 64px, avatar stack, nút "Bắt đầu chấm") · donut tỉ lệ nộp · lịch tuần có chấm hạn nộp · tiến độ từng bài (thanh 4 đoạn: đã chấm / chờ chấm / trễ / chưa nộp) · tile lớp theo màu pastel.
- **Heatmap (từ G) — trang lớp, tab "Theo dõi":** hàng = học sinh, cột = bài tập gần nhất. Ô: đã chấm = `--foreground`, đã nộp chờ chấm = `--primary`, đang làm = `--primary-soft`, nộp trễ = `--late-bar`, không nộp = `--surface-2` có sọc chéo. Có chú thích; ô có `title`/aria-label "Tên HS – Bài – Trạng thái"; bảng dùng `<table>` cho screen reader.
- **Chấm bài:** 3 cột (danh sách HS có tab Chờ chấm/Đã chấm/Chưa nộp | ảnh bài làm + chuyển trang | panel điểm). Panel điểm: ô điểm lớn, nút điểm nhanh (10, 9,5 … 5), nhận xét + ngân hàng nhận xét dạng chip, nút "Trả bài và sang bài tiếp", "Lưu nháp, chưa trả".
- **Chế độ tập trung (từ E):** bật bằng nút trên màn chấm hoặc phím `F`. Ẩn rail/top bar; thanh trên cùng: "Esc thoát", tên bài, tiến độ x/y; dải avatar học sinh ở đáy (chấm màu trạng thái). Phím: `J/K` chuyển HS, `Ctrl+Enter` trả bài và sang bài kế, `S` lưu nháp, `/` chèn nhận xét mẫu, `Esc` thoát. Phím tắt không kích hoạt khi đang gõ trong input.
- **HS Trang chủ:** chào + lịch tuần có chấm hạn · card "gấp nhất" (peach, đếm ngược giờ/phút, nút tiếp tục) · danh sách tuần này (ô vuông màu môn, chip trạng thái) · điểm mới.
- **HS Chi tiết/nộp bài:** header màu môn, chip hạn còn lại, segmented "Đề bài | Bài làm của em", tài liệu, lưới ảnh bài làm + ô "Chụp hoặc chọn", ghi chú, trạng thái tự lưu, thanh đáy cố định (hạn + nút "Nộp bài").

## 6. Trạng thái & chuyển động

- Loading: skeleton đúng hình. Empty: 1 câu giải thích + 1 hành động. Error: nói rõ lỗi + "Thử lại".
- Chip trạng thái submission: Chưa làm (surface-2/muted) · Nháp (surface-2) · Đã nộp (info-soft) · Nộp trễ (warning-soft) · Đã chấm (success-soft) · Đã trả (info-soft) · Quá hạn (danger-soft).
- Chuyển động 150–200ms ease-out: hover nâng card 1px, thanh tiến độ chạy lần đầu. Tôn trọng `prefers-reduced-motion`.

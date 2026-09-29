# LESSONS — lỗi đã gặp, đừng lặp lại

Mỗi mục: ngày · ai gặp · triệu chứng · nguyên nhân · cách tránh. Mới nhất ở trên. Ngắn gọn.

---

**2026-09-28 · Claude · storage** — Upload presigned PUT từ trình duyệt bị 400.
Nguyên nhân: AWS SDK v3 mới mặc định thêm `x-amz-checksum-crc32` vào presigned URL.
Tránh: `new S3Client({ requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED" })`.

**2026-09-28 · Claude · form** — Đăng nhập không báo lỗi gì, không chuyển trang.
Nguyên nhân: `z.strictObject` từ chối ô ẩn `next`; lỗi có path rỗng nên không hiện ở ô nào.
Tránh: khai báo đủ mọi field form gửi lên (kể cả hidden); `FormAlert` hiện lỗi `_form`.

**2026-09-28 · Claude · tailwind** — Màu lớp không hiện khi viết `bg-class-${color}-bg`.
Nguyên nhân: Tailwind chỉ quét class viết nguyên chuỗi trong source.
Tránh: dùng map tĩnh (`COLOR_CLASSES` trong `class-chip.tsx`).

**2026-09-28 · Claude · a11y** — axe báo thiếu tương phản trên tile pastel.
Nguyên nhân: chữ phụ dùng `opacity-80` trên nền pastel.
Tránh: không giảm opacity chữ trên nền màu; dùng màu token có sẵn.

**2026-09-28 · Claude · react-hooks lint** — `Date.now()` trong component bị báo impure.
Tránh: Server Component dùng `requestNow()` (`src/lib/now.ts`); Client Component tính thời gian trong effect/handler. Trạng thái trình duyệt (online, localStorage) đọc bằng `useSyncExternalStore`.

**2026-09-28 · Claude · môi trường** — Docker không bind được cổng 5432/5433; Playwright nối nhầm app khác ở cổng 3000.
Tránh: Postgres dùng 55432, E2E dùng 3200. Kiểm tra `netstat -ano | grep :PORT` trước khi chọn cổng.

**2026-09-28 · Claude · bash tool** — Lệnh bash rất dài nhiều heredoc bị lỗi parse, không file nào được tạo.
Tránh: tạo file bằng công cụ Write; bash chỉ cho lệnh ngắn.

**2026-09-28 · Claude · a11y** — axe báo `button-name` cho Select của shadcn.
Nguyên nhân: `<Label>` không có `htmlFor`, `SelectTrigger` không có `id`.
Tránh: mọi Select/Input phải có cặp `htmlFor`–`id` hoặc `aria-label`.

**2026-09-28 · Claude · điều phối** — agy headless hay hết giờ (600s) khi việc có cài đặt nặng (Playwright, DB).
Tránh: brief nhỏ hơn, việc cài đặt nặng do Claude tự chạy trước.

**2026-09-28 · Antigravity · layout-shell & html-props** — `tsc` báo lỗi TS2430 khi mở rộng `React.HTMLAttributes<HTMLElement>` với `title?: React.ReactNode`.
Nguyên nhân: `title` trong `HTMLAttributes<HTMLElement>` có kiểu `string | undefined`, không tương thích với `ReactNode`.
Tránh: Dùng `Omit<React.HTMLAttributes<HTMLElement>, "title">` khi component cho phép truyền `title` dạng JSX.

**2026-09-28 · Antigravity · theme-toggle & react-hooks** — `eslint` báo lỗi `react-hooks/set-state-in-effect` khi dùng `useEffect(() => setMounted(true), [])`.
Nguyên nhân: ESLint 9 với react-hooks không cho phép gọi setState đồng bộ trong effect để tránh cascading renders.
Tránh: Dùng `React.useSyncExternalStore(() => () => {}, () => true, () => false)` cho cờ `mounted` phía client, vừa tránh hydration mismatch vừa pass lint sạch sẽ.

**2026-09-28 · Antigravity · scaffold** — `tsc --noEmit` báo lỗi `Cannot find name 'LayoutProps'` trong `RootLayout`.
Nguyên nhân: `create-next-app` mặc định dùng generic type `LayoutProps<"/">` do Next.js sinh vào `.next/types`, nhưng file này chưa tồn tại trước khi chạy build/dev.
Tránh: Dùng kiểu chuẩn `Readonly<{ children: React.ReactNode }>` cho layout để độc lập với build artifacts.

**2026-09-28 · Claude · mockup** — Avatar mất màu nền.
Nguyên nhân: thêm `style="..."` lần hai vào cùng thẻ bằng string replace; trình duyệt chỉ nhận thuộc tính `style` đầu tiên.
Tránh: truyền style qua tham số/prop, không nối chuỗi thuộc tính HTML. Trong React dùng `className`/`style` object duy nhất.

**2026-09-28 · Claude · mockup** — Nội dung trong khung điện thoại bị bóp méo, card bị cắt.
Nguyên nhân: con của flex column mặc định `flex-shrink: 1` nên co lại khi tràn.
Tránh: danh sách cuộn dọc trong flex column → con đặt `shrink-0`, vùng cuộn dùng `overflow-y-auto` + `min-h-0`.

**2026-09-28 · Claude · mockup** — Chữ trong `<table>` sai màu/cỡ khi xem file HTML thô.
Nguyên nhân: thiếu `<!doctype html>` → quirks mode, table không kế thừa font/color.
Tránh: luôn có doctype (Next.js tự có); với HTML tĩnh thêm `table { color: inherit; font-size: inherit }`.

**2026-09-28 · Claude · mockup** — Tiếng Việt hiển thị lỗi (mojibake) khi serve qua `python -m http.server`.
Nguyên nhân: không khai báo charset.
Tránh: luôn `<meta charset="utf-8">`; font Google phải có subset `vietnamese`.

**2026-09-28 · Claude · mockup** — Nhãn trục biểu đồ SVG bị kéo giãn.
Nguyên nhân: `preserveAspectRatio="none"` kéo cả chữ.
Tránh: giữ tỉ lệ mặc định, chỉnh `viewBox` theo khung; hoặc tách text ra HTML.

**2026-09-28 · Claude · mockup** — Mô tả chỉ số dài đè lên sparkline.
Tránh: đặt sparkline ở hàng riêng hoặc giới hạn độ dài nhãn; test với chuỗi tiếng Việt dài nhất.

**2026-09-29 · Claude · animation** — Máy người dùng không thấy animation, trang "hiện cứng", máy khác thì thấy.
Nguyên nhân: Windows tắt Settings › Accessibility › Visual effects › Animation effects → trình duyệt báo `prefers-reduced-motion: reduce`; khối CSS toàn cục ép mọi animation/transition về 0.01ms `!important`, nên cả hiệu ứng mờ dần dự phòng cũng mất.
Tránh: "giảm chuyển động" nghĩa là bỏ trượt/phóng/lặp, không phải bỏ mọi chuyển tiếp. Giữ fade opacity; kiểm tra bằng Playwright `reducedMotion: "reduce"` trước khi báo xong.

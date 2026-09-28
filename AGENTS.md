# AGENTS.md — classroom_edu

Quy tắc chung cho **mọi AI agent** làm việc trong repo này (Claude, Antigravity/agy, Codex, Gemini, subagent…).
File này là nguồn quy tắc gốc. `CLAUDE.md` và `GEMINI.md` chỉ trỏ về đây và thêm phần riêng của từng tool.

## 1. Đọc gì trước khi làm (theo thứ tự, chỉ đọc phần cần)

| Khi làm…                          | Đọc                                                                                           |
| --------------------------------- | --------------------------------------------------------------------------------------------- |
| Bất kỳ task nào                   | `AGENTS.md` (file này), `docs/memory/PROGRESS.md`, `docs/memory/LESSONS.md`                   |
| Tính năng / nghiệp vụ             | `docs/PROJECT.md`                                                                             |
| Backend, DB, API, auth, file      | `docs/ARCHITECTURE.md`                                                                        |
| UI, component, màu, font          | `docs/DESIGN_SYSTEM.md` + mockup `docs/design/design-studio.html` (hướng **D**, **E**, **G**) |
| Phối hợp agent, giao việc, review | `docs/AGENT_OPS.md`                                                                           |
| Lý do một quyết định              | `docs/memory/DECISIONS.md`                                                                    |

Không đọc toàn bộ repo. Đi theo thứ tự: tree → config → entry point → module liên quan.

## 2. Nguyên tắc bắt buộc

1. **Làm đúng phạm vi task.** Không refactor, không đổi thư viện, không thêm tính năng ngoài brief. Thấy vấn đề ngoài phạm vi → ghi vào báo cáo cuối, không tự sửa.
2. **Chỉ làm MVP.** Tính năng Phase 2/3 trong `docs/PROJECT.md` chỉ được chừa chỗ trong schema, không được code.
3. **Bảo mật không được thương lượng:**
   - Mọi truy cập dữ liệu đi qua **policy layer** (`src/server/policy`). Không có ngoại lệ, kể cả khi "chỉ đọc".
   - `actor` luôn lấy từ session phía server. Không bao giờ nhận `userId`/`role` từ request body/query.
   - Tài nguyên không có quyền → trả **404**, không phải 403.
   - Không gửi `is_correct` của quiz về client học sinh trước khi được phép xem kết quả.
   - Không log mật khẩu, token, cookie, nội dung bài làm, điểm, nhận xét.
   - Không commit secret. Chỉ `.env.example` được commit.
4. **Validation bằng Zod** ở mọi biên (server action, route handler, env). Schema strict (từ chối field lạ).
5. **Thời gian:** DB lưu `timestamptz` UTC. UI hiển thị `Asia/Ho_Chi_Minh`. `submitted_at` và `is_late` do server tính.
6. **UI tiếng Việt**, code/tên biến/commit tiếng Anh.
7. **Mọi màn hình có đủ state:** loading (skeleton), empty, error, not-found/forbidden (cùng 1 màn), offline khi có form.
8. **Accessibility:** label cho mọi input, focus ring nhìn thấy được, đủ tương phản (AA), dùng thẻ semantic, `aria-live` cho toast/kết quả nộp.
9. **Không dùng màu hardcode** trong component. Chỉ dùng token trong `DESIGN_SYSTEM.md` (Tailwind theme / CSS variables).
10. **Test đi kèm code:** logic nghiệp vụ có unit test; mỗi endpoint/server action có integration test với ít nhất các actor: GV của lớp, GV khác, HS trong lớp, HS lớp khác, chưa đăng nhập.

## 3. Lệnh chuẩn

```
pnpm install
pnpm db:up            # docker compose: postgres :55432, s3 (SeaweedFS) :9000, mailpit :8025
pnpm db:reset         # xóa DB dev → migrate → seed (GV co.ha, HS tranminhkhoa…; mật khẩu = SEED_PASSWORD)
pnpm db:generate      # sinh migration sau khi sửa src/server/db/schema.ts
pnpm dev
pnpm lint && pnpm typecheck && pnpm test   # unit
pnpm test:int         # integration phân quyền (Testcontainers)
pnpm test:e2e         # Playwright (cổng 3200, cần DB đã seed)
```

Trước khi báo "xong": `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:int` phải pass; đụng UI thì chạy thêm `pnpm test:e2e`. Nếu không chạy được, nói rõ lý do và output lỗi — không báo xong giả.

## 4. Git

- Branch chính: `main`. Làm việc trên branch `feat/<milestone>-<ten-ngan>`.
- **Không commit, không push, không force** trừ khi người dùng yêu cầu rõ ràng. Để thay đổi ở working tree cho orchestrator review.
- Commit message (khi được yêu cầu): Conventional Commits tiếng Anh, ví dụ `feat(grading): add focus mode shortcuts`.

## 5. Kết thúc mỗi task — bắt buộc

1. Cập nhật `docs/memory/PROGRESS.md` (tick mục đã xong, ghi mục dở dang).
2. Nếu mắc lỗi / phát hiện bẫy / phải sửa lại → thêm một mục vào `docs/memory/LESSONS.md`.
3. Nếu đưa ra quyết định kỹ thuật mới hoặc đổi quyết định cũ → thêm vào `docs/memory/DECISIONS.md`.
4. Báo cáo ngắn: đã làm gì, file chính, lệnh verify đã chạy + kết quả, việc còn lại, rủi ro.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

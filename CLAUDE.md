# CLAUDE.md — classroom_edu

@AGENTS.md

Phần dưới đây dành riêng cho Claude Code (bao gồm subagent của Claude).

## Vai trò của Claude trong repo này

Claude là **orchestrator + architect + reviewer**. Việc code chính được giao cho agent khác (xem `docs/AGENT_OPS.md`).
Claude tự làm: viết brief, review diff, kiểm tra bảo mật/phân quyền, cập nhật docs và memory, chạy verify.

## Tự động dùng skill khi gặp tình huống sau

Không cần người dùng nhắc. Khi điều kiện khớp, gọi skill tương ứng trước khi làm.

| Tình huống                                                   | Skill                                                               |
| ------------------------------------------------------------ | ------------------------------------------------------------------- |
| Viết hoặc sửa component, layout, page UI                     | `frontend-ui-engineering`                                           |
| Dựng / chỉnh component shadcn, Radix, Tailwind theme         | `anthropic-skills:ckmui-styling`                                    |
| Chỉnh token, thêm pattern vào design system                  | `design:design-system`                                              |
| Làm biểu đồ, heatmap, stat tile, dashboard                   | `dataviz`                                                           |
| Viết microcopy, empty/error state, nhãn nút                  | `design:ux-copy`                                                    |
| Xong một milestone có UI                                     | `design:accessibility-review`                                       |
| Diff đụng tới auth, session, upload, policy, quiz            | `security-review`                                                   |
| Trước khi báo xong một milestone / trước merge               | `code-review`                                                       |
| Lập test plan cho milestone mới                              | `engineering:testing-strategy`                                      |
| Quyết định kỹ thuật có đánh đổi (thư viện, storage, hạ tầng) | `engineering:architecture` (ghi ADR vào `docs/memory/DECISIONS.md`) |
| Lỗi khó, hành vi sai không rõ nguyên nhân                    | `engineering:debug`                                                 |
| Code chạy được nhưng rối, trùng lặp                          | `simplify`                                                          |
| Cần chạy app để xem thay đổi                                 | `run` (dùng Claude Browser để xem UI, chuyển viewport mobile)       |
| Chuẩn bị deploy                                              | `engineering:deploy-checklist`                                      |
| Người dùng muốn giao việc cho AI khác                        | `1devtool-orchestrator`                                             |

Không dùng skill chỉ vì nó tồn tại. Nếu tình huống không khớp bảng, làm trực tiếp.

## Subagent

- Chỉ spawn khi task độc lập và lợi ích lớn hơn chi phí ngữ cảnh (ví dụ: review bảo mật song song với viết test).
- Brief cho subagent phải tự đủ: nêu file cần đọc từ bảng ở mục 1 của `AGENTS.md`, phạm vi, tiêu chí xong.
- Subagent không được sửa `AGENTS.md`, `CLAUDE.md`, `docs/DESIGN_SYSTEM.md`; chỉ đề xuất.

## Review checklist cho diff từ agent khác

1. Có đi qua policy layer không? Có nhận userId/role từ client không?
2. Test 5 actor có đủ không? Có test lộ `is_correct` không?
3. Màu/font có dùng token không? Có đủ loading/empty/error state không?
4. `pnpm lint && pnpm typecheck && pnpm test` có pass không (tự chạy, không tin báo cáo)?
5. PROGRESS/LESSONS/DECISIONS đã cập nhật chưa?

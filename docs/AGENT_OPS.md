# AGENT OPS — cách vận hành agents trong classroom_edu

## Đội hình

| Agent                           | Vai trò                                                                                                                               | Giao qua                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| **Claude Code** (session chính) | Orchestrator, architect, reviewer. Viết brief, review diff, verify, cập nhật docs/memory.                                             | —                               |
| **agy** (Antigravity)           | Implementer chính theo lựa chọn của người dùng (28/09/2026).                                                                          | `1devtool-agent run --to=agy`   |
| **codex**                       | Theo routing mặc định của 1DevTool: implement, test, debug, docs, browser. Chỉ dùng khi người dùng cho phép hoặc khi routing áp dụng. | `1devtool-agent run --to=codex` |
| Subagent của Claude             | Việc độc lập, ngắn: review bảo mật, viết test, audit a11y.                                                                            | Agent tool                      |

Khi người dùng gọi tên một agent, dùng đúng agent đó. Không tự đổi sang agent khác nếu agent được giao lỗi hoặc timeout: dừng lại và hỏi người dùng.

## Quy trình một milestone (Pipeline)

1. **Brief** (Claude): mục tiêu, phạm vi (in/out), file docs cần đọc, tiêu chí xong, lệnh verify. Lấy mục tiếp theo trong `docs/memory/PROGRESS.md`.
2. **Implement** (agy): đọc `AGENTS.md` + `GEMINI.md` + docs liên quan → code → chạy verify → cập nhật PROGRESS/LESSONS → báo cáo.
3. **Review** (Claude): chạy lại verify, dùng checklist trong `CLAUDE.md`, gọi `security-review` nếu đụng auth/upload/policy/quiz, `design:accessibility-review` nếu có UI.
4. **Fix loop**: lỗi → brief sửa ngắn gửi lại đúng agent đó (tối đa 2 vòng; quá 2 vòng thì báo người dùng).
5. **Chốt**: báo người dùng kết quả; chỉ commit khi người dùng đồng ý.

## Mẫu brief gửi agent

```
Repo: E:\Templates\classroom_edu
Milestone: <Mx – tên>
Đọc trước: AGENTS.md, GEMINI.md, docs/memory/PROGRESS.md, docs/memory/LESSONS.md, <docs liên quan>
Mục tiêu: …
Trong phạm vi: …
Ngoài phạm vi (không làm): …
Tiêu chí xong: …
Verify: pnpm lint && pnpm typecheck && pnpm test (+ lệnh riêng)
Báo cáo cuối: đã làm gì · file chính · output verify thật · việc còn lại · rủi ro
Không commit/push.
```

## Quy tắc chung

- Một milestone một lần giao. Không giao cả MVP trong một brief.
- Không đưa secret vào prompt gửi agent.
- Agent không được sửa `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `docs/DESIGN_SYSTEM.md`, `docs/ARCHITECTURE.md` — chỉ đề xuất trong báo cáo. Riêng `docs/memory/*` thì agent được ghi.
- Kết quả agent là dữ liệu cần kiểm tra, không phải sự thật: luôn tự chạy verify.
- Nếu agent đề xuất đổi quyết định kiến trúc → Claude đánh giá, ghi ADR, hỏi người dùng nếu ảnh hưởng lớn.

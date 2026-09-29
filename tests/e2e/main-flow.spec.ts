/**
 * Luồng chính (cần DB dev đã seed: pnpm db:reset):
 * GV đăng nhập → tạo lớp → tạo tài khoản HS → giao bài → HS đăng nhập (đổi mật khẩu tạm)
 * → xem bài → nộp → GV chấm + trả → HS thấy điểm.
 */
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PASSWORD = process.env.SEED_PASSWORD ?? "matkhau-dev-123";

async function login(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email hoặc tên đăng nhập").fill(username);
  await page.getByLabel("Mật khẩu").fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
}

async function expectNoSeriousA11y(page: Page) {
  const r = await new AxeBuilder({ page }).analyze();
  const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
}

test.describe("luồng chính giáo viên → học sinh", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "chạy một lần ở desktop");
  });

  test("giao bài, nộp bài, chấm, xem điểm", async ({ browser }) => {
    test.setTimeout(180_000);
    const stamp = Date.now().toString(36).slice(-5);
    const className = `E2E ${stamp}`;
    const studentName = `Học Sinh ${stamp}`;
    const title = `Bài E2E ${stamp}`;

    // --- Giáo viên
    const t = await (await browser.newContext()).newPage();
    await login(t, "co.ha", PASSWORD);
    await expect(t).toHaveURL(/\/teacher$/);
    await expectNoSeriousA11y(t);

    await t.goto("/teacher/classes/new");
    await t.getByLabel("Tên lớp").fill(className);
    await t.getByLabel("Môn học").fill("Toán");
    await t.getByRole("button", { name: "Tạo lớp" }).click();
    await expect(t).toHaveURL(/tab=students/);

    await t.getByLabel("Họ tên học sinh").fill(studentName);
    await t.getByRole("button", { name: /^Tạo (\d+ )?tài khoản$/ }).click();
    const row = t.getByRole("row", { name: new RegExp(studentName) });
    await expect(row).toBeVisible();
    const cells = row.getByRole("cell");
    const username = (await cells.nth(2).innerText()).trim();
    const tempPassword = (await cells.nth(3).innerText()).trim();
    expect(username).toMatch(/^hocsinh/);

    const classUrl = t.url().split("?")[0];
    await t.goto(`/teacher/assignments/new?classId=${classUrl.split("/").pop()}`);
    await t.getByLabel("Tiêu đề").fill(title);
    await t.getByLabel("Đề bài").fill("Giải phương trình x² − 5x + 6 = 0.");
    await t.getByRole("button", { name: "Đăng ngay" }).click();
    await expect(t.getByRole("heading", { name: title })).toBeVisible();

    // --- Học sinh
    const s = await (await browser.newContext()).newPage();
    await login(s, username, tempPassword);
    await expect(s).toHaveURL(/change-password/);
    await s.getByLabel("Mật khẩu hiện tại").fill(tempPassword);
    await s.getByLabel("Mật khẩu mới", { exact: true }).fill("matkhau-moi-456");
    await s.getByLabel("Nhập lại mật khẩu mới").fill("matkhau-moi-456");
    await s.getByRole("button", { name: "Lưu mật khẩu mới" }).click();
    await expect(s).toHaveURL(/\/student$/);
    // Lần đầu vào: hướng dẫn từng bước hiện ra; kiểm tra a11y cả khi đang mở, rồi bỏ qua
    const tour = s.getByRole("dialog", { name: "Chào mừng em đến Classroom Edu" });
    await expect(tour).toBeVisible();
    await expectNoSeriousA11y(s);
    await s.getByRole("button", { name: "Bắt đầu hướng dẫn" }).click();
    await expect(s.getByRole("dialog", { name: "Lịch 7 ngày" })).toBeVisible();
    await s.getByRole("button", { name: "Bỏ qua hướng dẫn" }).click();
    await expect(s.getByRole("dialog")).toHaveCount(0);
    await s.reload();
    await expect(s.getByRole("dialog")).toHaveCount(0);

    await s.getByRole("link", { name: new RegExp(title) }).first().click();
    await expect(s.getByRole("heading", { name: title })).toBeVisible();
    await s.getByLabel("Bài làm / ghi chú cho giáo viên").fill("x = 2 hoặc x = 3");
    await s.getByRole("button", { name: "Nộp bài" }).click();
    await expect(s.getByRole("button", { name: "Rút lại để sửa" })).toBeVisible();

    // HS không vào được trang giáo viên
    const forbidden = await s.request.get("/teacher");
    expect(forbidden.status()).toBe(404);

    // --- Giáo viên chấm
    await t.reload();
    await t.getByRole("link", { name: /Chấm 1 bài/ }).click();
    await expect(t.getByRole("heading", { name: studentName })).toBeVisible();
    await t.getByLabel("Điểm", { exact: true }).fill("9,5");
    await t.getByLabel("Nhận xét").fill("Đúng, trình bày gọn.");
    await t.getByRole("button", { name: /^Trả bài/ }).click();
    await expect(t.getByText("Đã trả bài.")).toBeVisible();

    // --- Học sinh xem điểm
    await s.reload();
    await expect(s.getByLabel("Kết quả")).toContainText("9,5");
    await expect(s.getByLabel("Kết quả")).toContainText("Đúng, trình bày gọn.");
  });
});

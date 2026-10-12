/** Trang mới: Nâng cao (GV), sổ điểm bị khóa, dashboard admin. Cần DB dev đã seed (pnpm db:reset). */
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PASSWORD = process.env.SEED_PASSWORD ?? "matkhau-dev-123";

async function login(page: Page, username: string) {
  await page.goto("/login");
  await page.getByLabel("Email hoặc tên đăng nhập").fill(username);
  await page.getByLabel("Mật khẩu").fill(PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
}
async function noSeriousA11y(page: Page) {
  const r = await new AxeBuilder({ page }).analyze();
  expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
}

test.describe("giáo viên: tính năng nâng cao", () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop-chrome", "chạy một lần ở desktop"));

  test("trang Nâng cao, gửi yêu cầu mở khóa; sổ điểm hiện khóa khi chưa mở", async ({ page }) => {
    await login(page, "thay.quang");
    await expect(page).toHaveURL(/\/teacher/);
    await page.goto("/teacher/upgrade");
    await expect(page.getByRole("heading", { name: "Tính năng nâng cao" })).toBeVisible();
    await noSeriousA11y(page);
    const card = page.locator("#QUIZ_ANALYTICS");
    const btn = card.getByRole("button", { name: "Yêu cầu mở khóa" });
    if (await btn.isVisible()) {
      await btn.click();
      await page.getByLabel(/Số điện thoại/).fill("0900000000");
      await page.getByRole("button", { name: "Gửi yêu cầu" }).click();
      await expect(card.getByText(/Đã gửi yêu cầu/)).toBeVisible();
    }
    await page.goto("/teacher/classes");
    await page.getByRole("link", { name: /10A1 · Vật lý/ }).first().click();
    await page.getByRole("link", { name: "Sổ điểm" }).click();
    await expect(page.getByRole("link", { name: /Xem và yêu cầu mở khóa/ })).toBeVisible();
  });
});

test.describe("quản trị: dashboard", () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop-chrome", "chạy một lần ở desktop"));

  test("Hệ thống, Hành vi, Nâng cấp hiển thị và không lỗi a11y nghiêm trọng", async ({ page }) => {
    await login(page, "admin");
    await expect(page).toHaveURL(/\/admin/);
    for (const [path, heading] of [
      ["/admin/ops", "Sức khỏe hệ thống"],
      ["/admin/activity", "Hành vi người dùng"],
      ["/admin/upgrades", "Yêu cầu nâng cấp"],
      ["/admin/settings", "Cài đặt hệ thống"],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
      await noSeriousA11y(page);
    }
  });
});

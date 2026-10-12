/** Trải nghiệm mobile của HS + trang lỗi/404 tiếng Việt + PWA (cần DB dev đã seed: pnpm db:reset). */
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PASSWORD = process.env.SEED_PASSWORD ?? "matkhau-dev-123";

test("404 tiếng Việt, có đường quay về", async ({ page }) => {
  const res = await page.goto("/trang-khong-ton-tai");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Không tìm thấy trang" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Về trang/ })).toBeVisible();
});

test("manifest PWA phục vụ được", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBe(true);
  const m = await res.json();
  expect(m.name).toBe("Classroom Edu");
  expect(m.icons.length).toBeGreaterThanOrEqual(2);
});

test.describe("học sinh trên điện thoại", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chrome", "chỉ chạy ở viewport mobile");
  });

  test("thanh tab luôn có nhãn, vùng bấm ≥ 44px, không lỗi a11y nghiêm trọng", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email hoặc tên đăng nhập").fill("tranminhkhoa");
    await page.getByLabel("Mật khẩu").fill(PASSWORD);
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page).toHaveURL(/\/student$/);
    // Tour lần đầu có thể hiện: bỏ qua
    const skip = page.getByRole("button", { name: "Bỏ qua" });
    if (await skip.isVisible().catch(() => false)) await skip.click();

    const nav = page.getByRole("navigation", { name: /điều hướng di động học sinh/ });
    for (const label of ["Hôm nay", "Lớp học", "Điểm số", "Thông báo"]) {
      const link = nav.getByRole("link", { name: new RegExp(label) });
      await expect(link).toContainText(label);
      const box = await link.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    await nav.getByRole("link", { name: /Lớp học/ }).click();
    await expect(page).toHaveURL(/\/student\/classes$/);
    const r = await new AxeBuilder({ page }).analyze();
    const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(bad.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
  });
});

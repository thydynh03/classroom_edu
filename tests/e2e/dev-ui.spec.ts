import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Design System Catalog (/dev/ui)", () => {
  test("loads page without console errors, displays title, and supports theme toggle", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
    page.on("pageerror", (err) => {
      consoleErrors.push(err.message);
    });

    await page.goto("/dev/ui");

    // Check catalog title is visible
    const title = page.getByText("Design System Catalog");
    await expect(title).toBeVisible();

    // Verify theme toggle button
    const themeButton = page.getByRole("button", { name: "Đổi giao diện" });
    await expect(themeButton).toBeVisible();

    // Toggle to dark theme
    await themeButton.click();
    await page.getByRole("menuitem", { name: "Tối" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    // Toggle to light theme
    await themeButton.click();
    await page.getByRole("menuitem", { name: "Sáng" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    // Check accessibility with axe-core (serious/critical violations)
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include("main")
      .analyze();

    const seriousOrCritical = accessibilityScanResults.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );
    expect(seriousOrCritical).toEqual([]);

    // Assert zero console errors
    expect(consoleErrors).toEqual([]);
  });
});

test.describe("Trang cần đăng nhập", () => {
  for (const path of ["/teacher", "/student", "/settings"]) {
    test(`${path} chuyển về /login khi chưa đăng nhập`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("pageerror", (err) => consoleErrors.push(err.message));
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
      await expect(page.getByRole("heading", { name: "Đăng nhập" })).toBeVisible();
      expect(consoleErrors).toEqual([]);
    });
  }
});

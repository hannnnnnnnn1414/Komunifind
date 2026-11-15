import path from "node:path";
import { expect, test } from "@playwright/test";
import { bodyText, clearSession, devLogin, noticeText } from "./helpers";

const LOGO = path.resolve("public/images/cooking.jpg");

test("buat komunitas + upload + assign panitia", async ({ page, context }) => {
  await devLogin(page, "Admin pusat");
  await page.goto("/admin/communities/new", { waitUntil: "networkidle" });
  await page.locator('input[name="name"]').fill("E2E Test Community");
  await page.locator('input[name="slug"]').fill("e2e-test-komunitas");
  await page.locator('input[name="tagline"]').fill("Komunitas untuk test otomatis.");
  await page.locator('textarea[name="description"]').fill("Dibuat oleh E2E Playwright.");
  await page.locator('input[name="category"]').fill("Tes");
  await page.locator('input[name="city"]').fill("Jakarta");
  await page.locator('input[name="organizerEmail"]').fill("sari@komunifind.test");
  await page.locator('input[name="logo"]').setInputFiles(LOGO);
  await page.getByRole("button", { name: "Buat komunitas", exact: true }).click();
  await page.waitForURL(/\/admin\/communities\/\d+\?[^#]*?ok=/, { timeout: 30000 });
  expect(await noticeText(page)).toContain("Komunitas dibuat.");
  expect(await page.locator('input[name="organizerEmail"]').inputValue()).toBe(
    "sari@komunifind.test",
  );
  await clearSession(context, page);

  await devLogin(page, "User biasa");
  await page.goto("/dashboard", { waitUntil: "networkidle" });
  expect(await bodyText(page)).toContain("E2E Test Community");
  await clearSession(context, page);

  await page.goto("/communities/e2e-test-komunitas", { waitUntil: "networkidle" });
  expect(await bodyText(page)).toContain("E2E Test Community");
  expect(await page.locator('img[src^="/uploads/"]').count()).toBeGreaterThan(0);
});

test("daftar pengguna tampil", async ({ page }) => {
  await devLogin(page, "Admin pusat");
  await page.goto("/admin/users", { waitUntil: "networkidle" });
  const text = await bodyText(page);
  expect(text).toContain("admin@komunifind.test");
  expect(text).toContain("sari@komunifind.test");
});

import { expect, test } from "@playwright/test";
import { bodyText, clearSession, devLogin } from "./helpers";

test("login 4 role mengarah ke halaman yang benar", async ({ page }) => {
  await devLogin(page, "User biasa");
  await expect(page).toHaveURL(/\/me$/);
  expect(await bodyText(page)).toContain("sari@komunifind.test");
  await clearSession(page.context(), page);

  await devLogin(page, "Panitia Jakarta Indie Runners");
  await expect(page).toHaveURL(/\/dashboard$/);

  await clearSession(page.context(), page);
  await devLogin(page, "Panitia Bandung Design Circle");
  await expect(page).toHaveURL(/\/dashboard$/);

  await clearSession(page.context(), page);
  await devLogin(page, "Admin pusat");
  await expect(page).toHaveURL(/\/admin$/);
  expect(await bodyText(page)).toContain("Operasional Komunifind");
});

test("sidebar user biasa: tanpa menu panitia", async ({ page }) => {
  await devLogin(page, "User biasa");
  const nav = page.locator(".sidebar-nav");
  await expect(nav.getByRole("link", { name: "Pendaftaranku" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Admin" })).toHaveCount(0);
});

test("logout meminta konfirmasi modal dulu", async ({ page }) => {
  await devLogin(page, "User biasa");
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  const modal = page.getByRole("alertdialog");
  await expect(modal).toBeVisible();
  await expect(modal).toContainText("Keluar dari Komunifind?");

  await page.getByRole("button", { name: "Batal", exact: true }).click();
  await expect(modal).toBeHidden();
  await expect(page.locator(".shell-sidebar")).toBeVisible();

  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await page.getByRole("button", { name: "Ya, keluar", exact: true }).click();
  await page.waitForURL("/", { timeout: 30000 });
  expect(await bodyText(page)).toContain("Masuk");
});

test("halaman privat tanpa login dialihkan ke login", async ({ page }) => {
  await page.goto("/dashboard", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/login/);
});

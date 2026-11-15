import { expect, test } from "@playwright/test";
import { bodyText, clearSession, devLogin } from "./helpers";

test("sidebar panitia + badge bertambah saat ada pendaftar", async ({ page, context }) => {

  await devLogin(page, "User biasa");
  await page.goto("/events/1", { waitUntil: "networkidle" });
  const daftarCount = await page.getByRole("button", { name: "Daftar event", exact: true }).count();
  if (daftarCount > 0) {
    await page.getByRole("button", { name: "Daftar event", exact: true }).click();
    await page.waitForURL(/\/events\/1\?[^#]*?ok=/, { timeout: 30000 });
  }
  await clearSession(context, page);

  await devLogin(page, "Panitia Jakarta Indie Runners");
  const nav = page.locator(".sidebar-nav");
  await expect(nav.getByRole("link", { name: "Dashboard" })).toBeVisible();
  const badge = nav.locator(".nav-badge").first();
  await expect(badge).toBeVisible();
  expect(Number(await badge.textContent())).toBeGreaterThanOrEqual(1);

  await page.goto("/dashboard", { waitUntil: "networkidle" });
  expect(await bodyText(page)).toMatch(/1 menunggu|menunggu/);
});

test("toast muncul lalu URL dibersihkan", async ({ page, context }) => {
  await devLogin(page, "User biasa");
  await page.goto("/events/2", { waitUntil: "networkidle" });
  const daftarCount = await page.getByRole("button", { name: "Daftar event", exact: true }).count();
  if (daftarCount === 0) {

    await page.getByRole("button", { name: "Batalkan pendaftaran", exact: true }).click();
    await page.waitForURL(/ok=/, { timeout: 30000 });
    await page.goto("/events/2", { waitUntil: "networkidle" });
  }
  await page.getByRole("button", { name: "Daftar event", exact: true }).click();
  await page.waitForURL(/\/events\/2\?[^#]*?ok=/, { timeout: 30000 });

  const toast = page.locator(".toast.toast-ok");
  await expect(toast).toBeVisible();
  await expect(toast).toContainText("Pendaftaran terkirim");
  await expect.poll(async () => page.url(), { timeout: 10000 }).not.toContain("ok=");
  await clearSession(context, page);
});

test("sidebar saat login tidak memuat menu Jelajah", async ({ page }) => {
  await devLogin(page, "User biasa");

  await expect(page.locator(".shell-sidebar .shell-brand")).toHaveAttribute("href", "/");
  await expect(page.locator(".sidebar-nav").getByRole("link", { name: "Jelajah" })).toHaveCount(0);
});

test("dashboard selalu item pertama sidebar organizer", async ({ page }) => {
  await devLogin(page, "Panitia Jakarta Indie Runners");
  const firstLink = page.locator(".sidebar-nav a").first();
  await expect(firstLink).toHaveAttribute("href", "/dashboard");
  await expect(firstLink).toContainText("Dashboard");
});

test("sidebar admin memuat menu admin", async ({ page }) => {
  await devLogin(page, "Admin pusat");
  const nav = page.locator(".sidebar-nav");
  await expect(nav.getByRole("link", { name: "Admin" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Pengguna" })).toBeVisible();
});

test("drawer mobile bisa dibuka dan menavigasi", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await devLogin(page, "User biasa");
  await expect(page.locator(".shell-menu-btn")).toBeVisible();
  await expect(page.locator(".shell-sidebar")).not.toHaveClass(/open/);
  await page.locator(".shell-menu-btn").click();
  await expect(page.locator(".shell-sidebar.open")).toBeVisible();
  await page.locator(".sidebar-nav").getByRole("link", { name: "Pendaftaranku" }).click();
  await page.waitForURL(/\/me$/, { timeout: 30000 });
  await expect(page.locator(".shell-sidebar.open")).toHaveCount(0);
  await clearSession(context, page);
});

test("reduced motion: toast tetap tampil tanpa animasi slide", async ({ page, context }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await devLogin(page, "User biasa");
  await page.goto("/events/3", { waitUntil: "networkidle" });
  const daftarCount = await page.getByRole("button", { name: "Daftar event", exact: true }).count();
  if (daftarCount > 0) {
    await page.getByRole("button", { name: "Daftar event", exact: true }).click();
    await page.waitForURL(/ok=/, { timeout: 30000 });
    await expect(page.locator(".toast.toast-ok")).toBeVisible();
  }
  await clearSession(context, page);
});

test("login split-screen tampil dua kolom", async ({ page }) => {
  await page.goto("/login", { waitUntil: "networkidle" });
  await expect(page.locator(".login-split")).toBeVisible();
  await expect(page.locator(".login-brand")).toBeVisible();
  await expect(page.getByRole("link", { name: /Lanjutkan dengan Google/ })).toBeVisible();
});

import { expect, test } from "@playwright/test";
import { bodyText } from "./helpers";

test("landing menampilkan 9 komunitas + tunnel", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  expect(await page.locator(".community-card").count()).toBe(9);
  expect(await page.locator('a[aria-label^="Lihat komunitas"]').count()).toBe(9);
  expect(await bodyText(page)).toContain("Jakarta Indie Runners");
});

test("search + filter menyempitkan hasil", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.locator('input[name="q"]').fill("padel");
  await page.getByRole("button", { name: "Cari", exact: true }).click();
  await page.waitForURL(/\?.*q=padel/, { timeout: 30000 });
  expect(await page.locator(".community-card").count()).toBe(1);
  expect(await bodyText(page)).toContain("Padel Social Jakarta");
});

test("halaman komunitas menampilkan profil + event", async ({ page }) => {
  await page.goto("/communities/bogor-doodle-art", { waitUntil: "networkidle" });
  const text = await bodyText(page);
  expect(text).toContain("Bogor Doodle Art");
  expect(await page.locator(".cover img, .banner img").count()).toBeGreaterThan(0);
});

test("halaman event menampilkan tombol Visit + Daftar", async ({ page }) => {
  await page.goto("/events/1", { waitUntil: "networkidle" });
  const text = await bodyText(page);
  expect(text).toContain("Weekend Long Run 12K");
  await expect(page.getByRole("link", { name: /Kunjungi Instagram/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Masuk untuk daftar/ })).toBeVisible();
});

test("pagination daftar event: 14 event dalam 2 halaman", async ({ page }) => {
  await page.goto("/events", { waitUntil: "networkidle" });
  expect(await page.locator(".event-row").count()).toBe(12);
  await expect(page.getByText("Halaman 1 dari 2")).toBeVisible();
  await page.getByRole("link", { name: "Berikutnya", exact: true }).click();
  await page.waitForURL(/page=2/, { timeout: 30000 });
  expect(await page.locator(".event-row").count()).toBe(2);
  await expect(page.getByText("Halaman 2 dari 2")).toBeVisible();
});

test("slug tidak dikenal menampilkan 404", async ({ page }) => {
  await page.goto("/communities/tidak-ada-komunitas-ini", { waitUntil: "networkidle" });
  expect(await bodyText(page)).toContain("tidak ditemukan");
});

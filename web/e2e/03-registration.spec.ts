import { expect, test } from "@playwright/test";
import { bodyText, clearSession, devLogin, noticeText } from "./helpers";

test("loop penuh: daftar -> approve -> batal", async ({ page, context }) => {
  await devLogin(page, "User biasa");

  await page.goto("/events/1", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Daftar event", exact: true }).click();
  await page.waitForURL(/\/events\/1\?[^#]*?ok=/, { timeout: 30000 });
  let text = await noticeText(page);
  expect(text).toContain("Pendaftaran terkirim");
  expect(text).toContain("Menunggu persetujuan");

  await page.goto("/events/1", { waitUntil: "networkidle" });
  expect(await page.getByRole("button", { name: "Daftar event", exact: true }).count()).toBe(0);
  await clearSession(context, page);

  await devLogin(page, "Panitia Jakarta Indie Runners");
  await page.goto("/dashboard/events/1", { waitUntil: "networkidle" });
  expect(await bodyText(page)).toContain("sari@komunifind.test");
  await page.getByRole("button", { name: "Setujui", exact: true }).first().click();
  await page.waitForURL(/ok=/, { timeout: 30000 });
  expect(await noticeText(page)).toContain("Peserta disetujui.");
  await clearSession(context, page);

  await devLogin(page, "User biasa");
  await page.goto("/me", { waitUntil: "networkidle" });
  expect(await bodyText(page)).toContain("Disetujui");
  await page.getByRole("button", { name: "Batalkan", exact: true }).first().click();
  await page.waitForURL(/\/me\?[^#]*?ok=/, { timeout: 30000 });
  expect(await noticeText(page)).toContain("Pendaftaran dibatalkan.");
});

test("panitia komunitas lain ditolak (tenant isolation)", async ({ page }) => {
  await devLogin(page, "Panitia Bandung Design Circle");
  const resp = await page.goto("/dashboard/events/1", { waitUntil: "domcontentloaded" });
  expect(resp?.status()).toBe(404);
  expect(await bodyText(page)).toContain("tidak ditemukan");
});

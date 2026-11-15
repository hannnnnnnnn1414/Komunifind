import path from "node:path";
import { expect, test } from "@playwright/test";
import { bodyText, clearSession, devLogin, noticeText } from "./helpers";

const POSTER = path.resolve("public/images/expo.jpg");

test("dashboard menampilkan ringkasan + event milik sendiri", async ({ page }) => {
  await devLogin(page, "Panitia Jakarta Indie Runners");
  await page.goto("/dashboard", { waitUntil: "networkidle" });
  const text = await bodyText(page);
  expect(text).toContain("Jakarta Indie Runners");
  expect(text).toContain("Weekend Long Run 12K");
});

test("antrian kerja: sapaan + pending mengarah ke kelola", async ({ page, context }) => {

  const sariCtx = await page.context().browser()?.newContext();
  if (!sariCtx) throw new Error("gagal membuat context");
  const sariPage = await sariCtx.newPage();
  await sariPage.goto("/login", { waitUntil: "networkidle" });
  await sariPage.getByRole("button", { name: "Masuk sebagai User biasa", exact: true }).click();
  await sariPage.waitForURL(/\/(me|dashboard|admin)/, { timeout: 30000 });
  await sariPage.goto("/events/2", { waitUntil: "networkidle" });
  await sariPage.getByRole("button", { name: "Daftar event", exact: true }).click();
  await sariPage.waitForURL(/\/events\/2\?[^#]*?ok=/, { timeout: 30000 });

  await devLogin(page, "Panitia Jakarta Indie Runners");
  await page.goto("/dashboard", { waitUntil: "networkidle" });
  const text = await bodyText(page);
  expect(text).toContain("Halo, rina.");
  expect(text).toContain("Perlu tindakan");
  expect(await page.locator(".stat-grid").count()).toBe(0);

  const actionItem = page.locator(".action-item", { hasText: "menunggu persetujuan" }).first();
  await expect(actionItem).toBeVisible();
  expect(await actionItem.getAttribute("href")).toMatch(/\/dashboard\/events\/2$/);

  await sariPage.goto("/me", { waitUntil: "networkidle" });
  await sariPage.getByRole("button", { name: "Batalkan", exact: true }).first().click();
  await sariPage.waitForURL(/\/me\?[^#]*?ok=/, { timeout: 30000 });
  await sariCtx.close();
});

test("buat event dengan poster + langsung terbit", async ({ page }) => {
  await devLogin(page, "Panitia Jakarta Indie Runners");
  await page.goto("/dashboard/events/new", { waitUntil: "networkidle" });
  await page.locator('input[name="title"]').fill("E2E Organizer Event");
  await page.locator('textarea[name="description"]').fill("Event dari E2E organizer.");
  await page.locator('input[name="startsAt"]').fill("2030-01-10T10:00");
  await page.locator('input[name="locationName"]').fill("GBK Senayan, Jakarta");
  await page.locator('input[name="capacity"]').fill("10");
  await page.locator('input[name="poster"]').setInputFiles(POSTER);
  await page.locator('input[name="publishNow"]').check();
  await page.getByRole("button", { name: "Simpan event", exact: true }).click();
  await page.waitForURL(/\/dashboard\/events\/\d+\?[^#]*?ok=/, { timeout: 30000 });
  expect(await noticeText(page)).toContain("Event dibuat.");

  const publicPage = await page.context().newPage();
  await publicPage.goto("/events?page=2", { waitUntil: "networkidle" });
  expect(await bodyText(publicPage)).toContain("E2E Organizer Event");
  await publicPage.close();
});

test("edit profil komunitas tampil publik", async ({ page, context }) => {
  await devLogin(page, "Panitia Jakarta Indie Runners");
  await page.goto("/dashboard/community", { waitUntil: "networkidle" });
  await page.locator('input[name="tagline"]').fill("Tagline E2E.");
  await page.getByRole("button", { name: "Simpan perubahan", exact: true }).click();
  await page.waitForURL(/ok=/, { timeout: 30000 });
  expect(await noticeText(page)).toContain("Profil komunitas tersimpan.");
  await clearSession(context, page);

  await page.goto("/communities/jakarta-indie-runners", { waitUntil: "networkidle" });
  expect(await bodyText(page)).toContain("Tagline E2E.");
});

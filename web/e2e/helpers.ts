import type { BrowserContext, Page } from "@playwright/test";

export async function devLogin(page: Page, label: string): Promise<void> {
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: `Masuk sebagai ${label}`, exact: true }).click();
  await page.waitForURL(/\/(me|dashboard|admin)/, { timeout: 30000 });
}

export async function clearSession(context: BrowserContext, page: Page): Promise<void> {
  await context.clearCookies();
  await page.goto("/", { waitUntil: "networkidle" });
}

export async function noticeText(page: Page): Promise<string> {
  await page.locator(".toast").first().waitFor({ timeout: 30000 });
  return (await page.textContent("body")) ?? "";
}

export async function bodyText(page: Page): Promise<string> {
  return (await page.textContent("body")) ?? "";
}

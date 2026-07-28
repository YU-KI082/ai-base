import { test, expect } from "@playwright/test";

test.describe("public smoke", () => {
  test("home page renders brand", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "AI BASE" })).toBeVisible();
  });

  test("tools list is publicly reachable", async ({ page }) => {
    await page.goto("/tools");
    await expect(page.getByRole("heading", { name: /AI tools|AIツール/ })).toBeVisible();
  });

  test("search page renders", async ({ page }) => {
    await page.goto("/search");
    await expect(page.getByRole("heading", { name: /Search|検索/ })).toBeVisible();
  });

  test("compare page renders", async ({ page }) => {
    await page.goto("/compare");
    await expect(page.getByRole("heading", { name: /Compare|比較/ })).toBeVisible();
  });

  test("categories page renders", async ({ page }) => {
    await page.goto("/categories");
    await expect(page.getByRole("heading", { name: /Categories|カテゴリ/ })).toBeVisible();
  });

  test("robots and sitemap respond", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBeTruthy();
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBeTruthy();
  });

  test("health endpoint is liveness-only by default", async ({ request }) => {
    const res = await request.get("/api/v1/agents/health");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.agents).toBeUndefined();
  });
});

import { test, expect } from "@playwright/test";
test("local setup is explicit and public page exposes no sample owners", async ({ page }) => {
  await page.goto("/demo/public");
  await expect(
    page.getByRole("heading", { name: "Your next project. Already on someone’s shelf." }),
  ).toBeVisible();
  await expect(page.getByText("Sample tools", { exact: false })).toBeVisible();
  await expect(page.getByText("Sam Rivera")).toHaveCount(0);
});
test("browse, filter, create, edit and remove a listing", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.locator(".tool-card")).toHaveCount(6);
  await page.getByRole("button", { name: "Garden", exact: true }).click();
  await expect(page.locator(".tool-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Lend a tool", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tool name").fill("Workshop hammer");
  await dialog.getByLabel("Category").selectOption("Hand tools");
  await dialog
    .getByLabel("A little about the tool")
    .fill("A comfortable claw hammer for small repairs.");
  await dialog.getByRole("button", { name: "Add to the shelf" }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "My listings", exact: true }).click();
  const card = page.locator(".tool-card").filter({ hasText: "Workshop hammer" });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Edit listing" }).click();
  await dialog.getByLabel("Tool name").fill("Claw hammer");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  const edited = page.locator(".tool-card").filter({ hasText: "Claw hammer" });
  await edited.getByRole("button", { name: "Remove Claw hammer" }).click();
  await dialog.getByRole("button", { name: "Remove listing", exact: true }).click();
  await expect(edited).toHaveCount(0);
});
test("request, approve and return a loan across demo personas", async ({ page }) => {
  await page.goto("/demo");
  await page
    .locator(".tool-card")
    .filter({ hasText: "Stand mixer" })
    .getByRole("button", { name: "Request to borrow" })
    .click();
  const today = new Date().toISOString().slice(0, 10);
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Pick up").fill(today);
  await dialog.getByLabel("Return by").fill(today);
  await dialog.getByRole("button", { name: "Send request" }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByLabel("Demo persona").selectOption("alex");
  await page.getByRole("button", { name: "Incoming requests", exact: false }).click();
  const incoming = page.locator(".loan-card").filter({ hasText: "Stand mixer" });
  await incoming.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(incoming.locator(".status")).toHaveText("approved");
  await page.getByLabel("Demo persona").selectOption("sam");
  await page.getByRole("button", { name: "My requests", exact: true }).click();
  const outgoing = page.locator(".loan-card").filter({ hasText: "Stand mixer" });
  await outgoing.getByRole("button", { name: "Mark returned" }).click();
  await expect(outgoing.locator(".status")).toHaveText("returned");
});
test("admin controls are visible only in the admin demo persona", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("button", { name: "Admin", exact: true })).toHaveCount(0);
  await page.getByLabel("Demo persona").selectOption("morgan");
  await page.getByRole("button", { name: "Admin", exact: true }).click();
  const alex = page.locator(".person-row").filter({ hasText: "Alex Chen" });
  await alex.getByRole("button", { name: "Mark trusted" }).click();
  await expect(alex.getByRole("button", { name: "Remove badge" })).toBeVisible();
  await expect(page.getByText("No failed deliveries.")).toBeVisible();
});
test("mobile layout fits and dialogs close with Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Lend a tool", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
});
test("desktop preview has no browser errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto("/demo");
  await expect(page.locator(".tool-card")).toHaveCount(6);
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
  expect(errors).toEqual([]);
  await page.goto("/demo/public");
  await page.screenshot({ path: "test-results/home.png", fullPage: true });
});

test("public catalog combines category and search filters", async ({ page }) => {
  await page.goto("/demo/public");
  await page.getByRole("button", { name: "Kitchen", exact: true }).click();
  await expect(page.locator(".public-tool")).toHaveCount(1);
  await page.getByLabel("Search public tools").fill("not-in-catalog");
  await expect(page.getByRole("heading", { name: "No matching tools" })).toBeVisible();
  await page.getByLabel("Search public tools").fill("mixer");
  await expect(page.locator(".public-tool")).toHaveCount(1);
});
test("public catalog fits a narrow mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/demo/public");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole("link", { name: "Explore the tools" })).toBeVisible();
});

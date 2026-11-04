import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const destination = "docs/portfolio/capturas";
await mkdir(destination, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
try {
  await page.goto("http://localhost:3100/demo/public");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: destination + "/01-catalogo.png", fullPage: true });
  await page.goto("http://localhost:3100/demo");
  await page.locator(".tool-card").first().waitFor();
  await page.screenshot({ path: destination + "/02-workspace.png", fullPage: true });
  await page
    .locator(".tool-card")
    .filter({ hasText: "Stand mixer" })
    .getByRole("button", { name: "Request to borrow" })
    .click();
  await page.getByRole("dialog").waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: destination + "/03-solicitud.png" });
  await page.keyboard.press("Escape");
  await page.getByLabel("Demo persona").selectOption("morgan");
  await page.getByRole("button", { name: "Admin", exact: true }).click();
  await page.screenshot({ path: destination + "/04-administracion.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:3100/demo");
  await page.locator(".tool-card").first().waitFor();
  await page.screenshot({ path: destination + "/05-movil.png", fullPage: true });
  console.log("Five demo screenshots saved to " + destination);
} finally {
  await browser.close();
}

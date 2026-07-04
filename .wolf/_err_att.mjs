import pw from "/Users/xontel/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core/index.js";
const { chromium } = pw;
const URL = "http://localhost:8080/";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(20000);
const errors = [];
page.on("pageerror", (e) => errors.push("PAGEERR: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("CONSOLE: " + m.text().slice(0, 300)); });
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
const lb = await page.$(".lnd-login-btn"); if (lb) { await lb.click(); await page.waitForTimeout(500); }
await page.click("button.login-dev-btn:has-text('معلم')");
await page.waitForTimeout(250);
await page.click("button.login-submit");
await page.waitForSelector(".sidebar", { timeout: 20000 });
await page.waitForTimeout(1200);
await page.evaluate(() => { window.location.hash = "attendance"; });
await page.waitForTimeout(3000);
console.log("=== errors ===");
console.log(errors.join("\n") || "(none)");
console.log("=== content len ===");
const len = await page.evaluate(() => (document.querySelector(".content")?.textContent || "").length);
console.log("len:", len);
await browser.close();

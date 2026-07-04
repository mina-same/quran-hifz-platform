import pw from "/Users/xontel/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core/index.js";
const { chromium } = pw;
const URL = "http://localhost:8080/";
const OUT =
  "/Users/xontel/Downloads/mina work/quran-hifz-platform/.wolf/designqc-captures";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
});
const page = await ctx.newPage();
page.setDefaultTimeout(20000);
const errors = [];
page.on("pageerror", (e) => errors.push("PAGEERR: " + e.message));
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
const lb = await page.$(".lnd-login-btn");
if (lb) {
  await lb.click();
  await page.waitForTimeout(500);
}
await page.click("button.login-dev-btn:has-text('معلم')");
await page.waitForTimeout(250);
await page.click("button.login-submit");
await page.waitForSelector(".sidebar", { timeout: 20000 });
await page.waitForTimeout(1200);
await page.evaluate(() => {
  window.location.hash = "attendance";
});
await page.waitForTimeout(2000);

// Click the first context's action button to enter the roster+slider view
const enterBtn = await page.$("button:has-text('أخذ الحضور والتقييم')");
if (enterBtn) {
  await enterBtn.click();
  await page.waitForTimeout(2500);
}
const dump = await page.evaluate(() => ({
  slider: !!document.querySelector(".day-slider"),
  dayChips: document.querySelectorAll(".day-chip").length,
  enabledChips: document.querySelectorAll(".day-chip:not(:disabled)").length,
  disabledChips: document.querySelectorAll(".day-chip:disabled").length,
  activeChip:
    document
      .querySelector(".day-chip.active")
      ?.textContent?.replace(/\s+/g, " ")
      .trim() || "",
  rosterRows: document.querySelectorAll(".att-row").length,
  alerts: Array.from(document.querySelectorAll(".alert")).map((a) =>
    a.textContent.trim().slice(0, 140),
  ),
  backBtn: !!Array.from(document.querySelectorAll("button")).find((b) =>
    (b.textContent || "").includes("الحلقات والمسارات"),
  ),
}));
console.log(JSON.stringify(dump, null, 2));
console.log("errors:", errors.join("; ") || "(none)");

await page.screenshot({
  path: `${OUT}/attendance-slider.jpg`,
  type: "jpeg",
  quality: 72,
  fullPage: true,
});
console.log("shot: attendance-slider");

// Test the back button
if (dump.backBtn) {
  await page.click("button:has-text('الحلقات والمسارات')");
  await page.waitForTimeout(1200);
  const afterBack = await page.evaluate(() => ({
    pickerShown: (
      document.querySelector(".content")?.textContent || ""
    ).includes("اختر الحلقة"),
    slider: !!document.querySelector(".day-slider"),
  }));
  console.log("after back:", JSON.stringify(afterBack));
}

// Mobile view
await page.setViewportSize({ width: 390, height: 880 });
await page.waitForTimeout(600);
await page.screenshot({
  path: `${OUT}/attendance-mobile-picker.jpg`,
  type: "jpeg",
  quality: 72,
  fullPage: true,
});
console.log("shot: attendance-mobile-picker");

await browser.close();

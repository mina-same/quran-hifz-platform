import pw from "/Users/xontel/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core/index.js";
const { chromium } = pw;
const OUT = "/Users/xontel/Downloads/mina work/quran-hifz-platform/.wolf/designqc-captures";
const URL = "http://localhost:8080/";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(20000);
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
const lb = await page.$(".lnd-login-btn"); if (lb) { await lb.click(); await page.waitForTimeout(600); }
// teacher account
await page.click("button.login-dev-btn:has-text('معلم')");
await page.waitForTimeout(300);
await page.click("button.login-submit");
await page.waitForSelector(".sidebar", { timeout: 20000 });
await page.waitForTimeout(1200);
await page.evaluate(() => { window.location.hash = "attendance"; });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUT}/attendance-picker.jpg`, type: "jpeg", quality: 72, fullPage: true });
console.log("shot: attendance-picker");

// Try to click the first context card to enter the roster+slider view
const ctxBtn = await page.$('.ctx-card, [class*="context-card"], .context-pick, button:has-text("أخذ الحضور")');
// fallback: click any button containing "الحضور"
const enterBtn = await page.$('button:has-text("أخذ الحضور والتقييم"), button:has-text("تسجيل"), button:has-text("الحضور")');
if (enterBtn) { await enterBtn.click(); await page.waitForTimeout(1800); }
await page.screenshot({ path: `${OUT}/attendance-slider.jpg`, type: "jpeg", quality: 72, fullPage: true });
console.log("shot: attendance-slider");

await browser.close();
console.log("done");

import { chromium } from "@playwright/test";

const baseUrl = process.env.TUTORIAL_CAPTURE_URL ?? "http://127.0.0.1:5173";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

for (const [step, name] of [[1, "01-select"], [2, "02-submit"], [3, "03-timer"]]) {
  await page.goto(`${baseUrl}/tutorial-demo?step=${step}`);
  await page.screenshot({ path: `public/tutorial-images/${name}.png` });
}

await browser.close();

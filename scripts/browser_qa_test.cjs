const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:5173';
const results = [];

const record = (name, passed, detail = '') => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'} - ${name}${detail ? `: ${detail}` : ''}`);
};

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  const consoleErrors = [];
  const failedRequests = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('requestfailed', (req) => {
    failedRequests.push(`${req.method()} ${req.url()} ${req.failure()?.errorText}`);
  });

  try {
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 20000 });
    record('Home page loads', await page.locator('text=SR BAKERY').first().isVisible());

    await page.goto(`${TARGET_URL}/menu`, { waitUntil: 'networkidle', timeout: 20000 });
    const cards = await page.locator('article').count();
    record('Menu page loads products', cards > 0, `${cards} cards`);

    await page.goto(`${TARGET_URL}/login`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.fill('input[type="email"]', 'admin@srbakery.com');
    await page.fill('input[type="password"]', 'Admin@123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin', { timeout: 15000 });
    record('Admin login redirects to dashboard', page.url().includes('/admin'));

    await page.waitForSelector("text=Today's Revenue", { timeout: 15000 });
    record('Admin overview cards render', await page.locator("text=Today's Revenue").isVisible());

    await page.click('text=Orders');
    await page.getByRole('heading', { name: 'Orders Management' }).waitFor({ timeout: 10000 });
    record('Orders section renders on demand', await page.getByRole('heading', { name: 'Orders Management' }).isVisible());

    await page.click('text=Messages');
    await page.waitForSelector('text=Messages & Feedback', { timeout: 10000 });
    record('Messages page renders', await page.locator('text=Messages & Feedback').isVisible());

    for (const viewport of [
      { name: 'mobile', width: 390, height: 844 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1440, height: 900 },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 20000 });
      const bodyBox = await page.locator('body').boundingBox();
      record(`Responsive ${viewport.name} body visible`, !!bodyBox && bodyBox.width > 0 && bodyBox.height > 0);
    }

    record('No browser console errors', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '));
    record('No failed browser requests', failedRequests.length === 0, failedRequests.slice(0, 2).join(' | '));
  } catch (error) {
    record('Unexpected browser test error', false, error.message);
  } finally {
    await browser.close();
  }

  const failed = results.filter((item) => !item.passed);
  console.log(JSON.stringify({ total: results.length, passed: results.length - failed.length, failed: failed.length, failures: failed }, null, 2));
  if (failed.length > 0) process.exit(1);
})();

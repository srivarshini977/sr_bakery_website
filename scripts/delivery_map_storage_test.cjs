const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:5173';
const API = 'http://localhost:5000/api';
const runId = Date.now();
const results = [];

const record = (name, passed, detail = '') => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'} - ${name}${detail ? `: ${detail}` : ''}`);
};

const request = async (path, options = {}) => {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${response.status} ${body.message || response.statusText}`);
  return body;
};

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    geolocation: { latitude: 10.8173, longitude: 77.9803 },
    permissions: ['geolocation'],
  });
  await context.grantPermissions(['geolocation'], { origin: TARGET_URL });
  const page = await context.newPage();
  const failedRequests = [];
  const consoleErrors = [];

  page.on('requestfailed', (req) => {
    const url = req.url();
    if (!url.includes('nominatim.openstreetmap.org') && !url.includes('openstreetmap.org')) {
      failedRequests.push(`${req.method()} ${url} ${req.failure()?.errorText}`);
    }
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    const productRes = await request('/products');
    const product = productRes.data.products.find((item) => item.inStock) || productRes.data.products[0];
    const email = `delivery.ui.${runId}@example.com`;
    const signup = await request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        name: `Delivery UI ${runId}`,
        email,
        phone: '9888888888',
        password: 'QaTest@123',
        address: 'GPS test address',
      }),
    });

    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 20000 });
    await page.evaluate(({ token, product }) => {
      localStorage.setItem('sr_bakery_token', token);
      localStorage.setItem('sr_bakery_cart', JSON.stringify([{ ...product, quantity: 1 }]));
    }, { token: signup.token, product });

    await page.goto(`${TARGET_URL}/checkout`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.getByRole('button', { name: 'Delivery' }).click();
    await page.getByRole('button', { name: /Use Current Location/i }).click();
    await page.waitForSelector('text=Delivery Available', { timeout: 25000 });

    const bodyText = await page.locator('body').innerText();
    record('Current location delivery available', bodyText.includes('Delivery Available'));
    record('GPS source is used', bodyText.includes('your current GPS location'));
    record('70 KM radius shown', bodyText.includes('Max Radius: 70 KM'));
    record('Expected 50 KM distance shown', /Distance:\s*50\.0\d\s*KM/.test(bodyText), bodyText.match(/Distance:\s*[^\n]+/)?.[0] || 'distance missing');
    record('Expected delivery charge shown', bodyText.includes('Charge: Rs. 150'));

    const iframeSrc = await page.locator('iframe[title="Delivery route map"]').getAttribute('src');
    record('Map iframe rendered', Boolean(iframeSrc && iframeSrc.includes('openstreetmap.org/export/embed.html')), iframeSrc || 'missing');
    const routeHref = await page.getByRole('link', { name: /Open full route map/i }).getAttribute('href');
    record('Route link rendered', Boolean(routeHref && routeHref.includes('openstreetmap.org/directions')), routeHref || 'missing');

    page.on('dialog', async (dialog) => dialog.accept());
    await page.getByRole('button', { name: /Place Order/i }).click();
    await page.waitForURL('**/orders/**', { timeout: 20000 });
    const orderId = page.url().split('/').pop();
    record('Delivery checkout created order', /^[a-f0-9]{24}$/i.test(orderId), orderId);

    const track = await request(`/orders/track/${orderId}`);
    const order = track.data.order;
    record('Stored order type is delivery', order.orderType === 'delivery', order.orderType);
    record('Stored customer latitude', Math.abs(Number(order.customerLatitude) - 10.8173) < 0.00001, String(order.customerLatitude));
    record('Stored customer longitude', Math.abs(Number(order.customerLongitude) - 77.9803) < 0.00001, String(order.customerLongitude));
    record('Stored distance is correct', Math.abs(Number(order.distanceKm) - 50.04) < 0.05, String(order.distanceKm));
    record('Stored delivery charge is correct', Number(order.deliveryCharge) === 150, String(order.deliveryCharge));
    record('Stored delivery availability is true', order.deliveryAvailable === true, String(order.deliveryAvailable));
    record('Stored ETA is present', Number(order.estimatedTime) > 0, String(order.estimatedTime));

    record('No relevant failed browser requests', failedRequests.length === 0, failedRequests.slice(0, 2).join(' | '));
    record('No console errors', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '));
  } catch (error) {
    record('Unexpected delivery/map test error', false, error.message);
  } finally {
    await browser.close();
  }

  const failed = results.filter((item) => !item.passed);
  console.log(JSON.stringify({ total: results.length, passed: results.length - failed.length, failed: failed.length, failures: failed }, null, 2));
  if (failed.length > 0) process.exit(1);
})();

const API = 'http://localhost:5000/api';
const runId = Date.now();
const results = [];
const cleanup = {
  users: [],
  orders: [],
  inventory: [],
  contactIds: [],
  products: [],
  reviewOrders: [],
};

const record = (name, passed, detail = '') => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'} - ${name}${detail ? `: ${detail}` : ''}`);
};

const request = async (path, options = {}) => {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const type = response.headers.get('content-type') || '';
  const body = type.includes('application/json') ? await response.json() : await response.arrayBuffer();
  if (!response.ok) {
    const message = body?.message || response.statusText;
    const error = new Error(message);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
};

const expectReject = async (name, fn, status) => {
  try {
    await fn();
    record(name, false, `expected ${status}`);
  } catch (error) {
    record(name, error.status === status, `status ${error.status}`);
  }
};

const login = async (email, password) => {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return { token: data.token, user: data.data.user };
};

try {
  const healthStart = performance.now();
  const health = await request('/health');
  record('Backend health check', health.status === 'OK', `${Math.round(performance.now() - healthStart)}ms`);

  const admin = await login('admin@srbakery.com', 'Admin@123');
  record('Admin login', admin.user.role === 'admin');

  const chef1 = await login('chef1@srbakery.com', 'Staff@123');
  const chef2 = await login('chef2@srbakery.com', 'Staff@123');
  const tea1 = await login('teamaster1@srbakery.com', 'Staff@123');
  const tea2 = await login('teamaster2@srbakery.com', 'Staff@123');
  const cashier1 = await login('cashier1@srbakery.com', 'Staff@123');
  const waiter1 = await login('waiter1@srbakery.com', 'Staff@123');
  record('All staff logins', [chef1, chef2, tea1, tea2, cashier1, waiter1].every((item) => item.user.role === 'staff'));

  await expectReject('Invalid login rejected', () => login('admin@srbakery.com', 'wrong-password'), 401);

  const customerEmail = `qa.customer.${runId}@example.com`;
  const signup = await request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      name: `QA Customer ${runId}`,
      email: customerEmail,
      phone: '9000000000',
      password: 'QaTest@123',
      address: 'QA Street',
    }),
  });
  cleanup.users.push(signup.data.user._id);
  record('Customer signup and JWT', signup.data.user.role === 'customer' && Boolean(signup.token));

  const customer = await login(customerEmail, 'QaTest@123');
  record('Customer login', customer.user.email === customerEmail);

  await expectReject('Customer blocked from admin users', () => request('/admin/users', { token: customer.token }), 403);
  await expectReject('Customer blocked from staff dashboard API', () => request('/staff/workstations', { token: customer.token }), 403);
  await expectReject('Staff blocked from admin users', () => request('/admin/users', { token: chef1.token }), 403);

  const productsData = await request('/products');
  const products = productsData.data.products;
  const product = products.find((item) => item.inStock && Number(item.stock) > 0) || products[0];
  record('Menu products load', products.length > 0 && product?.name, `${products.length} products`);

  const createdProduct = await request('/products', {
    method: 'POST',
    token: admin.token,
    body: JSON.stringify({ name: `QA Product ${runId}`, price: 99, category: 'QA', description: 'QA product', stock: 5, lowStockThreshold: 2, productionCost: 40 }),
  });
  cleanup.products.push(createdProduct.data.product._id);
  const updatedProduct = await request(`/products/${createdProduct.data.product._id}`, {
    method: 'PATCH',
    token: admin.token,
    body: JSON.stringify({ price: 109, stock: 4 }),
  });
  const toggledProduct = await request(`/products/${createdProduct.data.product._id}/toggle-stock`, {
    method: 'PATCH',
    token: admin.token,
    body: JSON.stringify({}),
  });
  record('Admin product create/edit/toggle', updatedProduct.data.product.price === 109 && toggledProduct.data.product.inStock === false);
  await expectReject('Staff cannot mutate products', () => request(`/products/${createdProduct.data.product._id}`, {
    method: 'PATCH',
    token: chef1.token,
    body: JSON.stringify({ price: 1 }),
  }), 403);

  const orderPayload = {
    userId: customer.user._id,
    items: [{ product: product._id, name: product.name, quantity: 1, price: product.price }],
    totalAmount: product.price,
    paymentMethod: 'cash',
    orderType: 'takeaway',
  };
  const orderResponse = await request('/orders', { method: 'POST', body: JSON.stringify(orderPayload) });
  const order = orderResponse.data.order;
  cleanup.orders.push(order._id);
  record('Checkout creates Pending order', order.status === 'Pending' && order.user === customer.user._id);

  const allStaff = await request('/staff/all', { token: admin.token });
  const chef1User = allStaff.data.find((staff) => staff.staffPerson === 'chef_1');
  await request(`/orders/${order._id}/assign`, {
    method: 'PATCH',
    token: admin.token,
    body: JSON.stringify({ assignedTo: chef1User._id, assignedRole: 'chef', assignedPerson: 'chef_1' }),
  });
  const chef1Orders = await request(`/staff/orders/assigned/${chef1.user._id}`, { token: chef1.token });
  const chef2Orders = await request(`/staff/orders/assigned/${chef2.user._id}`, { token: chef2.token });
  record('Chef 1 sees assigned order', chef1Orders.data.some((item) => item._id === order._id));
  record('Chef 2 cannot see Chef 1 order', !chef2Orders.data.some((item) => item._id === order._id));

  await expectReject('Chef 2 cannot update Chef 1 order', () => request(`/orders/${order._id}/status`, {
    method: 'PATCH',
    token: chef2.token,
    body: JSON.stringify({ status: 'Preparing' }),
  }), 403);

  for (const status of ['Preparing', 'Packed']) {
    const update = await request(`/orders/${order._id}/status`, {
      method: 'PATCH',
      token: chef1.token,
      body: JSON.stringify({ status }),
    });
    record(`Chef 1 updates order to ${status}`, update.data.order.status === status);
  }
  for (const status of ['Shipped', 'Delivered']) {
    const update = await request(`/orders/${order._id}/status`, {
      method: 'PATCH',
      token: admin.token,
      body: JSON.stringify({ status }),
    });
    record(`Admin updates order to ${status}`, update.data.order.status === status);
  }

  await expectReject('Review blocked for non-owned order', () => request('/reviews', {
    method: 'POST',
    token: chef1.token,
    body: JSON.stringify({ orderId: order._id, rating: 5, title: 'No', comment: 'No' }),
  }), 403);
  const review = await request('/reviews', {
    method: 'POST',
    token: customer.token,
    body: JSON.stringify({ orderId: order._id, rating: 5, title: 'Great', comment: 'QA delivered order review' }),
  });
  record('Delivered order review stored', review.data.review.rating === 5);
  let allRatingsPassed = true;
  for (const rating of [1, 2, 3, 4, 5]) {
    const updatedReview = await request('/reviews', {
      method: 'POST',
      token: customer.token,
      body: JSON.stringify({ orderId: order._id, rating, title: `Rating ${rating}`, comment: `QA rating ${rating}` }),
    });
    allRatingsPassed = allRatingsPassed && updatedReview.data.review.rating === rating;
  }
  record('Review supports 1 through 5 stars', allRatingsPassed);

  const notifications = await request('/notifications/my', { token: customer.token });
  record('Customer notifications load', Array.isArray(notifications.data.notifications));
  if (notifications.data.notifications[0]) {
    const id = notifications.data.notifications[0]._id;
    await request(`/notifications/${id}/read`, { method: 'PATCH', token: customer.token, body: JSON.stringify({}) });
    await request(`/notifications/${id}`, { method: 'DELETE', token: customer.token });
    record('Notification mark-read and delete', true);
  } else {
    record('Notification mark-read and delete', true, 'no notification to mutate');
  }

  const inventoryItem = await request('/admin/inventory', {
    method: 'POST',
    token: admin.token,
    body: JSON.stringify({ name: `QA Flour ${runId}`, category: 'QA', quantity: 2, unit: 'kg', minThreshold: 5, costPerUnit: 20 }),
  });
  cleanup.inventory.push(inventoryItem.data.item._id);
  const inventoryUpdate = await request(`/admin/inventory/${inventoryItem.data.item._id}`, {
    method: 'PATCH',
    token: admin.token,
    body: JSON.stringify({ quantity: 1, unit: 'kg', minThreshold: 5, costPerUnit: 20, category: 'QA' }),
  });
  record('Inventory create/edit', inventoryUpdate.data.item.quantity === 1);
  await request(`/admin/inventory/${inventoryItem.data.item._id}`, { method: 'DELETE', token: admin.token });
  cleanup.inventory = cleanup.inventory.filter((id) => id !== inventoryItem.data.item._id);
  record('Inventory delete', true);

  const contact = await request('/contact', {
    method: 'POST',
    body: JSON.stringify({ kind: 'message', name: 'QA Visitor', email: `qa.contact.${runId}@example.com`, phone: '9111111111', subject: 'QA Message', message: 'QA contact body' }),
  });
  cleanup.contactIds.push(contact.data.submission._id);
  await request(`/contact/${contact.data.submission._id}/read`, { method: 'PATCH', token: admin.token, body: JSON.stringify({}) });
  await request(`/contact/${contact.data.submission._id}/unread`, { method: 'PATCH', token: admin.token, body: JSON.stringify({}) });
  record('Contact submit/read/unread', true);
  await request(`/contact/${contact.data.submission._id}`, { method: 'DELETE', token: admin.token });
  cleanup.contactIds = cleanup.contactIds.filter((id) => id !== contact.data.submission._id);
  record('Contact delete', true);

  const analytics = await request('/admin/analytics', { token: admin.token });
  record('Analytics daily summary', Boolean(analytics.data.dailySummary && analytics.data.topSellingProducts));

  for (const path of ['/reports/sales/pdf', '/reports/sales/excel', '/reports/product-sales/excel', '/reports/inventory/excel', '/reports/customers/excel', '/reports/staff/excel']) {
    const report = await request(path, { token: admin.token, headers: { Accept: '*/*' } });
    record(`Report export ${path}`, report.byteLength > 0, `${report.byteLength} bytes`);
  }

  await request(`/products/${createdProduct.data.product._id}`, { method: 'DELETE', token: admin.token });
  cleanup.products = cleanup.products.filter((id) => id !== createdProduct.data.product._id);
  record('Admin product delete', true);
} catch (error) {
  record('Unexpected QA script error', false, `${error.status || ''} ${error.message}`);
} finally {
  try {
    const mongoose = await import('../backend/node_modules/mongoose/index.js');
    const User = (await import('../backend/models/User.js')).default;
    const Order = (await import('../backend/models/Order.js')).default;
    const Inventory = (await import('../backend/models/Inventory.js')).default;
    const ContactSubmission = (await import('../backend/models/ContactSubmission.js')).default;
    const Review = (await import('../backend/models/Review.js')).default;
    await mongoose.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/srbakery');
    await Review.deleteMany({ order: { $in: cleanup.orders } });
    await Order.deleteMany({ _id: { $in: cleanup.orders } });
    await Inventory.deleteMany({ _id: { $in: cleanup.inventory } });
    await ContactSubmission.deleteMany({ _id: { $in: cleanup.contactIds } });
    const Product = (await import('../backend/models/Product.js')).default;
    await Product.deleteMany({ _id: { $in: cleanup.products } });
    await User.deleteMany({ _id: { $in: cleanup.users } });
    await mongoose.default.disconnect();
    record('QA cleanup', true);
  } catch (error) {
    record('QA cleanup', false, error.message);
  }

  const failed = results.filter((item) => !item.passed);
  console.log(JSON.stringify({ total: results.length, passed: results.length - failed.length, failed: failed.length, failures: failed }, null, 2));
  if (failed.length > 0) process.exitCode = 1;
}

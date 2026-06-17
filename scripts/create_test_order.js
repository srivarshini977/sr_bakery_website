import fetch from 'node-fetch';

async function run() {
  try {
    const apiBase = process.env.API_BASE || 'http://localhost:5000/api';

    console.log('Fetching products...');
    const prodRes = await fetch(`${apiBase}/products`);
    const prodJson = await prodRes.json();
    const products = prodJson?.data?.products || [];
    if (!products.length) {
      console.error('No products available to create test order.');
      process.exit(1);
    }

    const p = products[0];
    const items = [{ product: p._id, name: p.name, price: p.price || 100, quantity: 1 }];

    const orderPayload = {
      guestName: 'Test Guest',
      items,
      totalAmount: items.reduce((s,i)=>s + (i.price * i.quantity), 0),
      paymentMethod: 'cash',
      orderType: 'Takeaway'
    };

    console.log('Creating test order for product:', p._id);
    const createRes = await fetch(`${apiBase}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });
    const createJson = await createRes.json();
    console.log('Order create response:', createJson);
  } catch (err) {
    console.error('Error in test order script:', err.message);
    process.exit(1);
  }
}

run();

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../utils/api';

const UserOrders = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await API.get('/orders/my-orders');
        setOrders(res.data.data.orders || []);
      } catch (e) {
        console.error(e);
      }
    };

    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h2 className="mb-6 text-2xl font-bold">My Orders</h2>
      {orders.length === 0 ? (
        <div className="glass-card rounded-lg p-8 text-center text-gray-400">No orders yet.</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <div key={order._id} className="glass-card rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-bold">Order #{order._id.slice(-6)}</div>
                  <div className="text-sm text-gray-400">{order.orderType} | {order.paymentStatus}</div>
                  {order.orderType === 'delivery' && (
                    <div className="mt-2 rounded border border-zinc-800 bg-zinc-950 p-2 text-xs text-gray-300">
                      <div>Distance: <span className="font-bold text-white">{order.distanceKm ?? '-'} KM</span></div>
                      <div>ETA: <span className="font-bold text-white">{order.estimatedTime ?? '-'} Minutes</span></div>
                      <div>Delivery: <span className="font-bold text-white">Rs. {order.deliveryCharge || 0}</span></div>
                    </div>
                  )}
                  <div className="mt-2 space-y-1 text-sm">
                    {order.items.map((item, index) => (
                      <div key={`${item.product || item.name}-${index}`} className="flex items-center justify-between gap-3">
                        <div>{item.name} x{item.quantity}</div>
                        <div className="font-bold">Rs. {item.price * item.quantity}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{order.status}</div>
                  <div className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleString()}</div>
                </div>
              </div>
              <Link to={`/orders/${order._id}`} className="mt-4 block rounded bg-bakery-red py-2 text-center text-sm font-bold text-white">
                Track Order
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserOrders;

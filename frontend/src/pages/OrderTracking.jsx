import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Clock, PackageCheck, Search } from 'lucide-react';
import API from '../utils/api';

const trackingStepsByType = {
  delivery: [
    { status: 'Pending', label: 'Order Placed', helper: 'We received your order.' },
    { status: 'Confirmed', label: 'Confirmed', helper: 'The bakery confirmed it.' },
    { status: 'Preparing', label: 'Preparing', helper: 'Your items are being prepared.' },
    { status: 'Packed', label: 'Packed', helper: 'Packed and ready for dispatch.' },
    { status: 'Shipped', label: 'Out for Delivery', helper: 'Your order is on the way.' },
    { status: 'Delivered', label: 'Delivered', helper: 'Delivered to your address.' }
  ],
  takeaway: [
    { status: 'Pending', label: 'Order Placed', helper: 'We received your order.' },
    { status: 'Confirmed', label: 'Confirmed', helper: 'The bakery confirmed it.' },
    { status: 'Preparing', label: 'Preparing', helper: 'Your items are being prepared.' },
    { status: 'Packed', label: 'Ready for Pickup', helper: 'Collect it from the counter.' },
    { status: 'Delivered', label: 'Collected', helper: 'Picked up from the bakery.' }
  ],
  'dine-in': [
    { status: 'Pending', label: 'Order Placed', helper: 'We received your table order.' },
    { status: 'Confirmed', label: 'Confirmed', helper: 'The bakery confirmed it.' },
    { status: 'Preparing', label: 'Preparing', helper: 'Your items are being prepared.' },
    { status: 'Packed', label: 'Ready to Serve', helper: 'Ready at the counter/kitchen.' },
    { status: 'Delivered', label: 'Served', helper: 'Served at your table.' }
  ]
};

const getTrackingSteps = (order) => {
  const baseSteps = trackingStepsByType[order?.orderType] || trackingStepsByType.takeaway;
  if (order?.paymentMethod !== 'reservation') return baseSteps;
  return baseSteps.map((step, index) => (
    index === 0 ? { ...step, label: 'Reserved', helper: 'Your order reservation is saved.' } : step
  ));
};

const getStepStatus = (order) => {
  if (order?.status === 'Ready') return 'Packed';
  if (order?.orderType !== 'delivery' && order?.status === 'Shipped') return 'Packed';
  return order?.status;
};

const OrderTracking = () => {
  const { orderId } = useParams();
  const [lookupId, setLookupId] = useState(orderId || '');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const steps = useMemo(() => getTrackingSteps(order), [order]);
  const activeIndex = useMemo(() => {
    if (order?.status === 'Cancelled') return -1;
    const normalizedStatus = getStepStatus(order);
    const index = steps.findIndex((step) => step.status === normalizedStatus);
    return index >= 0 ? index : 0;
  }, [order, steps]);

  const fetchOrder = async (id) => {
    if (!id?.trim()) return;
    try {
      setLoading(true);
      setError('');
      const response = await API.get(`/orders/track/${id.trim()}`);
      setOrder(response.data.data?.order);
    } catch (err) {
      setOrder(null);
      setError(err.response?.data?.message || 'Order not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) fetchOrder(orderId);
  }, [orderId]);

  useEffect(() => {
    if (!order?._id) return undefined;
    const interval = setInterval(() => {
      fetchOrder(order._id);
    }, 5000);
    return () => clearInterval(interval);
  }, [order?._id]);

  return (
    <div className="w-full px-5 py-12 sm:px-8 lg:px-12 2xl:px-16">
      <div className="glass-card rounded-lg border border-red-900 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <p className="text-sm uppercase text-red-300 font-bold">Live Order Tracking</p>
            <h1 className="text-3xl font-black text-white mt-2">Track your SR Bakery order</h1>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <input
              value={lookupId}
              onChange={(event) => setLookupId(event.target.value)}
              placeholder="Enter order ID"
              className="flex-1 md:w-80 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-600"
            />
            <button onClick={() => fetchOrder(lookupId)} className="bg-red-700 hover:bg-red-800 px-4 py-3 rounded-lg text-white font-bold flex items-center gap-2">
              <Search size={18} /> Track
            </button>
          </div>
        </div>

        {loading && <p className="text-gray-400">Fetching order...</p>}
        {error && <p className="text-red-300 bg-red-950 border border-red-900 rounded-lg p-4">{error}</p>}

        {order && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
              <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                <p className="text-xs text-gray-500">Order ID</p>
                <p className="font-bold text-white break-all">{order._id}</p>
              </div>
              <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                <p className="text-xs text-gray-500">Customer</p>
                <p className="font-bold text-white">{order.user?.name || order.guestName || 'Customer'}</p>
              </div>
              <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                <p className="text-xs text-gray-500">Payment</p>
                <p className="font-bold text-white">{order.paymentStatus}</p>
              </div>
              <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                <p className="text-xs text-gray-500">Order Type</p>
                <p className="font-bold capitalize text-white">{order.orderType || 'takeaway'}</p>
              </div>
              <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                <p className="text-xs text-gray-500">Total</p>
                <p className="font-black text-red-300">Rs. {order.totalAmount}</p>
              </div>
            </div>

            {order.status === 'Cancelled' && (
              <p className="rounded-lg border border-red-900 bg-red-950 p-4 font-bold text-red-200">
                This order has been cancelled.
              </p>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-5 xl:grid-cols-6">
              {steps.map((step, index) => {
                const done = index <= activeIndex;
                return (
                  <div key={step.status} className={`rounded-lg p-4 border ${done ? 'border-green-700 bg-green-950/40' : 'border-zinc-800 bg-zinc-900'}`}>
                    {done ? <CheckCircle2 className="text-green-400 mb-3" /> : <Clock className="text-gray-500 mb-3" />}
                    <p className={`font-bold ${done ? 'text-white' : 'text-gray-500'}`}>{step.label}</p>
                    <p className={`mt-1 text-xs ${done ? 'text-gray-300' : 'text-gray-600'}`}>{step.helper}</p>
                  </div>
                );
              })}
            </div>

            {order.orderType === 'delivery' && (
              <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <PackageCheck className="text-red-300" />
                  <h2 className="text-xl font-bold text-white">Delivery Details</h2>
                </div>
                <div className="grid grid-cols-1 gap-3 text-sm text-gray-300 md:grid-cols-4">
                  <p>Distance: <span className="font-bold text-white">{order.distanceKm ?? '-'} KM</span></p>
                  <p>Estimated Delivery: <span className="font-bold text-white">{order.estimatedTime ?? '-'} Minutes</span></p>
                  <p>Delivery Charge: <span className="font-bold text-white">Rs. {order.deliveryCharge || 0}</span></p>
                  <p>Status: <span className={order.deliveryAvailable ? 'font-bold text-green-300' : 'font-bold text-red-300'}>{order.deliveryServiceStatus || 'Available'}</span></p>
                </div>
                <p className="mt-3 text-sm text-gray-400">{order.deliveryAddress}</p>
              </div>
            )}

            <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-5">
              <div className="flex items-center gap-2 mb-4">
                <PackageCheck className="text-red-300" />
                <h2 className="text-xl font-bold text-white">Items</h2>
              </div>
              <div className="space-y-2">
                {order.items?.map((item, index) => (
                  <div key={`${item.product || item.name}-${index}`} className="flex justify-between text-gray-300">
                    <span>{item.name} x{item.quantity}</span>
                    <span>Rs. {item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!loading && !order && !error && (
          <div className="text-center py-10">
            <p className="text-gray-400">Enter an order ID to see its current kitchen and delivery status.</p>
            <Link to="/dashboard/orders" className="inline-block mt-4 text-red-300 font-bold">View my orders</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTracking;

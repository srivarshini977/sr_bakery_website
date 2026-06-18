import React, { useContext, useState } from 'react';
import { Eye, Search } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import API from '../utils/api';

const todayIso = () => new Date().toISOString().slice(0, 10);
const formatMoney = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
const formatItems = (items = []) => items.map((item) => `${item.name} x${item.quantity}`).join(', ');

const DateWiseOrderDashboard = () => {
  const { token } = useContext(AuthContext);
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [orders, setOrders] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');
      setSearched(true);
      const params = new URLSearchParams({
        filter: 'date',
        date: selectedDate
      });
      const response = await API.get(`/admin/orders/date-dashboard?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data.data?.orders || []);
    } catch (err) {
      console.error('Error loading orders by date:', err);
      setError(err.response?.data?.message || 'Unable to load orders for selected date.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-red-900/60 bg-black p-5">
        <h2 className="text-3xl font-black text-white">SR Bakery Admin Dashboard</h2>
        <div className="mt-6 grid max-w-2xl gap-3 sm:grid-cols-[1fr_auto]">
          <label className="text-xs font-bold uppercase tracking-widest text-gray-400">
            Date
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="mt-2 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-3 text-white outline-none focus:border-red-600"
            />
          </label>
          <button
            type="button"
            onClick={fetchOrders}
            disabled={loading || !selectedDate}
            className="inline-flex items-center justify-center gap-2 self-end rounded bg-red-700 px-5 py-3 font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Search size={17} /> {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-900 bg-red-950/60 p-4 text-red-100">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-red-900/50 bg-zinc-950 p-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-zinc-800 text-xs uppercase tracking-widest text-gray-400">
              <tr>
                <th className="py-3 pr-4">Order ID</th>
                <th className="py-3 pr-4">Customer Name</th>
                <th className="py-3 pr-4">Ordered Items</th>
                <th className="py-3 pr-4">Amount</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {!searched ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-gray-400">
                    Select a date and click Search.
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-gray-400">
                    No Orders Found for Selected Date.
                  </td>
                </tr>
              ) : orders.map((order) => (
                <tr key={order._id} className="align-top text-gray-300">
                  <td className="py-3 pr-4 font-black text-white">#{order.token || order._id?.slice(-6)?.toUpperCase()}</td>
                  <td className="py-3 pr-4 font-bold text-white">{order.customerName || 'Customer'}</td>
                  <td className="py-3 pr-4">{formatItems(order.items)}</td>
                  <td className="py-3 pr-4 font-bold text-white">{formatMoney(order.totalAmount)}</td>
                  <td className="py-3 pr-4">
                    <span className={`rounded px-2 py-1 text-xs font-bold ${
                      order.status === 'Delivered' ? 'bg-green-900 text-green-200' :
                      order.status === 'Cancelled' ? 'bg-red-900 text-red-200' :
                      'bg-yellow-900 text-yellow-200'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      className="inline-flex items-center gap-2 rounded bg-zinc-800 px-3 py-2 text-xs font-bold text-white hover:bg-zinc-700"
                    >
                      <Eye size={15} /> View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-xl rounded-lg border border-red-900 bg-zinc-950 p-5 shadow-2xl shadow-black">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-red-300">Order Details</p>
                <h3 className="mt-1 text-2xl font-black text-white">#{selectedOrder.token}</h3>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="rounded bg-zinc-800 px-3 py-2 text-sm font-bold text-white hover:bg-zinc-700">
                Close
              </button>
            </div>
            <div className="mt-5 space-y-3 text-sm text-gray-300">
              <p><span className="font-bold text-white">Customer:</span> {selectedOrder.customerName || 'Customer'}</p>
              <p><span className="font-bold text-white">Items:</span> {formatItems(selectedOrder.items)}</p>
              <p><span className="font-bold text-white">Amount:</span> {formatMoney(selectedOrder.totalAmount)}</p>
              <p><span className="font-bold text-white">Status:</span> {selectedOrder.status}</p>
              <p><span className="font-bold text-white">Ordered At:</span> {new Date(selectedOrder.createdAt).toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateWiseOrderDashboard;

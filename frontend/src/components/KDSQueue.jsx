import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import { Check, Clock } from 'lucide-react';

const KDSQueue = () => {
  const { token } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ pending: 0, preparing: 0, ready: 0 });
  const [socket, setSocket] = useState(null);

  const fetchQueue = async () => {
    try {
      const res = await axios.get('/api/staff/kds/queue', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data.data?.orders || res.data.data || [];
      setOrders(data);
      
      // Calculate stats
      setStats({
        pending: data.filter(o => o.status === 'Pending').length,
        preparing: data.filter(o => o.status === 'Preparing').length,
      ready: data.filter(o => ['Packed', 'Ready'].includes(o.status)).length
      });
    } catch (err) {
      console.error('Failed fetching KDS queue', err);
    }
  };

  useEffect(() => {
    if (!token) return;

    // Initial fetch
    fetchQueue();
    const pollInterval = setInterval(fetchQueue, 5000);

    // Socket.IO setup
    try {
      const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
        auth: { token },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5
      });

      newSocket.on('connect', () => {
        console.log('KDS Socket connected');
        newSocket.emit('join_kds');
      });

      newSocket.on('order_update', (updatedOrder) => {
        setOrders(prev => {
          const updated = prev.map(o => o._id === updatedOrder._id ? updatedOrder : o);
          return updated;
        });
        fetchQueue();
      });

      newSocket.on('order_assigned', (order) => {
        fetchQueue();
      });

      newSocket.on('disconnect', () => {
        console.log('KDS Socket disconnected');
      });

      setSocket(newSocket);
    } catch (e) {
      console.warn('Socket.IO connection failed:', e.message);
    }

    return () => {
      clearInterval(pollInterval);
      if (socket) {
        try {
          socket.emit('leave_kds');
          socket.disconnect();
        } catch (e) {}
      }
    };
  }, [token]);

  // Update order status
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const order = orders.find(o => o._id === orderId);
      if (!order) return;

      await axios.patch(`/api/orders/${orderId}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      fetchQueue();
    } catch (err) {
      console.error('Error updating order status:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return 'border-red-500 bg-red-950';
      case 'Preparing':
        return 'border-yellow-500 bg-yellow-950';
      case 'Ready':
      case 'Packed':
        return 'border-green-500 bg-green-950';
      default:
        return 'border-gray-500 bg-gray-950';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return 'bg-red-900 text-red-200';
      case 'Preparing':
        return 'bg-yellow-900 text-yellow-200';
      case 'Ready':
      case 'Packed':
        return 'bg-green-900 text-green-200';
      default:
        return 'bg-gray-900 text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* KDS Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 rounded-lg border border-red-900 text-center">
          <p className="text-sm text-gray-400">Pending</p>
          <p className="text-3xl font-bold text-red-400">{stats.pending}</p>
        </div>
        <div className="glass-card p-4 rounded-lg border border-yellow-900 text-center">
          <p className="text-sm text-gray-400">Preparing</p>
          <p className="text-3xl font-bold text-yellow-400">{stats.preparing}</p>
        </div>
        <div className="glass-card p-4 rounded-lg border border-green-900 text-center">
          <p className="text-sm text-gray-400">Ready</p>
          <p className="text-3xl font-bold text-green-400">{stats.ready}</p>
        </div>
      </div>

      {/* KDS Queue */}
      <div>
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-white">Kitchen Display System</h2>
          <p className="mt-1 text-sm text-gray-400">
            KDS is the kitchen order screen. Use it to see active orders, start preparation, and mark food ready.
          </p>
        </div>
        {orders.length === 0 ? (
          <div className="glass-card p-8 rounded-lg border border-red-900 text-center">
            <p className="text-gray-400">No orders in queue</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map(order => (
              <div
                key={order._id}
                className={`p-4 rounded-lg border-2 ${getStatusColor(order.status)} cursor-pointer hover:shadow-lg transition`}
              >
                {/* Order Header */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-lg font-bold text-white">Order #{order._id?.substring(0, 8)}</p>
                    <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleTimeString()}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusBadge(order.status)}`}>
                    {order.status}
                  </span>
                </div>

                {/* Customer Info */}
                <div className="border-t border-opacity-30 border-white pt-3 mb-3">
                  <p className="text-sm font-bold text-white">{order.user?.name || order.guestName || 'Customer'}</p>
                </div>

                {/* Items */}
                <div className="bg-black bg-opacity-50 p-3 rounded mb-3 max-h-32 overflow-y-auto">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm text-gray-200 mb-1">
                      <span>{item.name}</span>
                      <span className="font-bold">x{item.quantity}</span>
                    </div>
                  ))}
                </div>

                {/* Special Instructions */}
                {order.notes && (
                  <div className="bg-black bg-opacity-50 p-2 rounded mb-3 text-xs text-yellow-300 italic">
                    Note: {order.notes}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {order.status === 'Pending' && (
                    <button
                      onClick={() => updateOrderStatus(order._id, 'Preparing')}
                      className="flex-1 bg-yellow-700 hover:bg-yellow-800 text-white py-2 rounded font-bold text-sm transition flex items-center justify-center gap-1"
                    >
                      <Clock size={16} /> Start
                    </button>
                  )}
                  {order.status === 'Preparing' && (
                    <button
                      onClick={() => updateOrderStatus(order._id, 'Ready')}
                      className="flex-1 bg-green-700 hover:bg-green-800 text-white py-2 rounded font-bold text-sm transition flex items-center justify-center gap-1"
                    >
                      <Check size={16} /> Ready
                    </button>
                  )}
                  {order.status !== 'Ready' && (
                    <button
                      onClick={() => fetchQueue()}
                      className="flex-1 bg-gray-700 hover:bg-gray-800 text-white py-2 rounded font-bold text-sm transition"
                    >
                      Refresh
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default KDSQueue;

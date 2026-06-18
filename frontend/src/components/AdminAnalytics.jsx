import React, { useContext, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { AlertTriangle, CheckCircle2, MessageSquare, PackageCheck, ShoppingBag, Star, TrendingDown, TrendingUp, Users, Wallet } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import API from '../utils/api';

const formatMoney = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN');
const chartColors = ['#b30000', '#d97706', '#16a34a', '#2563eb', '#9333ea', '#eab308'];

const Counter = ({ value, money = false }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const target = Number(value || 0);
    const steps = 18;
    let frame = 0;
    const interval = setInterval(() => {
      frame += 1;
      setDisplay(Math.round((target * frame) / steps));
      if (frame >= steps) clearInterval(interval);
    }, 22);
    return () => clearInterval(interval);
  }, [value]);

  return money ? formatMoney(display) : formatNumber(display);
};

const Trend = ({ value = 0 }) => {
  const positive = Number(value) >= 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${positive ? 'text-green-300' : 'text-red-300'}`}>
      {positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
      {Math.abs(Number(value || 0))}%
    </span>
  );
};

const AdminAnalytics = () => {
  const { token } = useContext(AuthContext);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await API.get('/admin/analytics', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAnalytics(response.data.data);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Unable to load analytics.');
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchAnalytics();
  }, [token]);

  const summary = analytics?.dailySummary || {};
  const trendData = useMemo(() => analytics?.salesTrends || [], [analytics]);
  const topProducts = analytics?.topSellingProducts || [];
  const topCategories = analytics?.topCategories || [];
  const feedback = analytics?.feedback || {};

  const summaryCards = [
    { label: "Today's Orders", value: summary.todayOrders, icon: ShoppingBag, trend: summary.trends?.todayOrders },
    { label: 'Revenue Today', value: summary.todayRevenue, money: true, icon: Wallet, trend: summary.trends?.todayRevenue },
    { label: 'Monthly Revenue', value: summary.monthlyRevenue, money: true, icon: TrendingUp },
    { label: 'Popular Item', text: summary.todayTopProduct || 'No sales yet', icon: Star },
    { label: 'Pending Orders', value: summary.pendingOrders, icon: AlertTriangle },
    { label: 'Completed Orders', value: summary.completedOrders, icon: PackageCheck },
    { label: 'Feedback Count', value: summary.feedbackCount, icon: MessageSquare },
    { label: 'Staff Orders Today', value: summary.staffOrdersToday, icon: Users },
    { label: 'Total Customers', value: summary.totalCustomers, icon: Users, trend: summary.trends?.totalCustomers },
    { label: 'Active Orders', value: summary.activeOrders, icon: ShoppingBag },
    { label: 'Delivered Orders', value: summary.deliveredOrders, icon: CheckCircle2 },
    { label: 'Cancelled Orders', value: summary.cancelledOrders, icon: AlertTriangle }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="glass-card h-32 animate-pulse rounded-lg p-4" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="glass-card rounded-lg p-5 text-red-200">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="glass-card rounded-lg border border-red-900/50 p-4 shadow-xl shadow-black/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{card.label}</p>
                  <p className="mt-3 min-h-8 text-2xl font-black text-white">
                    {card.text || <Counter value={card.value} money={card.money} />}
                  </p>
                </div>
                <span className="rounded-lg bg-red-950/70 p-2 text-red-200">
                  <Icon size={20} />
                </span>
              </div>
              {card.trend !== undefined && <div className="mt-3"><Trend value={card.trend} /> <span className="text-xs text-gray-500">vs yesterday</span></div>}
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="glass-card rounded-lg border border-red-900/50 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black text-white">Best Selling Products</h2>
            <span className="text-xs font-bold uppercase tracking-widest text-red-300">Top 10</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="name" tick={{ fill: '#d4d4d8', fontSize: 10 }} interval={0} angle={-18} height={70} />
                <YAxis tick={{ fill: '#d4d4d8', fontSize: 11 }} />
                <Tooltip formatter={(value, key) => key === 'revenue' ? formatMoney(value) : value} />
                <Bar dataKey="salesCount" fill="#b30000" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card rounded-lg border border-red-900/50 p-5">
          <h2 className="text-xl font-black text-white">Top Categories</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={topCategories} dataKey="quantity" nameKey="category" outerRadius={100} label>
                  {topCategories.map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="glass-card rounded-lg border border-red-900/50 p-5 xl:col-span-2">
          <h2 className="text-xl font-black text-white">Sales Trend</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="month" tick={{ fill: '#d4d4d8' }} />
                <YAxis tick={{ fill: '#d4d4d8' }} />
                <Tooltip formatter={(value) => formatMoney(value)} />
                <Line type="monotone" dataKey="sales" stroke="#ef4444" strokeWidth={3} />
                <Line type="monotone" dataKey="profit" stroke="#fbbf24" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card rounded-lg border border-red-900/50 p-5">
          <h2 className="text-xl font-black text-white">Low Stock Alerts</h2>
          <div className="mt-4 space-y-3">
            {(analytics?.lowStockAlerts || []).length === 0 ? (
              <p className="rounded-lg bg-green-950/40 p-4 text-sm text-green-200">All stock levels look healthy.</p>
            ) : analytics.lowStockAlerts.map((item) => (
              <div key={`${item.name}-${item.unit}`} className="flex items-center justify-between rounded-lg bg-zinc-950 p-3">
                <div>
                  <p className="font-bold text-white">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.quantity} {item.unit}</p>
                </div>
                <span className={`rounded px-2 py-1 text-xs font-bold ${item.status === 'Critical' ? 'bg-red-900 text-red-200' : 'bg-yellow-900 text-yellow-200'}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="glass-card rounded-lg border border-red-900/50 p-5">
          <p className="text-sm text-gray-400">Average Rating</p>
          <p className="mt-2 text-4xl font-black text-white">{feedback.averageRating || 0}/5</p>
          <p className="mt-1 text-sm text-gray-400">{feedback.totalReviews || 0} total reviews</p>
        </div>
        <div className="glass-card rounded-lg border border-red-900/50 p-5">
          <p className="text-sm text-gray-400">Unread Messages</p>
          <p className="mt-2 text-4xl font-black text-white">{feedback.unreadMessagesCount || 0}</p>
          <p className="mt-1 text-sm text-gray-400">Contact inbox needs attention</p>
        </div>
        <div className="glass-card rounded-lg border border-red-900/50 p-5">
          <p className="text-sm text-gray-400">Most Ordered</p>
          <p className="mt-2 text-lg font-black text-white">{analytics?.mostOrderedItem?.name || 'No item yet'}</p>
          <p className="mt-1 text-sm text-gray-400">Least: {analytics?.leastOrderedItem?.name || 'No item yet'}</p>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;

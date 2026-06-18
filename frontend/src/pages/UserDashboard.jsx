import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle2, Clock, Edit2, Mail, Phone, LogOut, Star } from 'lucide-react';
import API from '../utils/api';

const dashboardStepsByType = {
  delivery: [
    { status: 'Pending', label: 'Placed' },
    { status: 'Confirmed', label: 'Confirmed' },
    { status: 'Preparing', label: 'Preparing' },
    { status: 'Packed', label: 'Packed' },
    { status: 'Shipped', label: 'On the way' },
    { status: 'Delivered', label: 'Delivered' }
  ],
  takeaway: [
    { status: 'Pending', label: 'Placed' },
    { status: 'Confirmed', label: 'Confirmed' },
    { status: 'Preparing', label: 'Preparing' },
    { status: 'Packed', label: 'Ready' },
    { status: 'Delivered', label: 'Collected' }
  ],
  'dine-in': [
    { status: 'Pending', label: 'Placed' },
    { status: 'Confirmed', label: 'Confirmed' },
    { status: 'Preparing', label: 'Preparing' },
    { status: 'Packed', label: 'Ready' },
    { status: 'Delivered', label: 'Served' }
  ]
};

const getDashboardSteps = (order) => dashboardStepsByType[order?.orderType] || dashboardStepsByType.takeaway;

const OrderTimeline = ({ order }) => {
  const orderSteps = getDashboardSteps(order);
  const normalizedStatus = order?.status === 'Ready' || (order?.orderType !== 'delivery' && order?.status === 'Shipped')
    ? 'Packed'
    : order?.status;
  const activeIndex = order?.status === 'Cancelled' ? -1 : Math.max(0, orderSteps.findIndex((step) => step.status === normalizedStatus));
  return (
    <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-3">
      {order?.status === 'Cancelled' && (
        <p className="mb-3 rounded border border-red-900 bg-red-950 px-3 py-2 text-xs font-bold text-red-200">Cancelled</p>
      )}
      <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
        {orderSteps.map((step, index) => {
          const done = index <= activeIndex;
          return (
            <div key={step.status} className="flex items-center gap-2">
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${done ? 'bg-green-700 text-white' : 'bg-zinc-800 text-gray-500'}`}>
                {done ? <CheckCircle2 size={13} /> : <Clock size={13} />}
              </div>
              <p className={`text-[11px] font-bold ${done ? 'text-white' : 'text-gray-500'}`}>{step.label}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full rounded-full bg-gradient-to-r from-red-700 via-yellow-500 to-green-600 transition-all duration-500" style={{ width: `${Math.max(0, ((activeIndex + 1) / orderSteps.length) * 100)}%` }} />
      </div>
    </div>
  );
};

const UserDashboard = () => {
  const { user, token, logout, wishlistItems, refreshWishlist } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('current');
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });
  const [newAddress, setNewAddress] = useState({
    street: '',
    city: '',
    state: '',
    pincode: ''
  });
  const [reviewForms, setReviewForms] = useState({});
  const [generalFeedback, setGeneralFeedback] = useState({ message: '', sent: false });
  const [reviewOpenOrderId, setReviewOpenOrderId] = useState('');

  // Fetch user orders
  const fetchOrders = async () => {
    try {
      const response = await axios.get(`/api/orders/user/${user?._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  useEffect(() => {
    if (token && user?._id) {
      fetchOrders();
      refreshWishlist?.().catch((error) => console.error('Error refreshing favorites:', error));
      const interval = setInterval(fetchOrders, 5000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [token, user?._id]);

  // Handle profile update
  const handleUpdateProfile = async () => {
    try {
      await axios.patch(`/api/auth/update/${user?._id}`, profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditMode(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    }
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const submitReview = async (orderId) => {
    const form = reviewForms[orderId] || {};
    if (!form.comment) {
      alert('Please enter your review comment');
      return;
    }
    try {
      await API.post('/reviews', {
        orderId,
        rating: Number(form.rating || 5),
        title: form.title || '',
        comment: form.comment
      });
      setReviewForms((forms) => ({ ...forms, [orderId]: { rating: 5, title: '', comment: '', sent: true } }));
      alert('Thank you for your review!');
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to save review');
    }
  };

  const submitGeneralFeedback = async () => {
    const orderId = generalFeedback.orderId || deliveredOrders[0]?._id;
    if (!orderId || !generalFeedback.message) {
      alert('Please select an order and enter your feedback');
      return;
    }
    try {
      await API.post('/reviews', {
        orderId,
        rating: 5,
        title: '',
        comment: generalFeedback.message
      });
      setGeneralFeedback({ message: '', sent: true, orderId });
      alert('Feedback submitted for admin approval.');
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to save feedback');
    }
  };

  const currentOrders = orders.filter((order) => !['Delivered', 'Cancelled'].includes(order.status));
  const pastOrders = orders.filter((order) => ['Delivered', 'Cancelled'].includes(order.status));
  const deliveredOrders = orders.filter((order) => order.status === 'Delivered');

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-red-950 p-4 md:p-6">
      <div className="w-full px-5 sm:px-8 lg:px-12 2xl:px-16">
        {/* Header */}
        <div className="glass-card p-6 rounded-lg border border-red-900 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white">Customer Dashboard</h1>
              <p className="text-gray-400 mt-1">Welcome, <span className="font-bold text-red-300">{user?.name}</span></p>
              <p className="text-gray-500 mt-1">{user?.email}</p>
              <p className="text-sm text-gray-500 mt-2">Member ID: {user?._id?.substring(0, 8)}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-700 hover:bg-red-800 px-6 py-2 rounded-lg text-white font-bold transition"
            >
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['current', 'orders', 'profile'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-lg font-bold transition ${
                activeTab === tab
                  ? 'bg-red-700 text-white'
                  : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
              }`}
            >
              {tab === 'profile' && 'Profile'}
              {tab === 'current' && `Current Orders (${currentOrders.length})`}
              {tab === 'orders' && `Past Orders (${pastOrders.length})`}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="glass-card p-6 rounded-lg border border-red-900">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Personal Information</h2>
              <button
                onClick={() => setEditMode(!editMode)}
                className="flex items-center gap-2 bg-red-700 hover:bg-red-800 px-4 py-2 rounded-lg text-white font-bold transition"
              >
                <Edit2 size={18} /> {editMode ? 'Cancel' : 'Edit'}
              </button>
            </div>

            <div className="space-y-4">
              {editMode ? (
                <>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="w-full bg-zinc-800 text-white px-4 py-2 rounded-lg border border-zinc-700 focus:border-red-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Email</label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="w-full bg-zinc-800 text-white px-4 py-2 rounded-lg border border-zinc-700 focus:border-red-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className="w-full bg-zinc-800 text-white px-4 py-2 rounded-lg border border-zinc-700 focus:border-red-600 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={handleUpdateProfile}
                    className="w-full bg-green-700 hover:bg-green-800 text-white py-2 rounded-lg font-bold transition mt-6"
                  >
                    Save Changes
                  </button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-zinc-900 rounded-lg">
                    <Mail className="text-red-400" />
                    <div>
                      <p className="text-xs text-gray-400">Email</p>
                      <p className="text-white font-bold">{user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-zinc-900 rounded-lg">
                    <Phone className="text-red-400" />
                    <div>
                      <p className="text-xs text-gray-400">Phone</p>
                      <p className="text-white font-bold">{user?.phone || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {pastOrders.length === 0 ? (
              <div className="glass-card p-8 rounded-lg text-center border border-red-900">
                <p className="text-gray-400 text-lg">No past orders yet</p>
                <button
                  onClick={() => navigate('/menu')}
                  className="mt-4 bg-red-700 hover:bg-red-800 px-6 py-2 rounded-lg text-white font-bold transition"
                >
                  Start Ordering
                </button>
              </div>
            ) : (
              pastOrders.map(order => (
                <div key={order._id} className="rounded-lg border border-red-900/70 bg-zinc-950 p-4 transition hover:border-red-700">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto] md:items-center">
                    <div>
                      <p className="text-xs text-gray-500">Order ID</p>
                      <p className="text-lg font-bold text-white">{order._id?.substring(0, 8)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Date</p>
                      <p className="text-white font-bold">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Items</p>
                      <p className="text-white font-bold">{order.items?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total</p>
                      <p className="text-lg font-bold text-red-400">Rs. {order.totalAmount}</p>
                    </div>
                    <div>
                      <span className={`px-3 py-1 rounded text-xs font-bold ${
                        order.status === 'Delivered' ? 'bg-green-900 text-green-200' :
                        ['Packed', 'Ready', 'Shipped'].includes(order.status) ? 'bg-blue-900 text-blue-200' :
                        order.status === 'Preparing' ? 'bg-yellow-900 text-yellow-200' :
                        order.status === 'Cancelled' ? 'bg-red-900 text-red-200' :
                        'bg-orange-900 text-orange-200'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 border-t border-zinc-800 pt-3 text-sm text-gray-300">
                    {order.items?.map((item) => `${item.name} x${item.quantity}`).join('  |  ')}
                  </p>

                  {order.status === 'Delivered' && (
                    <div className="mt-3 rounded-lg border border-zinc-800 bg-black/30 p-3">
                      {reviewForms[order._id]?.sent ? (
                        <p className="text-sm text-green-200">Review submitted. Thank you!</p>
                      ) : reviewOpenOrderId === order._id ? (
                        <div className="grid gap-2 md:grid-cols-[140px_1fr_auto]">
                          <select
                            value={reviewForms[order._id]?.rating || 5}
                            onChange={(event) => setReviewForms((forms) => ({ ...forms, [order._id]: { ...forms[order._id], rating: event.target.value } }))}
                            className="rounded border border-zinc-700 bg-zinc-900 p-2 text-sm text-white"
                          >
                            {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}
                          </select>
                          <input
                            value={reviewForms[order._id]?.comment || ''}
                            onChange={(event) => setReviewForms((forms) => ({ ...forms, [order._id]: { ...forms[order._id], comment: event.target.value } }))}
                            className="rounded border border-zinc-700 bg-zinc-900 p-2 text-sm text-white"
                            placeholder="Share your experience"
                          />
                          <button onClick={() => submitReview(order._id)} className="rounded bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800">
                            Submit
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setReviewOpenOrderId(order._id)} className="inline-flex items-center gap-2 text-sm font-bold text-yellow-300 hover:text-yellow-200">
                          <Star size={16} /> Rate Order
                        </button>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => navigate(`/orders/${order._id}`)}
                    className="mt-3 rounded bg-red-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-800"
                  >
                    Track Order
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'current' && (
          <div className="space-y-4">
            {currentOrders.length === 0 ? (
              <div className="glass-card rounded-lg border border-red-900 p-8 text-center text-gray-400">No current orders.</div>
            ) : currentOrders.map((order) => (
              <div key={order._id} className="rounded-lg border border-red-900/70 bg-zinc-950 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-bakery-gold">Token #{order._id?.slice(-6)?.toUpperCase()}</p>
                    <h3 className="mt-1 text-xl font-black text-white">{order.status}</h3>
                    <p className="mt-1 text-sm text-gray-400">
                      {order.items?.map((item) => `${item.name} x${item.quantity}`).join('  |  ')}
                    </p>
                  </div>
                  <button onClick={() => navigate(`/orders/${order._id}`)} className="rounded bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800">
                    Track Order
                  </button>
                </div>
                <OrderTimeline order={order} />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'favorites' && (
          <div className="grid gap-4 md:grid-cols-3">
            {(wishlistItems || []).length === 0 ? (
              <div className="glass-card rounded-lg border border-red-900 p-8 text-center text-gray-400 md:col-span-3">No favorite items yet.</div>
            ) : wishlistItems.map((item) => (
              <div key={item._id} className="glass-card rounded-lg border border-red-900 p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-bakery-gold">{item.category}</p>
                <h3 className="mt-2 text-lg font-black text-white">{item.name}</h3>
                <p className="mt-3 text-red-300 font-black">Rs. {item.price}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="glass-card rounded-lg border border-red-900 p-6">
            <h2 className="text-2xl font-bold text-white">Feedback Submission</h2>
            <p className="mt-2 text-sm text-gray-400">Delivered-order feedback appears on the homepage only after admin approval.</p>
            {deliveredOrders.length === 0 ? (
              <p className="mt-5 rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-gray-400">Feedback is available after your first delivered order.</p>
            ) : (
              <div className="mt-5 grid gap-3">
                <select
                  className="rounded border border-zinc-700 bg-zinc-900 p-3 text-white"
                  onChange={(event) => setGeneralFeedback({ ...generalFeedback, orderId: event.target.value })}
                  value={generalFeedback.orderId || deliveredOrders[0]?._id || ''}
                >
                  {deliveredOrders.map((order) => (
                    <option key={order._id} value={order._id}>Order #{order._id.slice(-6).toUpperCase()}</option>
                  ))}
                </select>
                <textarea
                  value={generalFeedback.message}
                  onChange={(event) => setGeneralFeedback({ ...generalFeedback, message: event.target.value })}
                  className="rounded border border-zinc-700 bg-zinc-900 p-3 text-white"
                  placeholder="Share your feedback"
                  rows="4"
                />
                {generalFeedback.sent && <p className="rounded border border-green-800 bg-green-950/50 p-3 text-sm text-green-200">Feedback submitted for admin approval.</p>}
                <button
                  onClick={submitGeneralFeedback}
                  className="rounded bg-red-700 px-4 py-3 font-bold text-white hover:bg-red-800"
                >
                  Submit Feedback
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'loyalty' && (
          <div className="glass-card rounded-lg border border-red-900 p-6">
            <p className="text-sm font-bold uppercase tracking-widest text-bakery-gold">Reward Points</p>
            <h2 className="mt-3 text-5xl font-black text-white">{user?.loyaltyPoints || 0}</h2>
            <p className="mt-3 text-gray-400">Earn points on completed customer orders. Staff internal orders do not add loyalty points.</p>
          </div>
        )}

        {/* Addresses Tab */}
        {activeTab === 'addresses' && (
          <div>
            <div className="glass-card p-6 rounded-lg border border-red-900">
              <h3 className="text-xl font-bold text-white mb-4">Add New Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Street Address"
                  value={newAddress.street}
                  onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                  className="bg-zinc-800 text-white px-4 py-2 rounded-lg border border-zinc-700 focus:border-red-600 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="City"
                  value={newAddress.city}
                  onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                  className="bg-zinc-800 text-white px-4 py-2 rounded-lg border border-zinc-700 focus:border-red-600 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="State"
                  value={newAddress.state}
                  onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                  className="bg-zinc-800 text-white px-4 py-2 rounded-lg border border-zinc-700 focus:border-red-600 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Pincode"
                  value={newAddress.pincode}
                  onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })}
                  className="bg-zinc-800 text-white px-4 py-2 rounded-lg border border-zinc-700 focus:border-red-600 focus:outline-none"
                />
              </div>
              <button className="mt-4 w-full bg-green-700 hover:bg-green-800 text-white py-2 rounded-lg font-bold transition">
                Add Address
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;

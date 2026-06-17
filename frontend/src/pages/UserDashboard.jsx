import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle2, Clock, Edit2, Mail, Phone, LogOut, Star } from 'lucide-react';
import API from '../utils/api';

const orderSteps = ['Pending', 'Confirmed', 'Preparing', 'Packed', 'Shipped', 'Delivered'];

const OrderTimeline = ({ status }) => {
  const normalizedStatus = status === 'Ready' ? 'Packed' : status;
  const activeIndex = Math.max(0, orderSteps.indexOf(normalizedStatus));
  return (
    <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <div className="relative grid grid-cols-2 gap-3 md:grid-cols-6">
        {orderSteps.map((step, index) => {
          const done = index <= activeIndex;
          return (
            <div key={step} className="relative">
              <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-full ${done ? 'bg-green-700 text-white' : 'bg-zinc-800 text-gray-500'}`}>
                {done ? <CheckCircle2 size={18} /> : <Clock size={18} />}
              </div>
              <p className={`text-xs font-bold ${done ? 'text-white' : 'text-gray-500'}`}>{step}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full rounded-full bg-gradient-to-r from-red-700 via-yellow-500 to-green-600 transition-all duration-500" style={{ width: `${((activeIndex + 1) / orderSteps.length) * 100}%` }} />
      </div>
      <p className="mt-2 text-xs text-gray-400">Estimated completion: {normalizedStatus === 'Delivered' ? 'Completed' : '25-40 minutes from confirmation'}</p>
    </div>
  );
};

const UserDashboard = () => {
  const { user, token, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile'); // profile, orders, addresses
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-red-950 p-4 md:p-6">
      <div className="w-full px-5 sm:px-8 lg:px-12 2xl:px-16">
        {/* Header */}
        <div className="glass-card p-6 rounded-lg border border-red-900 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white">{user?.name}</h1>
              <p className="text-gray-400 mt-1">{user?.email}</p>
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
          {['profile', 'orders', 'addresses'].map(tab => (
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
              {tab === 'orders' && `Orders (${orders.length})`}
              {tab === 'addresses' && 'Addresses'}
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
            {orders.length === 0 ? (
              <div className="glass-card p-8 rounded-lg text-center border border-red-900">
                <p className="text-gray-400 text-lg">No orders yet</p>
                <button
                  onClick={() => navigate('/menu')}
                  className="mt-4 bg-red-700 hover:bg-red-800 px-6 py-2 rounded-lg text-white font-bold transition"
                >
                  Start Ordering
                </button>
              </div>
            ) : (
              orders.map(order => (
                <div key={order._id} className="glass-card p-6 rounded-lg border border-red-900 hover:border-red-700 transition">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
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

                  {order.items && (
                    <div className="mt-4 border-t border-zinc-700 pt-4">
                      <p className="text-xs text-gray-400 mb-2">Items:</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {order.items.map((item, idx) => (
                          <p key={idx} className="text-sm text-gray-300">
                            {item.name} x{item.quantity}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  <OrderTimeline status={order.status} />

                  {order.status === 'Delivered' && (
                    <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                      <div className="mb-3 flex items-center gap-2 text-yellow-300">
                        <Star size={18} />
                        <h3 className="font-bold text-white">Rate this order</h3>
                      </div>
                      {reviewForms[order._id]?.sent ? (
                        <p className="rounded border border-green-700 bg-green-950/50 p-3 text-sm text-green-200">Review submitted. Thank you!</p>
                      ) : (
                        <div className="grid gap-3">
                          <select
                            value={reviewForms[order._id]?.rating || 5}
                            onChange={(event) => setReviewForms((forms) => ({ ...forms, [order._id]: { ...forms[order._id], rating: event.target.value } }))}
                            className="rounded border border-zinc-700 bg-zinc-900 p-2 text-white"
                          >
                            {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}
                          </select>
                          <input
                            value={reviewForms[order._id]?.title || ''}
                            onChange={(event) => setReviewForms((forms) => ({ ...forms, [order._id]: { ...forms[order._id], title: event.target.value } }))}
                            className="rounded border border-zinc-700 bg-zinc-900 p-2 text-white"
                            placeholder="Review title"
                          />
                          <textarea
                            value={reviewForms[order._id]?.comment || ''}
                            onChange={(event) => setReviewForms((forms) => ({ ...forms, [order._id]: { ...forms[order._id], comment: event.target.value } }))}
                            className="rounded border border-zinc-700 bg-zinc-900 p-2 text-white"
                            placeholder="Share your experience"
                            rows="3"
                          />
                          <button onClick={() => submitReview(order._id)} className="rounded bg-red-700 px-4 py-2 font-bold text-white hover:bg-red-800">
                            Submit Review
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => navigate(`/orders/${order._id}`)}
                    className="mt-4 w-full bg-red-700 hover:bg-red-800 text-white py-2 rounded-lg font-bold transition"
                  >
                    Track Order
                  </button>
                </div>
              ))
            )}
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

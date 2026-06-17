import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import AdminLayout from '../components/AdminLayout';
import AdminAnalytics from '../components/AdminAnalytics';
import MasterManagement from '../components/MasterManagement';
import axios from 'axios';
import { AlertTriangle, Download, MapPin, Printer, RefreshCw, Save, Search } from 'lucide-react';

const AdminDashboard = () => {
  const { token } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [orderView, setOrderView] = useState('active');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedRole, setSelectedRole] = useState('chef');
  const [activeSection, setActiveSection] = useState('dashboard');
  const [inventory, setInventory] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventorySaving, setInventorySaving] = useState(false);
  const [inventoryDirtyIds, setInventoryDirtyIds] = useState(() => new Set());
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCategory, setInventoryCategory] = useState('All');
  const [workstations, setWorkstations] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState('');
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsSaving, setProductsSaving] = useState(false);
  const [productDirtyIds, setProductDirtyIds] = useState(() => new Set());
  const [contactSubmissions, setContactSubmissions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [deliverySettings, setDeliverySettings] = useState({
    name: 'SR Bakery',
    latitude: 10.3673,
    longitude: 77.9803,
    maxRadiusKm: 70,
    baseSpeedKmph: 35
  });

  const roles = [
    { value: 'chef', label: 'Chef' },
    { value: 'tea_master', label: 'Tea Master' },
    { value: 'waiter', label: 'Waiter' },
    { value: 'cashier', label: 'Cashier' },
    { value: 'monitoring', label: 'Monitoring' }
  ];

  const roleLabel = (role) => roles.find((item) => item.value === role)?.label || 'Not Assigned';
  const workstationLabel = (id) => workstations.find((station) => station.id === id)?.name || 'Staff Page';
  const staffForWorkstation = (id) => staffList.find((staff) => staff.staffPerson === id);
  const finishedStatuses = ['Delivered', 'Cancelled'];
  const activeAssignableOrders = orders.filter((order) => !order.assignedTo && !finishedStatuses.includes(order.status));
  const orderPlace = (order) => {
    if (order.orderType === 'dine-in') {
      return order.tableNumber ? `Dine-in - Table ${order.tableNumber}` : 'Dine-in';
    }
    if (order.orderType === 'delivery') {
      return order.deliveryAddress ? `Delivery - ${order.deliveryAddress}` : 'Delivery';
    }
    return 'Takeaway counter';
  };
  const routeMapUrl = (order) => {
    if (!deliverySettings.latitude || !deliverySettings.longitude || !order.customerLatitude || !order.customerLongitude) {
      return '';
    }
    return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${deliverySettings.latitude}%2C${deliverySettings.longitude}%3B${order.customerLatitude}%2C${order.customerLongitude}`;
  };

  // Fetch orders
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch staff
  const fetchStaff = async () => {
    try {
      const response = await axios.get('/api/staff/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStaffList(response.data.data || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchWorkstations = async () => {
    try {
      const response = await axios.get('/api/staff/workstations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWorkstations(response.data.data?.workstations || []);
    } catch (error) {
      console.error('Error fetching staff work pages:', error);
    }
  };

  const fetchInventory = async () => {
    try {
      setInventoryLoading(true);
      const response = await axios.get('/api/admin/inventory', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInventory(response.data.data?.rawMaterials || []);
      setInventoryDirtyIds(new Set());
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setInventoryLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setProductsLoading(true);
      const response = await axios.get('/api/products');
      setProducts(response.data.data?.products || []);
      setProductDirtyIds(new Set());
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchContactSubmissions = async () => {
    try {
      const response = await axios.get('/api/contact', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContactSubmissions(response.data.data?.submissions || []);
    } catch (error) {
      console.error('Error fetching contact submissions:', error);
    }
  };

  const fetchSystemHealth = async () => {
    try {
      const response = await axios.get('/api/health');
      setSystemHealth(response.data);
    } catch (error) {
      setSystemHealth({ status: 'ERROR', message: error.message });
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await axios.get('/api/invoices', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInvoices(response.data.data?.invoices || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const fetchDeliverySettings = async () => {
    try {
      const response = await axios.get('/api/admin/delivery-settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeliverySettings(response.data.data?.settings || deliverySettings);
    } catch (error) {
      console.error('Error fetching delivery settings:', error);
    }
  };

  useEffect(() => {
    if (token) {
      fetchOrders();
      fetchStaff();
      fetchWorkstations();
      fetchInventory();
      fetchProducts();
      fetchContactSubmissions();
      fetchSystemHealth();
      fetchInvoices();
    }
  }, [token]);

  useEffect(() => {
    if (!token) return undefined;
    const interval = setInterval(() => {
      fetchOrders();
    }, 5000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (activeSection === 'inventory' && token) {
      fetchInventory();
    }
    if (activeSection === 'products' && token) {
      fetchProducts();
    }
    if (activeSection === 'settings' && token) {
      fetchContactSubmissions();
      fetchSystemHealth();
      fetchDeliverySettings();
    }
    if (activeSection === 'invoices' && token) {
      fetchInvoices();
    }
  }, [activeSection, token]);

  // Assign order to staff
  const handleAssignOrder = async () => {
    const stationStaff = staffForWorkstation(selectedPerson);
    if (!selectedOrder || !stationStaff || !selectedPerson) {
      alert('Please select order and staff page');
      return;
    }

    try {
      await axios.patch(`/api/orders/${selectedOrder._id}/assign`, {
        assignedTo: stationStaff._id,
        assignedRole: selectedRole,
        assignedPerson: selectedPerson
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowAssignModal(false);
      setSelectedOrder(null);
      setSelectedStaff(null);
      setSelectedPerson('');
      fetchOrders();
      alert('Order assigned successfully!');
    } catch (error) {
      console.error('Error assigning order:', error);
      alert('Failed to assign order');
    }
  };

  const orderViewFilters = {
    active: (order) => !finishedStatuses.includes(order.status),
    delivered: (order) => order.status === 'Delivered',
    cancelled: (order) => order.status === 'Cancelled',
    all: () => true
  };
  const viewOrders = orders.filter(orderViewFilters[orderView] || orderViewFilters.active);
  const filteredOrders = filterStatus === 'all'
    ? viewOrders
    : viewOrders.filter(o => o.status === filterStatus);
  const orderViewTabs = [
    { value: 'active', label: 'Active Orders', count: orders.filter(orderViewFilters.active).length },
    { value: 'delivered', label: 'Delivered History', count: orders.filter(orderViewFilters.delivered).length },
    { value: 'cancelled', label: 'Cancelled', count: orders.filter(orderViewFilters.cancelled).length },
    { value: 'all', label: 'All Orders', count: orders.length }
  ];

  const inventoryCategories = ['All', ...Array.from(new Set(inventory.map((item) => item.category || 'General'))).sort()];
  const filteredInventory = inventory.filter((item) => {
    const matchesCategory = inventoryCategory === 'All' || item.category === inventoryCategory;
    const matchesSearch = item.name.toLowerCase().includes(inventorySearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  const lowStockCount = inventory.filter((item) => Number(item.quantity) <= Number(item.minThreshold)).length;

  const handleInventoryFieldChange = (itemId, field, value) => {
    setInventory((items) =>
      items.map((item) => item._id === itemId ? { ...item, [field]: value } : item)
    );
    setInventoryDirtyIds((current) => new Set(current).add(itemId));
  };

  const handleProductFieldChange = (productId, field, value) => {
    setProducts((items) =>
      items.map((item) => item._id === productId ? { ...item, [field]: value } : item)
    );
    setProductDirtyIds((current) => new Set(current).add(productId));
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    if (status === 'Cancelled' && !window.confirm('Cancel this order?')) {
      return;
    }

    try {
      await axios.patch(`/api/orders/${orderId}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    }
  };

  const openAssignForWorkstation = (station) => {
    setSelectedStaff(staffForWorkstation(station.id) || null);
    setSelectedRole(station.role || 'chef');
    setSelectedPerson(station.id);
    setSelectedOrder(null);
    setShowAssignModal(true);
  };

  const handleSaveInventoryChanges = async () => {
    const changedItems = inventory.filter((item) => inventoryDirtyIds.has(item._id));
    if (changedItems.length === 0) return;

    try {
      setInventorySaving(true);
      await Promise.all(changedItems.map((item) =>
        axios.patch(`/api/admin/inventory/${item._id}`, {
          quantity: Number(item.quantity),
          unit: item.unit,
          minThreshold: Number(item.minThreshold),
          costPerUnit: Number(item.costPerUnit),
          category: item.category
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ));
      setInventoryDirtyIds(new Set());
      fetchInventory();
    } catch (error) {
      console.error('Error saving inventory changes:', error);
      alert('Failed to update inventory changes');
    } finally {
      setInventorySaving(false);
    }
  };

  const handleSaveProductChanges = async () => {
    const changedProducts = products.filter((product) => productDirtyIds.has(product._id));
    if (changedProducts.length === 0) return;

    try {
      setProductsSaving(true);
      await Promise.all(changedProducts.map((product) =>
        axios.patch(`/api/products/${product._id}`, {
          price: Number(product.price),
          stock: Number(product.stock),
          lowStockThreshold: Number(product.lowStockThreshold),
          inStock: Boolean(product.inStock)
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ));
      setProductDirtyIds(new Set());
      fetchProducts();
    } catch (error) {
      console.error('Error saving product changes:', error);
      alert('Failed to update product changes');
    } finally {
      setProductsSaving(false);
    }
  };

  const handleUpdateStaffRole = async (staffId, staffRole) => {
    try {
      await axios.patch(`/api/admin/users/${staffId}/staff-role`, {
        staffRole
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchStaff();
    } catch (error) {
      console.error('Error updating staff role:', error);
      alert('Failed to update staff role');
    }
  };

  const handleContactAction = async (id, action) => {
    try {
      if (action === 'delete') {
        if (!window.confirm('Delete this message?')) return;
        await axios.delete(`/api/contact/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.patch(`/api/contact/${id}/${action}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      fetchContactSubmissions();
    } catch (error) {
      console.error('Error updating contact message:', error);
      alert('Unable to update message');
    }
  };

  const handleDeliverySettingChange = (field, value) => {
    setDeliverySettings((settings) => ({ ...settings, [field]: value }));
  };

  const handleSaveDeliverySettings = async () => {
    try {
      await axios.patch('/api/admin/delivery-settings', deliverySettings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDeliverySettings();
      alert('Delivery settings saved');
    } catch (error) {
      console.error('Error saving delivery settings:', error);
      alert('Unable to save delivery settings');
    }
  };

  const staffByRole = roles.map((role) => ({
    ...role,
    count: workstations.filter((station) => station.role === role.value).length
  }));

  const downloadReport = async (path, filename) => {
    try {
      const separator = path.includes('?') ? '&' : '?';
      const dateQuery = [
        reportStartDate ? `startDate=${reportStartDate}` : '',
        reportEndDate ? `endDate=${reportEndDate}` : ''
      ].filter(Boolean).join('&');
      const reportPath = dateQuery ? `${path}${separator}${dateQuery}` : path;
      const response = await axios.get(reportPath, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Unable to download report');
    }
  };

  const printInvoicePdf = async (invoiceId) => {
    try {
      const response = await axios.get(`/api/invoices/${invoiceId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 30000);
    } catch (error) {
      console.error('Error printing invoice:', error);
      alert('Unable to open invoice PDF');
    }
  };

  const productStats = {
    total: products.length,
    inStock: products.filter((product) => product.inStock).length,
    lowStock: products.filter((product) => Number(product.stock) <= Number(product.lowStockThreshold)).length
  };

  return (
    <AdminLayout activeSection={activeSection} onSectionChange={setActiveSection}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-sm text-gray-400 mt-1 capitalize">{activeSection} management</p>
          </div>
          <button
            onClick={() => {
              fetchOrders();
              fetchInventory();
            }}
            className="flex items-center gap-2 bg-red-700 hover:bg-red-800 px-4 py-2 rounded-lg text-white transition"
          >
            <RefreshCw size={18} /> Refresh
          </button>
        </div>

        {/* Analytics Section */}
        {(activeSection === 'dashboard' || activeSection === 'analytics') && <AdminAnalytics orders={orders} />}

        {activeSection === 'master' && <MasterManagement />}

        {activeSection === 'staff' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
              {staffByRole.map((role) => (
                <div key={role.value} className="glass-card p-4 rounded-lg">
                  <p className="text-sm text-gray-400">{role.label}</p>
                  <p className="text-3xl font-black text-white mt-1">{role.count}</p>
                </div>
              ))}
            </div>

            <div className="glass-card p-5 rounded-lg">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-2xl font-bold text-white">Staff Management</h2>
                  <p className="text-sm text-gray-400">One staff login, separate work pages for each counter person.</p>
                </div>
                <button
                  onClick={fetchStaff}
                  className="inline-flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg"
                >
                  <RefreshCw size={16} /> Refresh Staff
                </button>
              </div>

              {workstations.length === 0 ? (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 text-center text-gray-400">
                  No staff work pages found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left">
                    <thead className="border-b border-zinc-800 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="py-3 pr-4">Page</th>
                        <th className="py-3 pr-4">Role</th>
                        <th className="py-3 pr-4">Orders Assigned</th>
                        <th className="py-3 pr-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {workstations.map((station) => {
                        const assignedCount = orders.filter((order) =>
                          order.assignedPerson === station.id && !finishedStatuses.includes(order.status)
                        ).length;
                        return (
                          <tr key={station.id} className="text-sm">
                            <td className="py-3 pr-4 font-bold text-white">{station.name}</td>
                            <td className="py-3 pr-4 text-gray-300">{station.roleLabel}</td>
                            <td className="py-3 pr-4 text-gray-300">{assignedCount}</td>
                            <td className="py-3 pr-4">
                              <button
                                onClick={() => openAssignForWorkstation(station)}
                                className="rounded bg-red-700 px-3 py-2 text-xs font-bold text-white hover:bg-red-800"
                              >
                                Assign Order
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Orders Section */}
        {activeSection === 'orders' && <div className="glass-card p-6 rounded-lg">
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <h2 className="text-2xl font-bold text-white">Orders Management</h2>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-wrap gap-2">
                {orderViewTabs.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => {
                      setOrderView(tab.value);
                      setFilterStatus('all');
                    }}
                    className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                      orderView === tab.value
                        ? 'bg-red-700 text-white'
                        : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-zinc-700 text-white px-4 py-2 rounded-lg"
              >
                <option value="all">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Preparing">Preparing</option>
                <option value="Packed">Packed</option>
                <option value="Ready">Ready</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {loading ? (
            <p className="text-gray-400">Loading orders...</p>
          ) : filteredOrders.length === 0 ? (
            <p className="text-gray-400">No orders found</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredOrders.map(order => (
                <div key={order._id} className="bg-zinc-800 rounded-lg p-4 border border-red-900">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-400">Order ID: {order._id?.substring(0, 8)}</p>
                        <p className="text-lg font-bold text-white">{order.user?.name || order.guestName || 'Customer'}</p>
                      </div>
                      <span className={`px-3 py-1 rounded text-xs font-bold ${
                        order.status === 'Delivered' ? 'bg-green-900 text-green-200' :
                        ['Packed', 'Ready', 'Shipped'].includes(order.status) ? 'bg-blue-900 text-blue-200' :
                        order.status === 'Preparing' ? 'bg-yellow-900 text-yellow-200' :
                        'bg-red-900 text-red-200'
                      }`}>
                        {order.status}
                      </span>
                    </div>

                    <div className="border-t border-zinc-700 pt-2">
                      <p className="text-sm text-gray-300">Items: {order.items?.length || 0}</p>
                      <p className="text-sm text-gray-300">Place: {orderPlace(order)}</p>
                      <p className="text-lg font-bold text-white">Rs. {order.totalAmount}</p>
                      <p className={`text-xs font-bold ${
                        order.paymentStatus === 'Paid' ? 'text-green-400' : 'text-yellow-400'
                      }`}>
                        {order.paymentStatus}
                      </p>
                    </div>

                    {order.orderType === 'delivery' && (
                      <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3">
                        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
                          <MapPin size={16} className="text-red-300" />
                          Delivery Route
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs text-gray-300">
                          <p>Address: <span className="text-white">{order.deliveryAddress || order.customerAddress?.fullAddress || 'Not provided'}</span></p>
                          <p>Distance: <span className="text-white">{order.distanceKm ?? '-'} KM</span></p>
                          <p>Estimated Time: <span className="text-white">{order.estimatedTime ?? '-'} Minutes</span></p>
                          <p>Delivery Charge: <span className="text-white">Rs. {order.deliveryCharge || 0}</span></p>
                          <p className="col-span-2">
                            Delivery: <span className={order.deliveryAvailable ? 'text-green-300' : 'text-red-300'}>{order.deliveryServiceStatus || (order.deliveryAvailable ? 'Available' : 'Not Available')}</span>
                          </p>
                        </div>
                        <div className="mt-3 h-20 rounded border border-zinc-700 bg-zinc-950 p-3">
                          <div className="relative h-full">
                            <span className="absolute left-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-red-400" title="SR Bakery" />
                            <span className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-green-400" title="Customer" />
                            <span className="absolute left-3 right-3 top-1/2 h-0.5 -translate-y-1/2 bg-gradient-to-r from-red-400 to-green-400" />
                            <span className="absolute left-0 top-0 text-[10px] text-gray-400">SR Bakery</span>
                            <span className="absolute right-0 bottom-0 text-[10px] text-gray-400">Customer</span>
                          </div>
                        </div>
                        {routeMapUrl(order) && (
                          <a href={routeMapUrl(order)} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-bold text-red-300 hover:text-red-200">
                            Open route in OpenStreetMap
                          </a>
                        )}
                      </div>
                    )}

                    {order.assignedTo ? (
                      <div className="bg-zinc-900 p-2 rounded text-sm">
                        <p className="text-gray-400">Assigned to: <span className="text-white font-bold">{workstationLabel(order.assignedPerson)}</span></p>
                        <p className="text-gray-400">Role: <span className="text-red-400 font-bold">{roleLabel(order.assignedRole)}</span></p>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowAssignModal(true);
                        }}
                        className="w-full bg-red-700 hover:bg-red-800 text-white py-2 rounded-lg font-bold transition"
                      >
                        Assign Order
                      </button>
                    )}

                    {['Packed', 'Ready'].includes(order.status) && (
                      <button
                        onClick={() => handleUpdateOrderStatus(order._id, 'Shipped')}
                        className="w-full rounded-lg bg-blue-700 py-3 font-bold text-white transition hover:bg-blue-800"
                      >
                        Mark Shipped
                      </button>
                    )}

                    {order.status === 'Shipped' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(order._id, 'Delivered')}
                        className="w-full rounded-lg bg-green-700 py-3 font-bold text-white transition hover:bg-green-800"
                      >
                        Mark Delivered
                      </button>
                    )}

                    {!finishedStatuses.includes(order.status) && (
                      <button
                        onClick={() => handleUpdateOrderStatus(order._id, 'Cancelled')}
                        className="w-full rounded-lg border border-red-800 bg-zinc-900 py-3 font-bold text-red-200 transition hover:bg-red-950"
                      >
                        Cancel Order
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>}

        {activeSection === 'inventory' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-card p-4 rounded-lg">
                <p className="text-sm text-gray-400">Inventory Items</p>
                <p className="text-3xl font-black text-white mt-1">{inventory.length}</p>
              </div>
              <div className="glass-card p-4 rounded-lg">
                <p className="text-sm text-gray-400">Categories</p>
                <p className="text-3xl font-black text-white mt-1">{inventoryCategories.length - 1}</p>
              </div>
              <div className="glass-card p-4 rounded-lg border-red-700">
                <div className="flex items-center gap-2 text-yellow-300">
                  <AlertTriangle size={18} />
                  <p className="text-sm font-bold">Low Stock</p>
                </div>
                <p className="text-3xl font-black text-white mt-1">{lowStockCount}</p>
              </div>
            </div>

            <div className="glass-card p-5 rounded-lg">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-2xl font-bold text-white">Inventory Management</h2>
                  <p className="text-sm text-gray-400">Ingredients, cooking essentials, and packaging materials.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 text-gray-500" size={17} />
                    <input
                      value={inventorySearch}
                      onChange={(event) => setInventorySearch(event.target.value)}
                      placeholder="Search inventory"
                      className="bg-zinc-900 text-white border border-zinc-700 rounded-lg py-2 pl-10 pr-3 w-full sm:w-64"
                    />
                  </div>
                  <select
                    value={inventoryCategory}
                    onChange={(event) => setInventoryCategory(event.target.value)}
                    className="bg-zinc-900 text-white border border-zinc-700 rounded-lg px-3 py-2"
                  >
                    {inventoryCategories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>

              {inventoryLoading ? (
                <p className="text-gray-400">Loading inventory...</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[880px] text-left">
                    <thead className="text-xs uppercase text-gray-500 border-b border-zinc-800">
                      <tr>
                        <th className="py-3 pr-4">Item</th>
                        <th className="py-3 pr-4">Category</th>
                        <th className="py-3 pr-4">Qty</th>
                        <th className="py-3 pr-4">Unit</th>
                        <th className="py-3 pr-4">Min</th>
                        <th className="py-3 pr-4">Cost</th>
                        <th className="py-3 pr-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {filteredInventory.map((item) => {
                        const quantity = Number(item.quantity);
                        const threshold = Number(item.minThreshold);
                        const stockStatus = quantity <= Math.max(1, threshold / 2)
                          ? { label: 'Critical Stock', className: 'bg-red-900 text-red-200' }
                          : quantity <= threshold
                            ? { label: 'Getting Low', className: 'bg-yellow-900 text-yellow-200' }
                            : { label: 'Stock Available', className: 'bg-green-900 text-green-200' };
                        return (
                          <tr key={item._id} className="text-sm">
                            <td className="py-3 pr-4 font-bold text-white">{item.name}</td>
                            <td className="py-3 pr-4 text-gray-300">{item.category || 'General'}</td>
                            <td className="py-3 pr-4">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(event) => handleInventoryFieldChange(item._id, 'quantity', event.target.value)}
                                className="w-24 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white"
                              />
                            </td>
                            <td className="py-3 pr-4">
                              <input
                                value={item.unit}
                                onChange={(event) => handleInventoryFieldChange(item._id, 'unit', event.target.value)}
                                className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white"
                              />
                            </td>
                            <td className="py-3 pr-4">
                              <input
                                type="number"
                                value={item.minThreshold}
                                onChange={(event) => handleInventoryFieldChange(item._id, 'minThreshold', event.target.value)}
                                className="w-24 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white"
                              />
                            </td>
                            <td className="py-3 pr-4">
                              <input
                                type="number"
                                value={item.costPerUnit}
                                onChange={(event) => handleInventoryFieldChange(item._id, 'costPerUnit', event.target.value)}
                                className="w-24 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white"
                              />
                            </td>
                            <td className="py-3 pr-4">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${stockStatus.className}`}>
                                {stockStatus.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredInventory.length === 0 && (
                    <p className="text-center text-gray-400 py-8">No inventory items found.</p>
                  )}
                </div>
              )}
              <div className="mt-5 flex justify-end border-t border-zinc-800 pt-4">
                <button
                  onClick={handleSaveInventoryChanges}
                  disabled={inventorySaving || inventoryDirtyIds.size === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-700 px-5 py-3 font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-gray-500"
                >
                  <Save size={16} /> {inventorySaving ? 'Saving...' : `Save Inventory Changes${inventoryDirtyIds.size ? ` (${inventoryDirtyIds.size})` : ''}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'products' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="glass-card rounded-lg p-4">
                <p className="text-sm text-gray-400">Menu Items</p>
                <p className="mt-1 text-3xl font-black text-white">{productStats.total}</p>
              </div>
              <div className="glass-card rounded-lg p-4">
                <p className="text-sm text-gray-400">In Stock</p>
                <p className="mt-1 text-3xl font-black text-white">{productStats.inStock}</p>
              </div>
              <div className="glass-card rounded-lg border-red-700 p-4">
                <p className="text-sm text-gray-400">Low Stock</p>
                <p className="mt-1 text-3xl font-black text-white">{productStats.lowStock}</p>
              </div>
            </div>

            <div className="glass-card rounded-lg p-5">
              <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Products Management</h2>
                  <p className="text-sm text-gray-400">Live menu products from the database.</p>
                </div>
                <button
                  onClick={fetchProducts}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-white hover:bg-zinc-700"
                >
                  <RefreshCw size={16} /> Refresh Products
                </button>
              </div>

              {productsLoading ? (
                <p className="text-gray-400">Loading products...</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-left">
                    <thead className="border-b border-zinc-800 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="py-3 pr-4">Product</th>
                        <th className="py-3 pr-4">Category</th>
                        <th className="py-3 pr-4">Price</th>
                        <th className="py-3 pr-4">Stock</th>
                        <th className="py-3 pr-4">Low Stock At</th>
                        <th className="py-3 pr-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {products.map((product) => (
                        <tr key={product._id} className="text-sm">
                          <td className="py-3 pr-4 font-bold text-white">{product.name}</td>
                          <td className="py-3 pr-4 text-gray-300">{product.category}</td>
                          <td className="py-3 pr-4">
                            <input
                              type="number"
                              value={product.price}
                              onChange={(event) => handleProductFieldChange(product._id, 'price', event.target.value)}
                              className="w-24 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-white"
                            />
                          </td>
                          <td className="py-3 pr-4">
                            <input
                              type="number"
                              value={product.stock}
                              onChange={(event) => handleProductFieldChange(product._id, 'stock', event.target.value)}
                              className="w-24 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-white"
                            />
                          </td>
                          <td className="py-3 pr-4">
                            <input
                              type="number"
                              value={product.lowStockThreshold}
                              onChange={(event) => handleProductFieldChange(product._id, 'lowStockThreshold', event.target.value)}
                              className="w-24 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-white"
                            />
                          </td>
                          <td className="py-3 pr-4">
                            <select
                              value={product.inStock ? 'true' : 'false'}
                              onChange={(event) => handleProductFieldChange(product._id, 'inStock', event.target.value === 'true')}
                              className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-white"
                            >
                              <option value="true">Available</option>
                              <option value="false">Out</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {products.length === 0 && (
                    <p className="py-8 text-center text-gray-400">No products found in the database.</p>
                  )}
                </div>
              )}
              <div className="mt-5 flex justify-end border-t border-zinc-800 pt-4">
                <button
                  onClick={handleSaveProductChanges}
                  disabled={productsSaving || productDirtyIds.size === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-700 px-5 py-3 font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-gray-500"
                >
                  <Save size={16} /> {productsSaving ? 'Saving...' : `Save Product Changes${productDirtyIds.size ? ` (${productDirtyIds.size})` : ''}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'invoices' && (
          <div className="glass-card rounded-lg p-5">
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Invoice History</h2>
                <p className="text-sm text-gray-400">All generated bills, payment status, GST totals, and reprints.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={fetchInvoices}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-white hover:bg-zinc-700"
                >
                  <RefreshCw size={16} /> Refresh
                </button>
                <button
                  onClick={() => downloadReport('/api/invoices/export/history.xlsx', 'invoice-history.xlsx')}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-2 font-bold text-white hover:bg-red-800"
                >
                  <Download size={16} /> Export History
                </button>
              </div>
            </div>

            {invoices.length === 0 ? (
              <p className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 text-center text-gray-400">
                No invoices found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left">
                  <thead className="border-b border-zinc-800 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="py-3 pr-4">Invoice</th>
                      <th className="py-3 pr-4">Order</th>
                      <th className="py-3 pr-4">Customer</th>
                      <th className="py-3 pr-4">Subtotal</th>
                      <th className="py-3 pr-4">Tax</th>
                      <th className="py-3 pr-4">Discount</th>
                      <th className="py-3 pr-4">Total</th>
                      <th className="py-3 pr-4">Payment</th>
                      <th className="py-3 pr-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {invoices.map((invoice) => (
                      <tr key={invoice._id} className="text-sm">
                        <td className="py-3 pr-4 font-bold text-white">{invoice.invoiceNumber}</td>
                        <td className="py-3 pr-4 text-gray-300">#{invoice.orderNumber}</td>
                        <td className="py-3 pr-4 text-gray-300">{invoice.customer?.name || 'Customer'}</td>
                        <td className="py-3 pr-4 text-gray-300">Rs. {invoice.subtotal}</td>
                        <td className="py-3 pr-4 text-gray-300">Rs. {invoice.tax}</td>
                        <td className="py-3 pr-4 text-gray-300">Rs. {invoice.discount}</td>
                        <td className="py-3 pr-4 font-black text-white">Rs. {invoice.totalAmount}</td>
                        <td className="py-3 pr-4">
                          <span className={`rounded px-2 py-1 text-xs font-bold ${invoice.paymentStatus === 'Paid' ? 'bg-green-900 text-green-200' : 'bg-yellow-900 text-yellow-200'}`}>
                            {invoice.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <button
                            onClick={() => printInvoicePdf(invoice._id)}
                            className="inline-flex items-center gap-2 rounded bg-zinc-800 px-3 py-2 text-xs font-bold text-white hover:bg-zinc-700"
                          >
                            <Printer size={15} /> Reprint
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeSection === 'reports' && (
          <div className="glass-card rounded-lg p-5">
            <h2 className="text-2xl font-bold text-white">Reports</h2>
            <p className="mt-1 text-sm text-gray-400">Generated from live orders, products, staff, inventory, and customers.</p>
            <div className="mt-5 grid grid-cols-1 gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4 md:grid-cols-[1fr_1fr_auto]">
              <input type="date" value={reportStartDate} onChange={(event) => setReportStartDate(event.target.value)} className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white" />
              <input type="date" value={reportEndDate} onChange={(event) => setReportEndDate(event.target.value)} className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white" />
              <button onClick={() => { setReportStartDate(''); setReportEndDate(''); }} className="rounded bg-zinc-800 px-4 py-2 font-bold text-white hover:bg-zinc-700">
                Clear Dates
              </button>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[
                { label: 'Daily Sales PDF', path: '/api/reports/sales/pdf?period=daily', file: 'daily-sales-report.pdf' },
                { label: 'Weekly Sales Excel', path: '/api/reports/sales/excel?period=weekly', file: 'weekly-sales-report.xlsx' },
                { label: 'Monthly Sales Excel', path: '/api/reports/sales/excel?period=monthly', file: 'monthly-sales-report.xlsx' },
                { label: 'Product Sales Excel', path: '/api/reports/product-sales/excel', file: 'product-sales-report.xlsx' },
                { label: 'Inventory Excel', path: '/api/reports/inventory/excel', file: 'inventory-report.xlsx' },
                { label: 'Customer Excel', path: '/api/reports/customers/excel', file: 'customers-report.xlsx' }
              ].map((report) => (
                <button
                  key={report.path}
                  onClick={() => downloadReport(report.path, report.file)}
                  className="flex min-h-24 items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-left text-white transition hover:border-red-700 hover:bg-zinc-900"
                >
                  <span className="font-bold">{report.label}</span>
                  <Download className="text-red-300" size={20} />
                </button>
              ))}
            </div>
          </div>
        )}

        {(activeSection === 'settings' || activeSection === 'messages') && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="glass-card rounded-lg p-4">
                <p className="text-sm text-gray-400">Backend Status</p>
                <p className="mt-1 text-2xl font-black text-white">{systemHealth?.status || 'Checking'}</p>
              </div>
              <div className="glass-card rounded-lg p-4">
                <p className="text-sm text-gray-400">Unread Messages</p>
                <p className="mt-1 text-2xl font-black text-white">
                  {contactSubmissions.filter((item) => item.status === 'new').length}
                </p>
              </div>
              <div className="glass-card rounded-lg p-4">
                <p className="text-sm text-gray-400">Saved Feedback</p>
                <p className="mt-1 text-2xl font-black text-white">
                  {contactSubmissions.filter((item) => item.kind === 'feedback').length}
                </p>
              </div>
            </div>

            {activeSection === 'settings' && (
              <div className="glass-card rounded-lg p-5">
                <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Delivery Location Settings</h2>
                    <p className="text-sm text-gray-400">Distance, service area, ETA, and delivery charges start from this bakery location.</p>
                  </div>
                  <button
                    onClick={handleSaveDeliverySettings}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-2 font-bold text-white hover:bg-red-800"
                  >
                    <Save size={16} /> Save Location
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <label className="text-sm text-gray-400">
                    Bakery Name
                    <input value={deliverySettings.name || ''} onChange={(event) => handleDeliverySettingChange('name', event.target.value)} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white" />
                  </label>
                  <label className="text-sm text-gray-400">
                    Latitude
                    <input type="number" step="0.000001" value={deliverySettings.latitude || ''} onChange={(event) => handleDeliverySettingChange('latitude', event.target.value)} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white" />
                  </label>
                  <label className="text-sm text-gray-400">
                    Longitude
                    <input type="number" step="0.000001" value={deliverySettings.longitude || ''} onChange={(event) => handleDeliverySettingChange('longitude', event.target.value)} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white" />
                  </label>
                  <label className="text-sm text-gray-400">
                    Max Radius KM
                    <input type="number" value={deliverySettings.maxRadiusKm || ''} onChange={(event) => handleDeliverySettingChange('maxRadiusKm', event.target.value)} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white" />
                  </label>
                  <label className="text-sm text-gray-400">
                    Speed KM/H
                    <input type="number" value={deliverySettings.baseSpeedKmph || ''} onChange={(event) => handleDeliverySettingChange('baseSpeedKmph', event.target.value)} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white" />
                  </label>
                </div>
                <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-gray-300">
                  <p className="font-bold text-white">Delivery slabs</p>
                  <p className="mt-1">0-5 KM: Free | 5-15 KM: Rs. 30 | 15-30 KM: Rs. 60 | 30-50 KM: Rs. 100 | 50-70 KM: Rs. 150 | Above {deliverySettings.maxRadiusKm || 70} KM: Not available</p>
                </div>
              </div>
            )}

            <div className="glass-card rounded-lg p-5">
              <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Messages & Feedback</h2>
                  <p className="text-sm text-gray-400">Live submissions from the contact page.</p>
                </div>
                <button
                  onClick={() => {
                    fetchContactSubmissions();
                    fetchSystemHealth();
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-white hover:bg-zinc-700"
                >
                  <RefreshCw size={16} /> Refresh Settings
                </button>
              </div>

              {contactSubmissions.length === 0 ? (
                <p className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 text-center text-gray-400">
                  No contact submissions yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {contactSubmissions.map((item) => (
                    <article key={item._id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-red-300">
                            {item.kind}{item.rating ? ` - ${item.rating} stars` : ''}
                          </p>
                          <h3 className="mt-1 font-bold text-white">{item.name}</h3>
                          {item.subject && <p className="text-sm font-bold text-gray-200">{item.subject}</p>}
                          {item.email && <p className="text-sm text-gray-400">{item.email}</p>}
                          {item.phone && <p className="text-sm text-gray-400">{item.phone}</p>}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`w-fit rounded px-2 py-1 text-xs font-bold ${item.status === 'new' ? 'bg-yellow-900 text-yellow-200' : 'bg-green-900 text-green-200'}`}>
                            {item.status}
                          </span>
                          <button onClick={() => handleContactAction(item._id, item.status === 'new' ? 'read' : 'unread')} className="rounded bg-zinc-800 px-2 py-1 text-xs font-bold text-white hover:bg-zinc-700">
                            Mark {item.status === 'new' ? 'Read' : 'Unread'}
                          </button>
                          <button onClick={() => handleContactAction(item._id, 'delete')} className="rounded bg-red-950 px-2 py-1 text-xs font-bold text-red-200 hover:bg-red-900">
                            Delete
                          </button>
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-gray-300">{item.message}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-zinc-900 p-8 rounded-lg max-w-md w-full border border-red-900">
            <h3 className="text-2xl font-bold text-white mb-6">Assign Order</h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Select Order</label>
                <select
                  value={selectedOrder?._id || ''}
                  onChange={(e) => {
                    const order = orders.find((item) => item._id === e.target.value);
                    setSelectedOrder(order || null);
                  }}
                  className="w-full bg-zinc-800 text-white px-4 py-2 rounded-lg mt-2 border border-zinc-700"
                >
                  <option value="">-- Select Order --</option>
                  {activeAssignableOrders.map((order) => (
                    <option key={order._id} value={order._id}>
                      #{order._id.slice(-6)} - {order.user?.name || order.guestName || 'Customer'} - {orderPlace(order)} - Rs. {order.totalAmount}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-400">Select Staff Page</label>
                <select
                  value={selectedPerson || ''}
                  onChange={(e) => {
                    const station = workstations.find((item) => item.id === e.target.value);
                    setSelectedPerson(station?.id || '');
                    setSelectedRole(station?.role || 'chef');
                    setSelectedStaff(staffForWorkstation(station?.id) || null);
                  }}
                  className="w-full bg-zinc-800 text-white px-4 py-2 rounded-lg mt-2 border border-zinc-700"
                >
                  <option value="">-- Select Staff Page --</option>
                  {workstations.map(station => (
                    <option key={station.id} value={station.id}>
                      {station.name} ({station.roleLabel}){staffForWorkstation(station.id) ? '' : ' - login missing'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-400">Assign Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full bg-zinc-800 text-white px-4 py-2 rounded-lg mt-2 border border-zinc-700"
                >
                  {roles.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-t border-zinc-700 pt-4 flex gap-3">
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedOrder(null);
                  }}
                  className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white py-2 rounded-lg font-bold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignOrder}
                  className="flex-1 bg-red-700 hover:bg-red-800 text-white py-2 rounded-lg font-bold transition"
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;

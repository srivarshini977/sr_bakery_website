import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Check, CreditCard, Minus, Plus, Printer, RefreshCw, Trash2 } from 'lucide-react';
import KDSQueue from '../components/KDSQueue';
import API from '../utils/api';

const StaffDashboard = () => {
  const { user, token } = useContext(AuthContext);
  const [assignedOrders, setAssignedOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('assigned');
  const [kdsList, setKdsList] = useState([]);
  const [kots, setKots] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [posCart, setPosCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [taxPercent, setTaxPercent] = useState(5);
  const [guestName, setGuestName] = useState('Walk-in Customer');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [billingOrder, setBillingOrder] = useState(null);
  const [billingInvoice, setBillingInvoice] = useState(null);
  const [dismissedTaskIds, setDismissedTaskIds] = useState([]);
  const [workstations, setWorkstations] = useState([]);

  const staffRole = user?.staffRole || 'staff';
  const isChef = staffRole === 'chef';
  const isCashier = staffRole === 'cashier' || user?.role === 'admin';
  const staffRoleLabel = {
    chef: 'Chef',
    tea_master: 'Tea Master',
    waiter: 'Waiter',
    cashier: 'Cashier',
    monitoring: 'Monitoring',
    staff: 'Staff'
  }[staffRole] || staffRole;
  const finishedStatuses = ['Packed', 'Ready', 'Shipped', 'Delivered', 'Cancelled'];
  const activeAssignedTasks = assignedOrders.filter((order) =>
    !finishedStatuses.includes(order.status)
  );
  const popupTasks = activeAssignedTasks.filter((order) => !dismissedTaskIds.includes(order._id));
  const workstationLabel = (id) => workstations.find((station) => station.id === id)?.name || 'Staff Page';
  const filteredAssignedOrders = assignedOrders;
  const orderPlace = (order) => {
    if (order.orderType === 'dine-in') {
      return order.tableNumber ? `Dine-in - Table ${order.tableNumber}` : 'Dine-in';
    }
    if (order.orderType === 'delivery') {
      return order.deliveryAddress ? `Delivery - ${order.deliveryAddress}` : 'Delivery';
    }
    return 'Takeaway counter';
  };

  const fetchAssignedOrders = async () => {
    if (isChef) return;
    try {
      setLoading(true);
      const response = await axios.get(`/api/staff/orders/assigned/${user?._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssignedOrders(response.data.data?.orders || response.data.data || []);
    } catch (error) {
      console.error('Error fetching assigned orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchKdsQueue = async () => {
    if (isChef) return;
    try {
      const response = await axios.get('/api/staff/kds/queue', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setKdsList(response.data.data?.orders || response.data.data || []);
    } catch (error) {
      console.error('Error fetching KDS queue:', error);
    }
  };

  const fetchKots = async () => {
    if (!isChef && user?.role !== 'admin') return;
    try {
      const response = await API.get('/staff/kots');
      setKots(response.data.data?.kots || []);
    } catch (error) {
      console.error('Error fetching KOTs:', error);
    }
  };

  const fetchInvoices = async () => {
    if (!isCashier) return;
    try {
      const response = await API.get('/invoices');
      setInvoices(response.data.data?.invoices || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const fetchWorkstations = async () => {
    try {
      const response = await axios.get('/api/staff/workstations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWorkstations(response.data.data?.workstations || []);
    } catch (error) {
      console.error('Error fetching staff pages:', error);
    }
  };

  useEffect(() => {
    if (token && user?._id) {
      if (isChef) {
        setSelectedTab('kot');
        fetchKots();
        fetchWorkstations();
        return;
      }
      if (isCashier) {
        setSelectedTab('invoices');
        fetchInvoices();
      }
      fetchAssignedOrders();
      fetchKdsQueue();
      fetchWorkstations();
    }
  }, [token, user?._id, staffRole]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await API.get('/products');
        setProducts(response.data.data?.products || []);
      } catch (error) {
        console.error('Error fetching products for POS:', error);
      }
    };
    if (!isChef) {
      fetchProducts();
    }
  }, [isChef]);

  const handleCompleteOrder = async (orderId) => {
    try {
      await axios.patch(`/api/staff/orders/${orderId}/status`, { status: 'Packed' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAssignedOrders();
      fetchKdsQueue();
      alert('Order marked as packed.');
    } catch (error) {
      console.error('Error completing order:', error);
      alert('Failed to update order');
    }
  };

  const handleUpdateKotStatus = async (kotId, status) => {
    try {
      await API.patch(`/staff/kots/${kotId}/status`, { status });
      fetchKots();
      alert(status === 'Packed' ? 'KOT marked packed' : 'KOT marked preparing');
    } catch (error) {
      console.error('Error updating KOT:', error);
      alert(error.response?.data?.message || 'Failed to update KOT');
    }
  };

  const addPosItem = (product) => {
    setPosCart((items) => {
      const existing = items.find((item) => item._id === product._id);
      if (existing) {
        return items.map((item) =>
          item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...items, { ...product, quantity: 1 }];
    });
  };

  const updatePosQty = (productId, delta) => {
    setPosCart((items) =>
      items
        .map((item) => item._id === productId ? { ...item, quantity: item.quantity + delta } : item)
        .filter((item) => item.quantity > 0)
    );
  };

  const subtotal = posCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryCharge = Number(billingOrder?.deliveryCharge || 0);
  const taxableAmount = Math.max(0, subtotal - Number(discount || 0));
  const taxAmount = Math.max(0, taxableAmount * (Number(taxPercent || 0) / 100));
  const cgstAmount = taxAmount / 2;
  const sgstAmount = taxAmount / 2;
  const total = Math.max(0, taxableAmount + taxAmount + deliveryCharge);

  const clearBilling = () => {
    setBillingOrder(null);
    setBillingInvoice(null);
    setPosCart([]);
    setDiscount(0);
    setGuestName('Walk-in Customer');
    setPaymentMethod('cash');
  };

  const printInvoicePdf = async (invoiceId) => {
    try {
      const response = await API.get(`/invoices/${invoiceId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 30000);
    } catch (error) {
      console.error('Error printing invoice:', error);
      alert(error.response?.data?.message || 'Unable to open invoice PDF');
    }
  };

  const updateInvoicePayment = async (invoiceId, paymentStatus) => {
    try {
      await API.patch(`/invoices/${invoiceId}/payment`, { paymentStatus, paymentMethod });
      fetchInvoices();
      alert('Invoice payment updated');
    } catch (error) {
      console.error('Error updating payment:', error);
      alert(error.response?.data?.message || 'Unable to update payment');
    }
  };

  const applyInvoiceDiscount = async (invoiceId) => {
    const value = window.prompt('Enter discount amount', '0');
    if (value === null) return;
    try {
      await API.patch(`/invoices/${invoiceId}/discount`, { discount: Number(value || 0) });
      fetchInvoices();
      alert('Discount applied');
    } catch (error) {
      console.error('Error applying discount:', error);
      alert(error.response?.data?.message || 'Unable to apply discount');
    }
  };

  const printBill = () => {
    if (posCart.length === 0) {
      alert('No receipt items to print');
      return;
    }

    const receiptNo = billingOrder?._id?.slice(-8).toUpperCase() || `POS-${Date.now().toString().slice(-8)}`;
    const printedAt = new Date().toLocaleString('en-IN');
    const itemRows = posCart.map((item) => `
      <tr>
        <td>${item.name}</td>
        <td class="center">${item.quantity}</td>
        <td class="right">Rs. ${Number(item.price).toFixed(2)}</td>
        <td class="right">Rs. ${(Number(item.price) * Number(item.quantity)).toFixed(2)}</td>
      </tr>
    `).join('');

    const billWindow = window.open('', '_blank', 'width=420,height=720');
    if (!billWindow) {
      alert('Please allow popups to print the bill');
      return;
    }

    billWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>SR Bakery Bill ${receiptNo}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 18px; color: #111; }
            .bill { max-width: 380px; margin: 0 auto; }
            h1 { margin: 0; text-align: center; font-size: 24px; }
            .sub { margin: 4px 0; text-align: center; font-size: 12px; }
            .meta { margin: 14px 0; border-top: 1px dashed #444; border-bottom: 1px dashed #444; padding: 10px 0; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { padding: 7px 3px; border-bottom: 1px solid #ddd; text-align: left; vertical-align: top; }
            .right { text-align: right; }
            .center { text-align: center; }
            .totals { margin-top: 12px; font-size: 13px; }
            .line { display: flex; justify-content: space-between; padding: 4px 0; }
            .grand { margin-top: 6px; border-top: 2px solid #111; padding-top: 8px; font-size: 18px; font-weight: 800; }
            .thanks { margin-top: 18px; text-align: center; font-size: 12px; }
            @media print { body { padding: 0; } .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="bill">
            <h1>SR BAKERY</h1>
            <p class="sub">Oddanchatram</p>
            <p class="sub">GSTIN: 33ATOPG4810D1Z3</p>
            <div class="meta">
              <div>Bill No: ${receiptNo}</div>
              <div>Date: ${printedAt}</div>
              <div>Customer: ${guestName || 'Walk-in Customer'}</div>
              <div>Payment: ${paymentMethod}</div>
              ${billingOrder ? `<div>Order: #${billingOrder._id?.slice(-6)}</div><div>Type: ${billingOrder.orderType || 'takeaway'}</div>` : ''}
            </div>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th class="center">Qty</th>
                  <th class="right">Rate</th>
                  <th class="right">Amt</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>
            <div class="totals">
              <div class="line"><span>Subtotal</span><span>Rs. ${subtotal.toFixed(2)}</span></div>
              <div class="line"><span>Discount</span><span>Rs. ${Number(discount || 0).toFixed(2)}</span></div>
              <div class="line"><span>Taxable Amount</span><span>Rs. ${taxableAmount.toFixed(2)}</span></div>
              <div class="line"><span>CGST ${(Number(taxPercent || 0) / 2).toFixed(2)}%</span><span>Rs. ${cgstAmount.toFixed(2)}</span></div>
              <div class="line"><span>SGST ${(Number(taxPercent || 0) / 2).toFixed(2)}%</span><span>Rs. ${sgstAmount.toFixed(2)}</span></div>
              ${deliveryCharge ? `<div class="line"><span>Delivery Charge</span><span>Rs. ${deliveryCharge.toFixed(2)}</span></div>` : ''}
              <div class="line grand"><span>Total</span><span>Rs. ${Math.round(total)}</span></div>
            </div>
            <p class="thanks">Thank you. Visit again!</p>
            <button class="no-print" onclick="window.print()" style="margin-top:16px;width:100%;padding:10px;">Print</button>
          </div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    billWindow.document.close();
  };

  const handleCreatePosOrder = async () => {
    if (posCart.length === 0) {
      alert('Add items before billing');
      return;
    }

    try {
      const response = await API.post('/orders', {
        guestName,
        items: posCart.map((item) => ({
          product: item._id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        totalAmount: Math.round(total),
        discountAmount: Number(discount || 0),
        paymentMethod,
        orderType: 'takeaway'
      });
      const createdOrder = response.data.data?.order;
      const createdInvoice = response.data.data?.invoice;
      setBillingOrder(createdOrder ? {
        ...createdOrder,
        items: createdOrder.items?.length ? createdOrder.items : posCart
      } : null);
      setBillingInvoice(createdInvoice || null);
      fetchInvoices();
      fetchKdsQueue();
      alert('POS bill created. You can print the receipt now.');
    } catch (error) {
      console.error('Error creating POS order:', error);
      alert(error.response?.data?.message || 'Failed to create POS bill');
    }
  };

  const staffTabs = isChef
    ? [{ id: 'kot', label: `KOT (${kots.length})` }]
    : [
      ...(isCashier ? [{ id: 'invoices', label: `Invoices (${invoices.length})` }, { id: 'pos', label: 'POS System' }] : []),
      { id: 'assigned', label: `Assigned Orders (${assignedOrders.length})` },
      { id: 'kds', label: `KDS (${kdsList.length})` }
    ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-red-950 p-4 md:p-6">
      <div className="mb-8 w-full">
        <div className="glass-card p-6 rounded-lg border border-red-900">
          <h1 className="text-3xl font-bold text-white">Staff Dashboard</h1>
          <p className="text-gray-400 mt-2">Welcome, <span className="text-red-400 font-bold">{user?.name}</span></p>
          <p className="text-sm text-gray-500">Role: <span className="text-red-300">{staffRoleLabel}</span></p>
        </div>
      </div>

      <div className="w-full">
        {!isChef && popupTasks.length > 0 && (
          <div className="mb-6 space-y-3">
            {popupTasks.map((order) => (
              <div key={order._id} className="glass-card rounded-lg border border-yellow-600 bg-yellow-950/40 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-widest text-yellow-300">New Assigned Work</p>
                    <h2 className="mt-1 text-xl font-black text-white">
                      Order #{order._id?.slice(-6)} assigned to {workstationLabel(order.assignedPerson)}
                    </h2>
                    <p className="mt-1 text-sm text-gray-300">
                      {order.items?.length || 0} items for {order.user?.name || order.guestName || 'Customer'}.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDismissedTaskIds((ids) => [...ids, order._id])}
                      className="rounded bg-zinc-800 px-4 py-2 text-sm font-bold text-white hover:bg-zinc-700"
                    >
                      Later
                    </button>
                    <button
                      onClick={() => handleCompleteOrder(order._id)}
                      className="rounded bg-green-700 px-4 py-2 text-sm font-bold text-white hover:bg-green-800"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 mb-6 flex-wrap">
          {staffTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`px-6 py-2 rounded-lg font-bold transition ${
                selectedTab === tab.id ? 'bg-red-700 text-white' : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={() => {
              if (isChef) {
                fetchKots();
              } else {
                fetchAssignedOrders();
                fetchKdsQueue();
                fetchInvoices();
              }
            }}
            className="ml-auto px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition flex items-center gap-2"
          >
            <RefreshCw size={18} /> Refresh
          </button>
        </div>

        {selectedTab === 'assigned' && (
          <div className="space-y-4">
            <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-gray-300">
              Assigned page: <span className="font-bold text-white">{workstationLabel(user?.staffPerson)}</span>
            </div>

            {loading ? (
              <p className="text-gray-400">Loading assigned orders...</p>
            ) : filteredAssignedOrders.length === 0 ? (
              <div className="glass-card p-8 rounded-lg text-center">
                <p className="text-gray-400 text-lg">No orders assigned yet</p>
              </div>
            ) : (
              filteredAssignedOrders.map((order) => (
                <div key={order._id} className="glass-card p-6 rounded-lg border border-red-900 hover:border-red-700 transition">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                    <div>
                      <p className="text-xs text-gray-500">Order ID</p>
                      <p className="text-lg font-bold text-white">{order._id?.substring(0, 8)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Customer</p>
                      <p className="text-white font-bold">{order.user?.name || order.guestName || 'Customer'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Items</p>
                      <p className="text-white font-bold">{order.items?.length || 0} items</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Place</p>
                      <p className="text-white font-bold">{orderPlace(order)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Page</p>
                      <p className="text-white font-bold">{workstationLabel(order.assignedPerson)}</p>
                    </div>
                    <span className={`px-3 py-1 rounded text-xs font-bold w-fit ${
                      ['Packed', 'Ready', 'Shipped'].includes(order.status) ? 'bg-green-900 text-green-200' :
                      order.status === 'Preparing' ? 'bg-yellow-900 text-yellow-200' :
                      'bg-red-900 text-red-200'
                    }`}>
                      {order.status}
                    </span>
                  </div>

                  <div className="mt-4 border-t border-zinc-700 pt-4 space-y-1">
                    {order.items?.map((item, idx) => (
                      <p key={idx} className="text-sm text-gray-300">{item.name} (x{item.quantity})</p>
                    ))}
                  </div>

                  {!['Packed', 'Ready', 'Shipped', 'Delivered', 'Cancelled'].includes(order.status) && (
                    <button
                      onClick={() => handleCompleteOrder(order._id)}
                      className="mt-4 w-full bg-green-700 hover:bg-green-800 text-white py-2 rounded-lg font-bold transition flex items-center justify-center gap-2"
                    >
                      <Check size={18} /> Done - Mark Packed
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {selectedTab === 'kds' && <KDSQueue />}

        {selectedTab === 'kot' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-gray-300">
              KOT shows only kitchen details. Prices, invoices, discounts, and payment information are hidden from chefs.
            </div>
            {kots.length === 0 ? (
              <div className="glass-card p-8 rounded-lg text-center">
                <p className="text-gray-400 text-lg">No kitchen tickets assigned</p>
              </div>
            ) : kots.map((kot) => (
              <div key={kot._id} className="glass-card rounded-lg border border-red-900 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-bakery-gold">Kitchen Order Ticket</p>
                    <h2 className="mt-1 text-2xl font-black text-white">{kot.kotNumber}</h2>
                    <p className="mt-1 text-sm text-gray-400">Order #{kot.orderNumber}</p>
                  </div>
                  <span className={`w-fit rounded px-3 py-1 text-xs font-bold ${
                    kot.status === 'Packed' ? 'bg-green-900 text-green-200' :
                    kot.status === 'Preparing' ? 'bg-yellow-900 text-yellow-200' :
                    'bg-red-900 text-red-200'
                  }`}>
                    {kot.status}
                  </span>
                </div>
                <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  {kot.items?.map((item, index) => (
                    <div key={`${item.name}-${index}`} className="flex justify-between gap-4 border-b border-zinc-800 py-2 text-sm last:border-b-0">
                      <span className="font-bold text-white">{item.name}</span>
                      <span className="text-bakery-gold">x{item.quantity}</span>
                    </div>
                  ))}
                </div>
                {kot.specialInstructions && (
                  <p className="mt-3 rounded border border-yellow-800 bg-yellow-950/40 p-3 text-sm text-yellow-100">
                    Note: {kot.specialInstructions}
                  </p>
                )}
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {kot.status === 'Pending' && (
                    <button onClick={() => handleUpdateKotStatus(kot._id, 'Preparing')} className="rounded-lg bg-yellow-700 py-3 font-bold text-white hover:bg-yellow-800">
                      Start Preparing
                    </button>
                  )}
                  {kot.status !== 'Packed' && (
                    <button onClick={() => handleUpdateKotStatus(kot._id, 'Packed')} className="rounded-lg bg-green-700 py-3 font-bold text-white hover:bg-green-800">
                      <Check className="mr-2 inline" size={18} /> Mark Packed
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedTab === 'invoices' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-bold text-white">Invoice History</h2>
              <button onClick={fetchInvoices} className="rounded bg-zinc-800 px-4 py-2 font-bold text-white hover:bg-zinc-700">
                Refresh Invoices
              </button>
            </div>
            {invoices.length === 0 ? (
              <div className="glass-card rounded-lg p-8 text-center text-gray-400">No invoices found.</div>
            ) : invoices.map((invoice) => (
              <div key={invoice._id} className="glass-card rounded-lg border border-red-900 p-5">
                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr_auto] lg:items-center">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-bakery-gold">Invoice</p>
                    <h3 className="mt-1 text-xl font-black text-white">{invoice.invoiceNumber}</h3>
                    <p className="mt-1 text-sm text-gray-400">Order #{invoice.orderNumber} | {invoice.customer?.name || 'Customer'}</p>
                  </div>
                  <div className="text-sm text-gray-300">
                    <p>Total: <span className="font-black text-white">Rs. {invoice.totalAmount}</span></p>
                    <p>Payment: <span className={invoice.paymentStatus === 'Paid' ? 'text-green-300' : 'text-yellow-300'}>{invoice.paymentStatus}</span></p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => printInvoicePdf(invoice._id)} className="inline-flex items-center gap-2 rounded bg-zinc-800 px-3 py-2 text-sm font-bold text-white hover:bg-zinc-700">
                      <Printer size={16} /> Print
                    </button>
                    <button onClick={() => applyInvoiceDiscount(invoice._id)} className="rounded bg-zinc-800 px-3 py-2 text-sm font-bold text-white hover:bg-zinc-700">
                      Discount
                    </button>
                    {invoice.paymentStatus !== 'Paid' && (
                      <button onClick={() => updateInvoicePayment(invoice._id, 'Paid')} className="rounded bg-green-700 px-3 py-2 text-sm font-bold text-white hover:bg-green-800">
                        Verify Paid
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedTab === 'pos' && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
            <div className="glass-card p-5 rounded-lg border border-red-900">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">POS Billing</h2>
                  {billingOrder && (
                    <p className="mt-1 text-sm text-green-300">
                      Billing completed order #{billingOrder._id?.slice(-6)}
                    </p>
                  )}
                </div>
                <CreditCard className="text-red-400" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[620px] overflow-y-auto pr-1">
                {products.map((product) => (
                  <button
                    key={product._id}
                    onClick={() => addPosItem(product)}
                    disabled={!product.inStock}
                    className="text-left bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed border border-zinc-800 hover:border-red-700 rounded-lg p-3 transition min-h-28"
                  >
                    <p className="text-sm font-bold text-white line-clamp-2">{product.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{product.category}</p>
                    <p className="text-lg font-black text-red-300 mt-3">Rs. {product.price}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-card p-5 rounded-lg border border-red-900 h-fit">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-xl font-bold text-white">Receipt</h3>
                {billingOrder && (
                  <button onClick={clearBilling} className="rounded bg-zinc-800 px-3 py-2 text-xs font-bold text-white hover:bg-zinc-700">
                    New Bill
                  </button>
                )}
              </div>
              <input value={guestName} onChange={(event) => setGuestName(event.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white mb-3" />
              {billingOrder && (
                <div className="mb-3 rounded-lg border border-green-800 bg-green-950/40 p-3 text-xs text-green-100">
                  {billingInvoice
                    ? `Invoice ${billingInvoice.invoiceNumber} is ready. Print the GST bill from here.`
                    : `Order #${billingOrder._id?.slice(-6)} is ready for billing.`}
                </div>
              )}
              <div className="space-y-3 max-h-72 overflow-y-auto mb-4">
                {posCart.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">No items added</p>
                ) : posCart.map((item) => (
                  <div key={item._id} className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                    <div className="flex justify-between gap-3">
                      <p className="text-sm font-bold text-white">{item.name}</p>
                      <button onClick={() => updatePosQty(item._id, -item.quantity)} className="text-red-300">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => updatePosQty(item._id, -1)} className="p-1 bg-zinc-800 rounded"><Minus size={14} /></button>
                        <span className="w-8 text-center text-white font-bold">{item.quantity}</span>
                        <button onClick={() => updatePosQty(item._id, 1)} className="p-1 bg-zinc-800 rounded"><Plus size={14} /></button>
                      </div>
                      <p className="text-red-300 font-bold">Rs. {item.price * item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <input type="number" min="0" value={discount} onChange={(event) => setDiscount(event.target.value)} className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white" placeholder="Discount" />
                <input type="number" min="0" value={taxPercent} onChange={(event) => setTaxPercent(event.target.value)} className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white" placeholder="Tax %" />
              </div>
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white mb-4">
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="razorpay">Razorpay</option>
              </select>
              <div className="space-y-2 border-t border-zinc-800 pt-4 text-sm">
                <div className="flex justify-between text-gray-300"><span>Subtotal</span><span>Rs. {subtotal}</span></div>
                <div className="flex justify-between text-gray-300"><span>Discount</span><span>Rs. {Number(discount || 0)}</span></div>
                <div className="flex justify-between text-gray-300"><span>Taxable Amount</span><span>Rs. {Math.round(taxableAmount)}</span></div>
                <div className="flex justify-between text-gray-300"><span>CGST {(Number(taxPercent || 0) / 2).toFixed(2)}%</span><span>Rs. {Math.round(cgstAmount)}</span></div>
                <div className="flex justify-between text-gray-300"><span>SGST {(Number(taxPercent || 0) / 2).toFixed(2)}%</span><span>Rs. {Math.round(sgstAmount)}</span></div>
                {deliveryCharge > 0 && (
                  <div className="flex justify-between text-gray-300"><span>Delivery Charge</span><span>Rs. {deliveryCharge}</span></div>
                )}
                <div className="flex justify-between text-xl font-black text-white"><span>Total</span><span>Rs. {Math.round(total)}</span></div>
              </div>
              {billingOrder ? (
                <button
                  onClick={() => billingInvoice ? printInvoicePdf(billingInvoice._id) : printBill()}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-green-700 py-3 font-bold text-white transition hover:bg-green-800"
                >
                  <Printer size={18} /> Print GST Bill
                </button>
              ) : (
                <button onClick={handleCreatePosOrder} className="mt-5 w-full bg-red-700 hover:bg-red-800 text-white py-3 rounded-lg font-bold transition">
                  Generate Receipt
                </button>
              )}
              {!billingOrder && posCart.length > 0 && (
                <button onClick={printBill} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-800 py-3 font-bold text-white transition hover:bg-zinc-700">
                  <Printer size={18} /> Print Draft Bill
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffDashboard;

import express from 'express';
import Order from '../models/Order.js';
import Shift from '../models/Shift.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import KOT from '../models/KOT.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { staffWorkstations } from '../data/staffWorkstations.js';

const router = express.Router();

// Middleware: restrict all routes in this file to STAFF or ADMIN role
router.use(protect, restrictTo('staff', 'admin'));

router.get('/workstations', async (req, res) => {
  const visibleWorkstations = req.user.role === 'admin'
    ? staffWorkstations
    : staffWorkstations.filter((station) => station.id === req.user.staffPerson);

  res.status(200).json({
    status: 'success',
    results: visibleWorkstations.length,
    data: { workstations: visibleWorkstations }
  });
});

// LIST STAFF MEMBERS FOR ASSIGNMENT POPUPS
router.get('/all', restrictTo('admin'), async (req, res) => {
  try {
    const staff = await User.find({ role: 'staff' }, '-password')
      .sort({ staffRole: 1, name: 1 });

    res.status(200).json({
      status: 'success',
      results: staff.length,
      data: staff
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching staff list', error: error.message });
  }
});

// GET CURRENT OPEN SHIFT FOR LOGGED-IN STAFF
router.get('/shift/current', async (req, res) => {
  try {
    const shift = await Shift.findOne({ user: req.user._id, reconciliationStatus: 'Open' });
    res.status(200).json({ status: 'success', data: { shift } });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching active shift', error: error.message });
  }
});

// CLOCK IN / START SHIFT
router.post('/shift/clock-in', async (req, res) => {
  try {
    const { cashDrawerStart } = req.body;
    
    // Check if shift is already active
    const activeShift = await Shift.findOne({ user: req.user._id, reconciliationStatus: 'Open' });
    if (activeShift) {
      return res.status(400).json({ message: 'You already have an active shift open. Clock out first.' });
    }

    const newShift = await Shift.create({
      user: req.user._id,
      cashDrawerStart: cashDrawerStart || 0,
      reconciliationStatus: 'Open'
    });

    res.status(201).json({ status: 'success', data: { shift: newShift } });
  } catch (error) {
    res.status(500).json({ message: 'Error clocking in', error: error.message });
  }
});

// CLOCK OUT / END SHIFT
router.post('/shift/clock-out', async (req, res) => {
  try {
    const { cashDrawerEnd, shiftSummary } = req.body;

    const activeShift = await Shift.findOne({ user: req.user._id, reconciliationStatus: 'Open' });
    if (!activeShift) {
      return res.status(404).json({ message: 'No active shift found to clock out.' });
    }

    activeShift.clockOut = new Date();
    activeShift.cashDrawerEnd = cashDrawerEnd || 0;
    activeShift.shiftSummary = shiftSummary || '';
    
    // Simple reconciliation calculation
    const expectedDiff = cashDrawerEnd - activeShift.cashDrawerStart;
    activeShift.reconciliationStatus = expectedDiff >= 0 ? 'Matched' : 'Discrepancy';
    await activeShift.save();

    res.status(200).json({ status: 'success', data: { shift: activeShift } });
  } catch (error) {
    res.status(500).json({ message: 'Error clocking out', error: error.message });
  }
});

// GET STAFF SHIFT RECORDS FOR HISTORY
router.get('/shift/history', async (req, res) => {
  try {
    const shifts = await Shift.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ status: 'success', data: { shifts } });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching shift history', error: error.message });
  }
});

// GET ASSIGNED ORDERS FOR STAFF
router.get('/orders/assigned', async (req, res) => {
  try {
    if (req.user.staffRole === 'chef') {
      return res.status(403).json({ message: 'Chefs can only access Kitchen Order Tickets' });
    }
    const query = {
      assignedTo: req.user._id,
      status: { $nin: ['Packed', 'Ready', 'Shipped', 'Delivered', 'Cancelled'] }
    };
    if (req.user.role === 'staff') {
      query.assignedPerson = req.user.staffPerson;
    }

    const orders = await Order.find({
      ...query
    })
      .populate('user', 'name email phone')
      .populate('items.product')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: orders.length,
      data: { orders }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching assigned orders', error: error.message });
  }
});

// Backward-compatible assigned-order endpoint used by older staff dashboard builds
router.get('/orders/assigned/:staffId', async (req, res) => {
  try {
    if (req.user.staffRole === 'chef') {
      return res.status(403).json({ message: 'Chefs can only access Kitchen Order Tickets' });
    }
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.staffId) {
      return res.status(403).json({ message: 'You can only view your assigned orders' });
    }

    const query = {
      assignedTo: req.params.staffId,
      status: { $nin: ['Packed', 'Ready', 'Shipped', 'Delivered', 'Cancelled'] }
    };
    if (req.user.role === 'staff') {
      query.assignedPerson = req.user.staffPerson;
    }

    const orders = await Order.find(query)
      .populate('user', 'name email phone')
      .populate('items.product')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: orders.length,
      data: orders
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching assigned orders', error: error.message });
  }
});

// UPDATE ORDER STATUS BY STAFF
router.patch('/orders/:orderId/status', async (req, res) => {
  try {
    if (req.user.staffRole === 'chef') {
      return res.status(403).json({ message: 'Chefs must update Kitchen Order Tickets, not billing orders' });
    }
    const { status } = req.body;
    if (!['Pending', 'Confirmed', 'Preparing', 'Packed', 'Ready', 'Shipped', 'Delivered', 'Cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!order.assignedTo && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Order is not assigned yet' });
    }

    if (order.assignedTo?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only update your assigned orders' });
    }

    if (req.user.role === 'staff' && order.assignedPerson !== req.user.staffPerson) {
      return res.status(403).json({ message: 'You can only update your assigned staff page orders' });
    }

    order.status = status;
    if (['Packed', 'Ready', 'Shipped', 'Delivered', 'Cancelled'].includes(status)) {
      order.completedAt = Date.now();
    }
    await order.save();

    // Emit update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to('kds').emit('order_update', order);

      if (order.user) {
        io.to(`customer_${order.user}`).emit('order_status_update', {
          orderId: order._id,
          status: order.status,
          message: `Your order status: ${status}`
        });
      }
    }

    if (status === 'Packed') {
      const admins = await User.find({ role: 'admin' }, '_id');
      if (admins.length > 0) {
        await Notification.insertMany(admins.map((admin) => ({
          user: admin._id,
          title: 'Order packed',
          message: `${req.user.name} marked order #${order._id.toString().slice(-6)} as packed.`,
          type: 'status',
          order: order._id
        })));
      }

      const io = req.app.get('io');
      if (io) {
        io.emit('admin_notification', {
          orderId: order._id,
          title: 'Order packed',
          message: `${req.user.name} marked order #${order._id.toString().slice(-6)} as packed.`
        });
      }
    }

    if (order.user) {
      await Notification.create({
        user: order.user,
        title: 'Order status updated',
        message: `Your order #${order._id.toString().slice(-6)} is now ${status}.`,
        type: 'status',
        order: order._id
      });
    }

    res.status(200).json({
      status: 'success',
      data: { order }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating order status', error: error.message });
  }
});

// GET KDS QUEUE FOR KITCHEN
router.get('/kds/queue', async (req, res) => {
  try {
    if (req.user.staffRole === 'chef') {
      const kots = await KOT.find({
        assignedChef: req.user._id,
        status: { $in: ['Pending', 'Preparing', 'Packed'] }
      }).sort({ createdAt: 1 });
      return res.status(200).json({
        status: 'success',
        results: kots.length,
        data: { orders: kots }
      });
    }
    const query = {
      status: { $in: ['Pending', 'Confirmed', 'Preparing', 'Packed', 'Ready'] }
    };
    if (req.user.role === 'staff') {
      query.assignedTo = req.user._id;
      query.assignedPerson = req.user.staffPerson;
    }

    const activeOrders = await Order.find(query)
      .populate('user', 'name phone')
      .populate('items.product')
      .sort({ createdAt: 1 });

    res.status(200).json({
      status: 'success',
      results: activeOrders.length,
      data: { orders: activeOrders }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching KDS queue', error: error.message });
  }
});

router.get('/kots', async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.staffRole !== 'chef') {
      return res.status(403).json({ message: 'Only chefs and admins can view KOTs' });
    }

    const query = req.user.role === 'admin'
      ? {}
      : { assignedChef: req.user._id };

    const kots = await KOT.find(query)
      .populate('assignedChef', 'name staffRole staffPerson')
      .sort({ createdAt: -1 });

    res.status(200).json({ status: 'success', data: { kots } });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching KOTs', error: error.message });
  }
});

router.patch('/kots/:kotId/status', async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.staffRole !== 'chef') {
      return res.status(403).json({ message: 'Only chefs and admins can update KOTs' });
    }

    const { status } = req.body;
    if (!['Preparing', 'Packed'].includes(status)) {
      return res.status(400).json({ message: 'KOT can only be marked Preparing or Packed' });
    }

    const query = req.user.role === 'admin'
      ? { _id: req.params.kotId }
      : { _id: req.params.kotId, assignedChef: req.user._id };
    const kot = await KOT.findOne(query);
    if (!kot) return res.status(404).json({ message: 'KOT not found' });

    kot.status = status;
    await kot.save();

    const orderStatus = status === 'Packed' ? 'Packed' : 'Preparing';
    const order = await Order.findByIdAndUpdate(kot.orderId, { status: orderStatus }, { new: true });

    const io = req.app.get('io');
    if (io) {
      io.to('kds').emit('kot_update', kot);
      io.emit('order:statusUpdated', order);
    }

    res.status(200).json({ status: 'success', data: { kot } });
  } catch (error) {
    res.status(500).json({ message: 'Error updating KOT', error: error.message });
  }
});

export default router;

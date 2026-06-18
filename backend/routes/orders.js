import express from 'express';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { staffWorkstationIds, staffWorkstations } from '../data/staffWorkstations.js';
import { evaluateDelivery, getDeliverySettings } from '../utils/delivery.js';
import { createKotForOrder } from '../utils/billing.js';
import { createOrderFromPayload } from '../utils/orderCreation.js';

const router = express.Router();

// GET ALL ORDERS (Admin dashboard)
router.get('/', protect, restrictTo('admin'), async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email phone')
      .populate('assignedTo', 'name email role staffRole')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: orders.length,
      data: orders
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving orders', error: error.message });
  }
});

// CREATE NEW ORDER (Dine-in, Takeaway, Delivery)
router.post('/', async (req, res) => {
  try {
    const { order, invoice } = await createOrderFromPayload(req.body, req.app);

    res.status(201).json({
      status: 'success',
      data: {
        order,
        invoice
      }
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || 'Error creating order',
      data: error.data,
      error: error.message
    });
  }
});

router.get('/delivery/settings', async (req, res) => {
  try {
    const settings = await getDeliverySettings();
    res.status(200).json({ status: 'success', data: { settings } });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving delivery settings', error: error.message });
  }
});

router.post('/delivery/check', async (req, res) => {
  try {
    const delivery = await evaluateDelivery(req.body);
    res.status(200).json({ status: 'success', data: { delivery } });
  } catch (error) {
    res.status(500).json({ message: 'Error checking delivery area', error: error.message });
  }
});

// GET LOGGED-IN CUSTOMER ORDERS
router.get('/my-orders', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ status: 'success', results: orders.length, data: { orders } });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving user orders', error: error.message });
  }
});

// Backward-compatible customer order endpoint used by the dashboard
router.get('/user/:userId', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.userId) {
      return res.status(403).json({ message: 'You can only view your own orders' });
    }

    const orders = await Order.find({ user: req.params.userId }).sort({ createdAt: -1 });
    res.status(200).json({ status: 'success', results: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving user orders', error: error.message });
  }
});

// TRACK ORDER DETAILS BY ID
router.get('/track/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('assignedTo', 'name email role staffRole');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(200).json({ status: 'success', data: { order } });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving order status', error: error.message });
  }
});

// GET ACTIVE ORDERS FOR KITCHEN DISPLAY SYSTEM (KDS)
router.get('/kds/queue', protect, async (req, res) => {
  try {
    if (req.user.staffRole === 'chef') {
      return res.status(403).json({ message: 'Chefs can only access Kitchen Order Tickets' });
    }
    // KDS needs active orders that are still moving through the kitchen flow.
    const activeOrders = await Order.find({
      status: { $in: ['Pending', 'Confirmed', 'Preparing', 'Packed', 'Ready'] }
    }).sort({ createdAt: 1 });
    res.status(200).json({ status: 'success', data: { orders: activeOrders } });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving KDS queue', error: error.message });
  }
});

// UPDATE ORDER STATUS (Kitchen Staff or Admin updates order state)
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only staff or admin can update order status' });
    }
    if (req.user.staffRole === 'chef') {
      return res.status(403).json({ message: 'Chefs must update Kitchen Order Tickets, not billing orders' });
    }
    if (!['Pending', 'Confirmed', 'Preparing', 'Packed', 'Ready', 'Shipped', 'Delivered', 'Cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const existingOrder = await Order.findById(req.params.id);
    if (!existingOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (req.user.role === 'staff') {
      const assignedToThisStaff = existingOrder.assignedTo?.toString() === req.user._id.toString();
      const assignedToThisPerson = existingOrder.assignedPerson === req.user.staffPerson;
      if (!assignedToThisStaff || !assignedToThisPerson) {
        return res.status(403).json({ message: 'You can only update your assigned orders' });
      }
    }

    existingOrder.status = status;
    if (['Delivered', 'Cancelled'].includes(status)) {
      existingOrder.completedAt = Date.now();
    }
    await existingOrder.save();

    const order = await Order.findById(existingOrder._id).populate('user', 'name email phone');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

      // Emit socket event for status update
      try {
        const io = req.app.get('io');
        if (io) {
          io.emit('order:statusUpdated', order);
          io.to('kds').emit('order:statusUpdated', order);
          if (order.user) {
            io.to(`customer_${order.user._id}`).emit('order_status_update', {
              orderId: order._id,
              status: order.status,
              message: `Your order is now ${status}`
            });
          }
        }
      } catch (e) {
        console.warn('Socket emit failed for status update', e.message);
      }

      if (order.user) {
        await Notification.create({
          user: order.user._id,
          title: 'Order status updated',
          message: `Your order #${order._id.toString().slice(-6)} is now ${status}.`,
          type: 'status',
          order: order._id
        });
      }

      res.status(200).json({ status: 'success', data: { order } });
  } catch (error) {
    res.status(500).json({ message: 'Error updating order status', error: error.message });
  }
});

// ASSIGN ORDER TO STAFF (Admin only)
router.patch('/:id/assign', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { assignedTo, assignedRole, assignedPerson } = req.body;

    if (!assignedTo || !assignedRole || !assignedPerson) {
      return res.status(400).json({ message: 'assignedTo, assignedRole and assignedPerson required' });
    }

    if (!staffWorkstationIds.includes(assignedPerson)) {
      return res.status(400).json({ message: 'Invalid staff page selected' });
    }

    const workstation = staffWorkstations.find((station) => station.id === assignedPerson);
    const assignedStaff = await User.findOne({ _id: assignedTo, role: 'staff', staffPerson: assignedPerson });
    if (!assignedStaff) {
      return res.status(400).json({ message: 'Selected staff account does not match this staff page' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { assignedTo, assignedRole, assignedPerson, status: 'Confirmed' },
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (workstation.role === 'chef' || assignedRole === 'chef') {
      const kot = await createKotForOrder(order, assignedTo, assignedPerson);
      order.kot = kot._id;
      await order.save();
    }

    // Emit assignment notification via Socket.IO
    const io = req.app.get('io');
    await Notification.create({
      user: order.assignedTo._id,
      title: 'New order assigned',
      message: `Order #${order._id.toString().slice(-6)} assigned to ${workstation.name}.`,
      type: 'assignment',
      order: order._id
    });

    if (io) {
      io.to(`staff_${order.assignedTo._id}`).emit('order_assigned', {
        orderId: order._id,
        message: `Order #${order._id.toString().slice(-6)} assigned to ${workstation.name}`,
        order: order
      });

      io.to('kds').emit('order_assigned', {
        orderId: order._id,
        assignedTo: workstation.name,
        assignedRole: order.assignedRole
      });
    }

    res.status(200).json({ status: 'success', data: { order } });
  } catch (error) {
    res.status(500).json({ message: 'Error assigning order', error: error.message });
  }
});

// GET STAFF ASSIGNED ORDERS
router.get('/staff/assigned/:staffId', protect, restrictTo('staff', 'admin'), async (req, res) => {
  try {
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
      data: { orders }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching assigned orders', error: error.message });
  }
});

export default router;

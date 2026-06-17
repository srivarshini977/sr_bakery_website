import express from 'express';
import PDFDocument from 'pdfkit';
import XLSX from 'xlsx';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Vendor from '../models/Vendor.js';
import Inventory from '../models/Inventory.js';
import ContactSubmission from '../models/ContactSubmission.js';
import Review from '../models/Review.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { getDeliverySettings, updateDeliverySettings } from '../utils/delivery.js';

const router = express.Router();

// Middleware: restrict all routes in this file to ADMIN role
router.use(protect, restrictTo('admin'));

// 1. DASHBOARD ANALYTICS & SALES CHARTS DATA
router.get('/analytics', async (req, res) => {
  try {
    const orders = await Order.find({ paymentStatus: 'Paid' });
    const allOrders = await Order.find();
    const products = await Product.find();
    const customersCount = await User.countDocuments({ role: 'customer' });
    const reviews = await Review.find().populate('user', 'name').sort({ createdAt: -1 }).limit(6);
    const totalReviewCount = await Review.countDocuments();
    const reviewAverage = await Review.aggregate([
      { $group: { _id: null, average: { $avg: '$rating' } } }
    ]);
    const unreadMessagesCount = await ContactSubmission.countDocuments({ status: 'new' });
    const orderDate = (order) => {
      if (order.createdAt) return new Date(order.createdAt);
      if (order.updatedAt) return new Date(order.updatedAt);
      return order._id?.getTimestamp ? order._id.getTimestamp() : new Date();
    };
    
    // Revenue calculations
    let totalRevenue = 0;
    let totalDiscount = 0;
    orders.forEach(order => {
      totalRevenue += order.totalAmount;
      totalDiscount += order.discountAmount;
    });

    // Top selling products from paid order item quantities.
    const productSalesMap = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        const prodId = item.product?.toString() || item.name;
        productSalesMap[prodId] = (productSalesMap[prodId] || 0) + item.quantity;
      });
    });

    const topSellingAll = Object.keys(productSalesMap).map(key => {
      const prod = products.find(p => p._id.toString() === key || p.name === key);
      return {
        id: key,
        name: prod ? prod.name : key,
        category: prod ? prod.category : 'General',
        salesCount: productSalesMap[key],
        revenue: productSalesMap[key] * (prod ? prod.price : 100)
      };
    }).sort((a, b) => b.salesCount - a.salesCount);
    const topSelling = topSellingAll.slice(0, 5);
    const topSellingProducts = topSellingAll.slice(0, 10);
    const categorySalesMap = {};
    topSellingAll.forEach((item) => {
      if (!categorySalesMap[item.category]) {
        categorySalesMap[item.category] = { category: item.category, quantity: 0, revenue: 0 };
      }
      categorySalesMap[item.category].quantity += item.salesCount;
      categorySalesMap[item.category].revenue += item.revenue;
    });
    const topCategories = Object.values(categorySalesMap).sort((a, b) => b.quantity - a.quantity);

    // Busiest hours from order timestamps.
    const hoursData = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, ordersCount: 0 }));
    orders.forEach(order => {
      const hr = orderDate(order).getHours();
      if (Number.isInteger(hr) && hoursData[hr]) {
        hoursData[hr].ordersCount += 1;
      }
    });
    const busiestHours = hoursData.filter(h => h.ordersCount > 0);

    // Inventory status (total count, low stock items count)
    const lowStockItems = await Product.find({ $expr: { $lte: ["$stock", "$lowStockThreshold"] } }).limit(10);
    const rawLowStockItems = await Inventory.find({ $expr: { $lte: ['$quantity', '$minThreshold'] } }).sort({ quantity: 1 }).limit(10);

    // Profit margins calculations
    let totalProductionCost = 0;
    orders.forEach(order => {
      order.items.forEach(item => {
        const prod = products.find(p => p._id.toString() === item.product?.toString());
        if (prod) {
          totalProductionCost += (prod.productionCost || (prod.price * 0.45)) * item.quantity; 
        } else {
          totalProductionCost += (item.price * 0.45) * item.quantity;
        }
      });
    });

    const netProfit = totalRevenue - totalProductionCost;
    const profitMarginPercentage = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const todayOrders = allOrders.filter((order) => orderDate(order) >= startOfToday);
    const yesterdayOrders = allOrders.filter((order) => orderDate(order) >= startOfYesterday && orderDate(order) < startOfToday);
    const revenueFor = (list) => list
      .filter((order) => order.paymentStatus === 'Paid')
      .reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
    const costFor = (list) => list.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => {
      const prod = products.find(p => p._id.toString() === item.product?.toString());
      return itemSum + ((prod?.productionCost || item.price * 0.45) * item.quantity);
    }, 0), 0);
    const percentChange = (current, previous) => previous > 0 ? Number((((current - previous) / previous) * 100).toFixed(1)) : (current > 0 ? 100 : 0);
    const todayRevenue = revenueFor(todayOrders);
    const yesterdayRevenue = revenueFor(yesterdayOrders);
    const todayProfit = todayRevenue - costFor(todayOrders);
    const yesterdayProfit = yesterdayRevenue - costFor(yesterdayOrders);
    const todaySalesMap = {};
    todayOrders.forEach((order) => order.items.forEach((item) => {
      todaySalesMap[item.name] = (todaySalesMap[item.name] || 0) + item.quantity;
    }));
    const todayTopProduct = Object.entries(todaySalesMap).sort((a, b) => b[1] - a[1])[0]?.[0] || topSellingProducts[0]?.name || 'No sales yet';

    res.status(200).json({
      status: 'success',
      data: {
        totalRevenue,
        netProfit,
        profitMarginPercentage,
        totalOrders: orders.length,
        dailySummary: {
          todayRevenue,
          todayOrders: todayOrders.length,
          todayProfit,
          todayTopProduct,
          totalCustomers: customersCount,
          activeOrders: allOrders.filter(order => !['Delivered', 'Cancelled'].includes(order.status)).length,
          deliveredOrders: allOrders.filter(order => order.status === 'Delivered').length,
          cancelledOrders: allOrders.filter(order => order.status === 'Cancelled').length,
          trends: {
            todayRevenue: percentChange(todayRevenue, yesterdayRevenue),
            todayOrders: percentChange(todayOrders.length, yesterdayOrders.length),
            todayProfit: percentChange(todayProfit, yesterdayProfit),
            totalCustomers: 0,
            activeOrders: 0,
            deliveredOrders: 0,
            cancelledOrders: 0
          }
        },
        topSelling,
        topSellingProducts,
        topCategories,
        mostOrderedItem: topSellingProducts[0] || null,
        leastOrderedItem: topSellingAll[topSellingAll.length - 1] || null,
        busiestHours: busiestHours.slice(8, 22), // standard open hours 8am to 10pm
        lowStockAlertCount: lowStockItems.length,
        lowStockAlerts: [
          ...lowStockItems.map(item => ({
            name: item.name,
            status: Number(item.stock) <= Math.max(1, Number(item.lowStockThreshold) / 2) ? 'Critical' : 'Low',
            quantity: item.stock,
            unit: 'pcs'
          })),
          ...rawLowStockItems.map(item => ({
            name: item.name,
            status: Number(item.quantity) <= Math.max(1, Number(item.minThreshold) / 2) ? 'Critical' : 'Low',
            quantity: item.quantity,
            unit: item.unit
          }))
        ].slice(0, 10),
        feedback: {
          averageRating: Number((reviewAverage[0]?.average || 0).toFixed(1)),
          totalReviews: totalReviewCount,
          latestReviews: reviews,
          unreadMessagesCount
        },
        salesTrends: orders.reduce((months, order) => {
          const date = orderDate(order);
          const key = date.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
          const existing = months.find((month) => month.month === key);
          const orderCost = order.items.reduce((sum, item) => {
            const prod = products.find(p => p._id.toString() === item.product?.toString());
            return sum + ((prod?.productionCost || item.price * 0.45) * item.quantity);
          }, 0);
          if (existing) {
            existing.sales += order.totalAmount;
            existing.profit += order.totalAmount - orderCost;
          } else {
            months.push({ month: key, sales: order.totalAmount, profit: order.totalAmount - orderCost });
          }
          return months;
        }, [])
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving analytics data', error: error.message });
  }
});

router.get('/delivery-settings', async (req, res) => {
  try {
    const settings = await getDeliverySettings();
    res.status(200).json({ status: 'success', data: { settings } });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving delivery settings', error: error.message });
  }
});

router.patch('/delivery-settings', async (req, res) => {
  try {
    const settings = await updateDeliverySettings(req.body);
    res.status(200).json({ status: 'success', data: { settings } });
  } catch (error) {
    res.status(500).json({ message: 'Error updating delivery settings', error: error.message });
  }
});

// 2. INVENTORY MANAGEMENT (RAW MATERIALS)
router.get('/inventory', async (req, res) => {
  try {
    const rawMaterials = await Inventory.find().populate('supplier', 'name').sort({ category: 1, name: 1 });
    res.status(200).json({ status: 'success', data: { rawMaterials } });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching raw inventory', error: error.message });
  }
});

router.post('/inventory', async (req, res) => {
  try {
    const newItem = await Inventory.create(req.body);
    res.status(201).json({ status: 'success', data: { item: newItem } });
  } catch (error) {
    res.status(500).json({ message: 'Error adding inventory item', error: error.message });
  }
});

router.patch('/inventory/:id', async (req, res) => {
  try {
    const updated = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ status: 'success', data: { item: updated } });
  } catch (error) {
    res.status(500).json({ message: 'Error updating inventory item', error: error.message });
  }
});

router.delete('/inventory/:id', async (req, res) => {
  try {
    await Inventory.findByIdAndDelete(req.params.id);
    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting inventory item', error: error.message });
  }
});

// 3. VENDOR & SUPPLIER MANAGEMENT
router.get('/vendors', async (req, res) => {
  try {
    const vendors = await Vendor.find();
    res.status(200).json({ status: 'success', data: { vendors } });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vendors', error: error.message });
  }
});

router.post('/vendors', async (req, res) => {
  try {
    const vendor = await Vendor.create(req.body);
    res.status(201).json({ status: 'success', data: { vendor } });
  } catch (error) {
    res.status(500).json({ message: 'Error creating vendor record', error: error.message });
  }
});

router.patch('/vendors/:id', async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ status: 'success', data: { vendor } });
  } catch (error) {
    res.status(500).json({ message: 'Error updating vendor', error: error.message });
  }
});

router.post('/vendors/:id/invoice', async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    vendor.invoices.push(req.body);
    await vendor.save();
    res.status(201).json({ status: 'success', data: { vendor } });
  } catch (error) {
    res.status(500).json({ message: 'Error adding vendor invoice', error: error.message });
  }
});

// 4. RECIPE COSTING
router.get('/recipe-costing', async (req, res) => {
  try {
    const products = await Product.find({}, 'name price productionCost category');
    const recipeCostData = products.map(p => {
      const rawCost = p.productionCost || Math.round(p.price * 0.4); // fallback 40% costing
      const profit = p.price - rawCost;
      const profitPercentage = ((profit / p.price) * 100).toFixed(1);
      return {
        _id: p._id,
        name: p.name,
        category: p.category,
        retailPrice: p.price,
        productionCost: rawCost,
        profitMargin: profit,
        profitMarginPercent: profitPercentage
      };
    });
    res.status(200).json({ status: 'success', data: { recipes: recipeCostData } });
  } catch (error) {
    res.status(500).json({ message: 'Error generating recipe costing details', error: error.message });
  }
});

// 5. USER MANAGEMENT (Staff, Customers)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ role: 1, name: 1 });
    res.status(200).json({ status: 'success', data: { users } });
  } catch (error) {
    res.status(500).json({ message: 'Error listing users', error: error.message });
  }
});

router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['customer', 'staff', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role assignment' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true, select: '-password' });
    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user role', error: error.message });
  }
});

router.patch('/users/:id/staff-role', async (req, res) => {
  try {
    const { staffRole } = req.body;
    if (!['chef', 'tea_master', 'waiter', 'cashier', 'monitoring', null].includes(staffRole)) {
      return res.status(400).json({ message: 'Invalid staff role assignment' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: 'staff', staffRole },
      { new: true, select: '-password' }
    );

    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    res.status(500).json({ message: 'Error updating staff role', error: error.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user account', error: error.message });
  }
});

// 6. REPORTS GENERATION (PDF)
router.get('/reports/pdf', async (req, res) => {
  try {
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=sr-bakery-sales-report.pdf');
    doc.pipe(res);

    // Brand and Report Header
    doc.fontSize(24).fillColor('#b30000').text('SR BAKERY', { align: 'center' });
    doc.fontSize(12).fillColor('#2b1b17').text('Dindigul–Palani Road, Oddanchatram, Dindigul - 624619', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).fillColor('#121212').text('Sales & Revenue Analytical Report', { underline: true });
    doc.moveDown();

    // Query Data
    const orders = await Order.find({ paymentStatus: 'Paid' });
    const products = await Product.find({});
    let totalSales = 0;
    orders.forEach(o => totalSales += o.totalAmount);

    doc.fontSize(12).fillColor('#000000').text(`Total Completed Orders: ${orders.length}`);
    doc.text(`Total Gross Revenue: Rs. ${totalSales.toLocaleString('en-IN')}/-`);
    doc.text(`Report Date: ${new Date().toLocaleDateString('en-IN')}`);
    doc.moveDown();

    // Listing orders
    doc.fontSize(14).text('Recent Transactions:', { underline: true });
    orders.slice(0, 10).forEach((order, index) => {
      doc.fontSize(10).text(`${index+1}. Order ID: ${order._id} | Date: ${new Date(order.createdAt).toLocaleDateString()} | Amount: Rs. ${order.totalAmount}`);
    });

    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'Error generating PDF report', error: error.message });
  }
});

// 6. REPORTS GENERATION (EXCEL)
router.get('/reports/excel', async (req, res) => {
  try {
    const products = await Product.find({});
    
    // Format data for sheet
    const data = products.map((p, idx) => ({
      'S.No': idx + 1,
      'Product Name': p.name,
      'Category': p.category,
      'Price (INR)': p.price,
      'Raw Production Cost (INR)': p.productionCost,
      'Available Stock': p.stock,
      'Low Stock Indicator': p.stock <= p.lowStockThreshold ? 'Low Stock' : 'Good'
    }));

    // Create workbook & sheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Menu & Inventory');

    // Generate buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=sr-bakery-inventory.xlsx');
    res.send(buf);
  } catch (error) {
    res.status(500).json({ message: 'Error generating Excel report', error: error.message });
  }
});

export default router;

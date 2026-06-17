import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Invoice from '../models/Invoice.js';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

const router = express.Router();

// Protect all report routes to admin only
router.use(protect, restrictTo('admin'));

// SALES REPORT PDF
router.get('/sales/pdf', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find(query)
      .populate('customerId', 'name email phone')
      .populate('orderId', 'status');
    
    const totalSales = invoices.reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0);
    const totalOrders = invoices.length;
    const paidOrders = invoices.filter(invoice => invoice.paymentStatus === 'Paid').length;

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="sales-report.pdf"');
    doc.pipe(res);

    doc.fontSize(20).text('SR BAKERY - SALES REPORT', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
    doc.moveDown(2);

    doc.fontSize(12).font('Helvetica-Bold').text('SUMMARY');
    doc.font('Helvetica').text(`Total Sales: Rs. ${totalSales.toFixed(2)}`);
    doc.text(`Total Orders: ${totalOrders}`);
    doc.text(`Paid Orders: ${paidOrders}`);
    doc.moveDown(2);

    doc.fontSize(12).font('Helvetica-Bold').text('RECENT ORDERS');
    doc.fontSize(9);
    invoices.slice(0, 10).forEach(invoice => {
      doc.text(`${invoice.invoiceNumber}: ${invoice.customer?.name || 'Customer'} - Rs. ${invoice.totalAmount} (${invoice.paymentStatus})`);
    });

    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'Error generating PDF', error: error.message });
  }
});

// SALES REPORT EXCEL
router.get('/sales/excel', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find(query)
      .populate('customerId', 'name email phone')
      .populate('orderId', 'status');
    
    const totalSales = invoices.reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0);
    const totalOrders = invoices.length;
    const paidOrders = invoices.filter(invoice => invoice.paymentStatus === 'Paid').length;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sales Report');

    sheet.columns = [
      { header: 'Invoice Number', key: 'id', width: 25 },
      { header: 'Order Number', key: 'orderNumber', width: 15 },
      { header: 'Customer', key: 'customer', width: 20 },
      { header: 'Amount', key: 'amount', width: 12 },
      { header: 'Payment Status', key: 'paymentStatus', width: 15 },
      { header: 'Order Status', key: 'orderStatus', width: 15 },
      { header: 'Date', key: 'date', width: 20 }
    ];

    invoices.forEach(invoice => {
      sheet.addRow({
        id: invoice.invoiceNumber,
        orderNumber: invoice.orderNumber,
        customer: invoice.customer?.name || 'Customer',
        amount: invoice.totalAmount,
        paymentStatus: invoice.paymentStatus,
        orderStatus: invoice.orderId?.status || '',
        date: new Date(invoice.createdAt).toLocaleDateString()
      });
    });

    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.addRow(['Metric', 'Value']);
    summarySheet.addRow(['Total Sales', totalSales.toFixed(2)]);
    summarySheet.addRow(['Total Orders', totalOrders]);
    summarySheet.addRow(['Paid Orders', paidOrders]);
    summarySheet.addRow(['Pending Orders', totalOrders - paidOrders]);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="sales-report.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Error generating Excel', error: error.message });
  }
});

// INVENTORY REPORT
router.get('/inventory/excel', async (req, res) => {
  try {
    const products = await Product.find();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Inventory');

    sheet.columns = [
      { header: 'Product ID', key: 'id', width: 25 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Stock', key: 'stock', width: 10 },
      { header: 'Price', key: 'price', width: 10 }
    ];

    products.forEach(p => {
      sheet.addRow({
        id: p._id.toString(),
        name: p.name,
        category: p.category,
        stock: p.stock || 0,
        price: p.price
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="inventory-report.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Error generating inventory report', error: error.message });
  }
});

// PRODUCT SALES REPORT
router.get('/product-sales/excel', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(query);
    const productSales = {};
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const key = item.name;
        if (!productSales[key]) {
          productSales[key] = { name: item.name, quantity: 0, revenue: 0 };
        }
        productSales[key].quantity += item.quantity;
        productSales[key].revenue += item.price * item.quantity;
      });
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Product Sales');
    sheet.columns = [
      { header: 'Product Name', key: 'name', width: 30 },
      { header: 'Quantity Sold', key: 'quantity', width: 15 },
      { header: 'Revenue', key: 'revenue', width: 15 }
    ];

    Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .forEach((item) => sheet.addRow(item));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="product-sales-report.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Error generating product sales report', error: error.message });
  }
});

// STAFF PERFORMANCE REPORT
router.get('/staff/excel', async (req, res) => {
  try {
    const staffUsers = await User.find({ role: 'staff' });
    const orders = await Order.find({ assignedTo: { $ne: null } }).populate('assignedTo', 'name email');

    const staffPerformance = {};
    orders.forEach(order => {
      if (order.assignedTo) {
        if (!staffPerformance[order.assignedTo._id]) {
          staffPerformance[order.assignedTo._id] = {
            name: order.assignedTo.name,
            email: order.assignedTo.email,
            totalOrders: 0,
            completedOrders: 0
          };
        }
        staffPerformance[order.assignedTo._id].totalOrders++;
        if (order.status === 'Delivered') staffPerformance[order.assignedTo._id].completedOrders++;
      }
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Staff Performance');

    sheet.columns = [
      { header: 'Staff Name', key: 'name', width: 20 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Total Orders', key: 'total', width: 15 },
      { header: 'Completed Orders', key: 'completed', width: 18 }
    ];

    Object.values(staffPerformance).forEach(staff => {
      sheet.addRow({
        name: staff.name,
        email: staff.email,
        total: staff.totalOrders,
        completed: staff.completedOrders
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="staff-report.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Error generating staff report', error: error.message });
  }
});

// CUSTOMER REPORTS
router.get('/customers/excel', async (req, res) => {
  try {
    const customers = await User.find({ role: 'customer' });
    const orders = await Order.find().populate('user', '_id');

    const customerOrders = {};
    orders.forEach(order => {
      if (order.user) {
        if (!customerOrders[order.user._id]) {
          customerOrders[order.user._id] = 0;
        }
        customerOrders[order.user._id]++;
      }
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Customers');

    sheet.columns = [
      { header: 'Customer Name', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Orders', key: 'orders', width: 10 }
    ];

    customers.forEach(customer => {
      sheet.addRow({
        name: customer.name,
        email: customer.email,
        phone: customer.phone || 'N/A',
        orders: customerOrders[customer._id] || 0
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="customers-report.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Error generating customer report', error: error.message });
  }
});

export default router;

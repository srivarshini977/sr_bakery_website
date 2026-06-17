import express from 'express';
import ExcelJS from 'exceljs';
import Invoice from '../models/Invoice.js';
import Order from '../models/Order.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { streamInvoicePdf } from '../utils/billing.js';

const router = express.Router();

router.use(protect);

const canUseBilling = (user) => user.role === 'admin' || user.staffRole === 'cashier';

const requireBilling = (req, res, next) => {
  if (!canUseBilling(req.user)) {
    return res.status(403).json({ message: 'Billing is only available to cashier or admin users' });
  }
  next();
};

router.get('/', requireBilling, async (req, res) => {
  try {
    const { startDate, endDate, paymentStatus } = req.query;
    const query = {};
    if (paymentStatus && paymentStatus !== 'all') query.paymentStatus = paymentStatus;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find(query)
      .populate('orderId', 'status orderType createdAt')
      .populate('customerId', 'name email phone')
      .sort({ createdAt: -1 });
    res.status(200).json({ status: 'success', data: { invoices } });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching invoices', error: error.message });
  }
});

router.get('/export/history.xlsx', protect, restrictTo('admin'), async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Invoice History');
    sheet.columns = [
      { header: 'Invoice Number', key: 'invoiceNumber', width: 24 },
      { header: 'Order Number', key: 'orderNumber', width: 16 },
      { header: 'Customer', key: 'customer', width: 24 },
      { header: 'Subtotal', key: 'subtotal', width: 12 },
      { header: 'Tax', key: 'tax', width: 12 },
      { header: 'Discount', key: 'discount', width: 12 },
      { header: 'Total', key: 'totalAmount', width: 12 },
      { header: 'Payment Status', key: 'paymentStatus', width: 16 },
      { header: 'Date', key: 'date', width: 20 }
    ];

    invoices.forEach((invoice) => sheet.addRow({
      invoiceNumber: invoice.invoiceNumber,
      orderNumber: invoice.orderNumber,
      customer: invoice.customer?.name || 'Customer',
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      discount: invoice.discount,
      totalAmount: invoice.totalAmount,
      paymentStatus: invoice.paymentStatus,
      date: new Date(invoice.createdAt).toLocaleString('en-IN')
    }));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="invoice-history.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Error exporting invoice history', error: error.message });
  }
});

router.get('/:id', requireBilling, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('orderId', 'status orderType createdAt')
      .populate('customerId', 'name email phone');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.status(200).json({ status: 'success', data: { invoice } });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching invoice', error: error.message });
  }
});

router.patch('/:id/payment', requireBilling, async (req, res) => {
  try {
    const { paymentStatus, paymentMethod } = req.body;
    if (!['Pending', 'Paid', 'Failed', 'Refunded'].includes(paymentStatus)) {
      return res.status(400).json({ message: 'Invalid payment status' });
    }

    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      {
        paymentStatus,
        ...(paymentMethod ? { paymentMethod } : {})
      },
      { new: true, runValidators: true }
    );
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    await Order.findByIdAndUpdate(invoice.orderId, {
      paymentStatus,
      ...(paymentMethod ? { paymentMethod } : {})
    });

    res.status(200).json({ status: 'success', data: { invoice } });
  } catch (error) {
    res.status(500).json({ message: 'Error updating invoice payment', error: error.message });
  }
});

router.patch('/:id/discount', requireBilling, async (req, res) => {
  try {
    const discount = Math.max(0, Number(req.body.discount || 0));
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const taxableAmount = Math.max(0, Number(invoice.subtotal || 0) - discount);
    const tax = Number((taxableAmount * (Number(invoice.taxPercent || 0) / 100)).toFixed(2));
    invoice.discount = discount;
    invoice.tax = tax;
    invoice.cgst = Number((tax / 2).toFixed(2));
    invoice.sgst = Number((tax / 2).toFixed(2));
    invoice.totalAmount = Math.round(taxableAmount + tax + Number(invoice.deliveryCharge || 0));
    await invoice.save();

    await Order.findByIdAndUpdate(invoice.orderId, {
      discountAmount: discount,
      totalAmount: invoice.totalAmount
    });

    res.status(200).json({ status: 'success', data: { invoice } });
  } catch (error) {
    res.status(500).json({ message: 'Error applying discount', error: error.message });
  }
});

router.get('/:id/pdf', requireBilling, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    streamInvoicePdf(invoice, res);
  } catch (error) {
    res.status(500).json({ message: 'Error generating invoice PDF', error: error.message });
  }
});

export default router;

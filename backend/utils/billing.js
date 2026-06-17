import PDFDocument from 'pdfkit';
import Invoice from '../models/Invoice.js';
import KOT from '../models/KOT.js';

const pad = (value, length = 5) => String(value).padStart(length, '0');

export const buildDocumentNumber = (prefix, id) => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const idPart = id?.toString ? id.toString().slice(-5).toUpperCase() : pad(Date.now().toString().slice(-5));
  return `${prefix}-${datePart}-${idPart}`;
};

export const createInvoiceForOrder = async (order, options = {}) => {
  const existing = await Invoice.findOne({ orderId: order._id });
  if (existing) return existing;

  const taxPercent = Number(options.taxPercent ?? 5);
  const discount = Number(order.discountAmount || 0);
  const deliveryCharge = Number(order.deliveryCharge || 0);
  const items = (order.items || []).map((item) => ({
    product: item.product || null,
    name: item.name,
    quantity: Number(item.quantity || 0),
    price: Number(item.price || 0),
    lineTotal: Number(item.price || 0) * Number(item.quantity || 0)
  }));
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = Number((taxableAmount * (taxPercent / 100)).toFixed(2));
  const totalAmount = Math.round(taxableAmount + tax + deliveryCharge);

  const populatedUser = order.user && typeof order.user === 'object' ? order.user : null;
  const address = order.deliveryAddress || order.customerAddress?.fullAddress || '';

  return Invoice.create({
    invoiceNumber: buildDocumentNumber('INV', order._id),
    orderId: order._id,
    orderNumber: order._id.toString().slice(-6).toUpperCase(),
    customerId: populatedUser?._id || order.user || null,
    customer: {
      name: populatedUser?.name || order.guestName || 'Walk-in Customer',
      email: populatedUser?.email || '',
      phone: populatedUser?.phone || '',
      address
    },
    items,
    subtotal,
    tax,
    cgst: Number((tax / 2).toFixed(2)),
    sgst: Number((tax / 2).toFixed(2)),
    taxPercent,
    discount,
    deliveryCharge,
    totalAmount,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod
  });
};

export const createKotForOrder = async (order, assignedChef, assignedPerson = '') => {
  const existing = await KOT.findOne({ orderId: order._id, assignedChef });
  if (existing) return existing;

  return KOT.create({
    kotNumber: buildDocumentNumber('KOT', order._id),
    orderId: order._id,
    orderNumber: order._id.toString().slice(-6).toUpperCase(),
    assignedChef,
    assignedPerson,
    items: (order.items || []).map((item) => ({
      product: item.product || null,
      name: item.name,
      quantity: Number(item.quantity || 0),
      notes: item.notes || ''
    })),
    specialInstructions: order.notes || '',
    status: order.status === 'Preparing' ? 'Preparing' : order.status === 'Packed' ? 'Packed' : 'Pending'
  });
};

export const streamInvoicePdf = (invoice, res) => {
  const doc = new PDFDocument({ margin: 36 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${invoice.invoiceNumber}.pdf"`);
  doc.pipe(res);

  doc.fontSize(20).font('Helvetica-Bold').text('SR BAKERY', { align: 'center' });
  doc.fontSize(10).font('Helvetica').text('Oddanchatram', { align: 'center' });
  doc.text('GSTIN: 33ATOPG4810D1Z3', { align: 'center' });
  doc.moveDown();

  doc.fontSize(12).font('Helvetica-Bold').text(`Invoice: ${invoice.invoiceNumber}`);
  doc.font('Helvetica').text(`Order: #${invoice.orderNumber}`);
  doc.text(`Date: ${new Date(invoice.createdAt).toLocaleString('en-IN')}`);
  doc.text(`Customer: ${invoice.customer?.name || 'Customer'}`);
  if (invoice.customer?.phone) doc.text(`Phone: ${invoice.customer.phone}`);
  if (invoice.customer?.address) doc.text(`Address: ${invoice.customer.address}`);
  doc.text(`Payment: ${invoice.paymentStatus} (${invoice.paymentMethod})`);
  doc.moveDown();

  const startX = doc.x;
  const tableTop = doc.y;
  doc.font('Helvetica-Bold');
  doc.text('Item', startX, tableTop, { width: 220 });
  doc.text('Qty', startX + 230, tableTop, { width: 45, align: 'right' });
  doc.text('Rate', startX + 285, tableTop, { width: 70, align: 'right' });
  doc.text('Amount', startX + 365, tableTop, { width: 90, align: 'right' });
  doc.moveDown(0.5);
  doc.moveTo(startX, doc.y).lineTo(560, doc.y).stroke();
  doc.moveDown(0.4);

  doc.font('Helvetica').fontSize(10);
  invoice.items.forEach((item) => {
    const y = doc.y;
    doc.text(item.name, startX, y, { width: 220 });
    doc.text(String(item.quantity), startX + 230, y, { width: 45, align: 'right' });
    doc.text(`Rs. ${Number(item.price).toFixed(2)}`, startX + 285, y, { width: 70, align: 'right' });
    doc.text(`Rs. ${Number(item.lineTotal).toFixed(2)}`, startX + 365, y, { width: 90, align: 'right' });
    doc.moveDown(0.8);
  });

  doc.moveDown();
  const totalsX = 340;
  const totalLine = (label, value, bold = false) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica');
    doc.text(label, totalsX, doc.y, { width: 100 });
    doc.text(`Rs. ${Number(value).toFixed(2)}`, totalsX + 105, doc.y - 12, { width: 90, align: 'right' });
    doc.moveDown(0.7);
  };
  totalLine('Subtotal', invoice.subtotal);
  totalLine('Discount', invoice.discount);
  totalLine(`CGST ${Number(invoice.taxPercent || 0) / 2}%`, invoice.cgst);
  totalLine(`SGST ${Number(invoice.taxPercent || 0) / 2}%`, invoice.sgst);
  if (invoice.deliveryCharge) totalLine('Delivery', invoice.deliveryCharge);
  totalLine('Total', invoice.totalAmount, true);

  doc.moveDown(2);
  doc.fontSize(10).font('Helvetica').text('Thank you. Visit again!', { align: 'center' });
  doc.end();
};

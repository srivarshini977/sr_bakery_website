import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  contactPerson: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    default: ''
  },
  invoices: [{
    invoiceNumber: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    status: { type: String, enum: ['Paid', 'Pending'], default: 'Pending' }
  }],
  supplierProducts: [{
    name: { type: String, required: true },
    unit: { type: String, default: 'kg' },
    price: { type: Number, default: 0 }
  }],
  purchaseHistory: [{
    itemName: { type: String, required: true },
    quantity: { type: Number, default: 0 },
    unit: { type: String, default: '' },
    amount: { type: Number, default: 0 },
    date: { type: Date, default: Date.now },
    notes: { type: String, default: '' }
  }],
  deliverySchedule: {
    type: String,
    default: 'Weekly'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Vendor = mongoose.model('Vendor', vendorSchema);
export default Vendor;

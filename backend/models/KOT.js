import mongoose from 'mongoose';

const kotItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null
  },
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  notes: {
    type: String,
    default: ''
  }
}, { _id: false });

const kotSchema = new mongoose.Schema({
  kotNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  orderNumber: {
    type: String,
    default: ''
  },
  assignedChef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  assignedPerson: {
    type: String,
    default: ''
  },
  items: [kotItemSchema],
  specialInstructions: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Pending', 'Preparing', 'Packed', 'Cancelled'],
    default: 'Pending'
  }
}, { timestamps: true });

const KOT = mongoose.model('KOT', kotSchema);
export default KOT;

import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Optional for POS Guest Billing
  },
  guestName: {
    type: String,
    default: ''
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    name: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    price: {
      type: Number,
      required: true
    }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  couponCode: {
    type: String,
    default: ''
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'cash_counter', 'cash_on_delivery', 'reservation', 'razorpay', 'staff_internal'],
    default: 'cash_counter'
  },
  razorpayOrderId: {
    type: String,
    default: '',
    index: true
  },
  razorpayPaymentId: {
    type: String,
    default: '',
    index: true
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
    default: 'Pending'
  },
  orderSource: {
    type: String,
    enum: ['customer', 'staff', 'pos'],
    default: 'customer'
  },
  employeeId: {
    type: String,
    default: ''
  },
  staffDiscountPercentage: {
    type: Number,
    default: 0
  },
  staffDiscountAmount: {
    type: Number,
    default: 0
  },
  orderType: {
    type: String,
    enum: ['dine-in', 'takeaway', 'delivery'],
    default: 'takeaway'
  },
  tableNumber: {
    type: String,
    default: ''
  },
  deliveryAddress: {
    type: String,
    default: ''
  },
  customerAddress: {
    houseNumber: { type: String, default: '' },
    street: { type: String, default: '' },
    area: { type: String, default: '' },
    city: { type: String, default: '' },
    pincode: { type: String, default: '' },
    fullAddress: { type: String, default: '' }
  },
  customerLatitude: {
    type: Number,
    default: null
  },
  customerLongitude: {
    type: Number,
    default: null
  },
  distanceKm: {
    type: Number,
    default: null
  },
  estimatedTime: {
    type: Number,
    default: null
  },
  deliveryCharge: {
    type: Number,
    default: 0
  },
  deliveryAvailable: {
    type: Boolean,
    default: true
  },
  deliveryServiceStatus: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Preparing', 'Packed', 'Ready', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Pending'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedRole: {
    type: String,
    enum: ['chef', 'tea_master', 'waiter', 'cashier', 'monitoring', null],
    default: null
  },
  assignedPerson: {
    type: String,
    default: ''
  },
  completedAt: {
    type: Date,
    default: null
  },
  loyaltyPointsEarned: {
    type: Number,
    default: 0
  },
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    default: null
  },
  kot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KOT',
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Update timestamp on save
orderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Order = mongoose.model('Order', orderSchema);
export default Order;

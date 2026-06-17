import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  clockIn: {
    type: Date,
    default: Date.now
  },
  clockOut: {
    type: Date
  },
  cashDrawerStart: {
    type: Number,
    required: true,
    default: 0
  },
  cashDrawerEnd: {
    type: Number,
    default: 0
  },
  shiftSummary: {
    type: String,
    default: ''
  },
  reconciliationStatus: {
    type: String,
    enum: ['Open', 'Matched', 'Discrepancy'],
    default: 'Open'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Shift = mongoose.model('Shift', shiftSchema);
export default Shift;

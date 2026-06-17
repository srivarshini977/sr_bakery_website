import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  title: {
    type: String,
    trim: true,
    default: ''
  },
  comment: {
    type: String,
    trim: true,
    required: true
  },
  approved: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

const Review = mongoose.model('Review', reviewSchema);
export default Review;

import mongoose from 'mongoose';

const contactSubmissionSchema = new mongoose.Schema({
  kind: {
    type: String,
    enum: ['message', 'feedback'],
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  subject: {
    type: String,
    trim: true,
    default: ''
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['new', 'read'],
    default: 'new'
  },
  approved: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

const ContactSubmission = mongoose.model('ContactSubmission', contactSubmissionSchema);
export default ContactSubmission;

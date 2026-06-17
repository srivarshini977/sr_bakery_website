import mongoose from 'mongoose';

const rolePermissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  permissions: [{
    type: String,
    trim: true
  }],
  active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

const RolePermission = mongoose.model('RolePermission', rolePermissionSchema);
export default RolePermission;

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Order from '../models/Order.js';
import { staffWorkstations } from '../data/staffWorkstations.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/srbakery';

const defaults = [
  {
    name: 'Gopinath S (Admin)',
    email: 'admin@srbakery.com',
    phone: '9944019497',
    password: 'Admin@123',
    role: 'admin',
    staffRole: null,
    staffPerson: '',
    address: '233/1A1, Ground Floor, Dindigul-Palani Road, Oddanchatram, Dindigul - 624619'
  }
];

const staffDefaults = staffWorkstations.map((station) => ({
  name: station.name,
  email: station.email,
  phone: station.phone,
  password: 'Staff@123',
  role: 'staff',
  staffRole: station.role,
  staffPerson: station.id,
  address: 'Oddanchatram Town'
}));

try {
  await mongoose.connect(MONGODB_URI);
  await User.deleteOne({ email: 'customer@srbakery.com' });
  await User.deleteOne({ email: 'staff@srbakery.com' });

  for (const account of [...defaults, ...staffDefaults]) {
    await User.updateOne(
      { email: account.email },
      {
        $set: {
          name: account.name,
          phone: account.phone,
          password: await bcrypt.hash(account.password, 12),
          role: account.role,
          staffRole: account.staffRole,
          staffPerson: account.staffPerson,
          address: account.address
        }
      },
      { upsert: true }
    );
  }

  const staffUsers = await User.find({ role: 'staff', staffPerson: { $ne: '' } });
  for (const staffUser of staffUsers) {
    await Order.updateMany(
      { assignedPerson: staffUser.staffPerson },
      { assignedTo: staffUser._id, assignedRole: staffUser.staffRole }
    );
  }

  console.log('Default admin and individual staff logins reset successfully. Default customer removed.');
  await mongoose.disconnect();
  process.exit(0);
} catch (error) {
  console.error('Default account reset failed:', error);
  await mongoose.disconnect();
  process.exit(1);
}

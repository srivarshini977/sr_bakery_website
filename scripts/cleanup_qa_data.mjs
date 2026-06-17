import mongoose from '../backend/node_modules/mongoose/index.js';
import Notification from '../backend/models/Notification.js';
import ContactSubmission from '../backend/models/ContactSubmission.js';
import Order from '../backend/models/Order.js';
import User from '../backend/models/User.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/srbakery';
const qaRegex = /QA|test|smoke|Delivery UI|delivery\.ui/i;

await mongoose.connect(MONGODB_URI);

const notifications = await Notification.deleteMany({
  $or: [
    { title: qaRegex },
    { message: qaRegex }
  ]
});

const contacts = await ContactSubmission.deleteMany({
  $or: [
    { name: qaRegex },
    { subject: qaRegex },
    { message: qaRegex },
    { email: qaRegex }
  ]
});

const users = await User.find({
  $or: [
    { name: qaRegex },
    { email: qaRegex }
  ]
}, '_id');
const userIds = users.map((user) => user._id);
const orders = userIds.length > 0 ? await Order.deleteMany({ user: { $in: userIds } }) : { deletedCount: 0 };
const deletedUsers = userIds.length > 0 ? await User.deleteMany({ _id: { $in: userIds } }) : { deletedCount: 0 };

console.log(JSON.stringify({
  deletedNotifications: notifications.deletedCount,
  deletedContacts: contacts.deletedCount,
  deletedOrders: orders.deletedCount,
  deletedUsers: deletedUsers.deletedCount
}, null, 2));

await mongoose.disconnect();

import mongoose from 'mongoose';
import Product from '../models/Product.js';
import { srBakeryMenuItems } from '../data/srBakeryMenu.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/srbakery';

const descriptions = {
  'Starters & 65 Varieties': 'Crispy, spicy starter from the SR Bakery fast-food counter.',
  'Manchurian Specials': 'Saucy Indo-Chinese special prepared fresh to order.',
  'Chicken & Seafood Specials': 'Hot chicken and seafood snack made for quick bites.',
  'Fried Rice': 'Wok-tossed rice with SR Bakery special seasoning.',
  Noodles: 'Fresh noodles tossed with vegetables and signature sauces.',
  Pizza: 'Seven-inch pizza with rich toppings and melted cheese.',
  Burgers: 'Soft bun burger with a crisp patty and house sauce.',
  Sandwiches: 'Toasted sandwich prepared fresh at the counter.',
  Chats: 'Classic street-style chat with bright masala flavor.',
  'Fries & Snacks': 'Crunchy snack counter favorite served hot.',
  'Shawarma Rolls': 'Loaded shawarma roll with creamy house dressing.',
  'Shawarma Plates': 'Generous shawarma plate with fries and fillings.',
  'Bucket Chicken / Family Packs': 'Family-size grilled chicken pack.'
};

try {
  await mongoose.connect(MONGODB_URI);
  await Product.deleteMany({});
  await Product.insertMany(srBakeryMenuItems.map((item) => ({
    ...item,
    description: descriptions[item.category] || 'SR Bakery menu item.',
    productionCost: Math.round(item.price * 0.45),
    stock: 100,
    lowStockThreshold: 10,
    inStock: true
  })));
  console.log(`Synced ${srBakeryMenuItems.length} exact SR Bakery menu items.`);
  await mongoose.disconnect();
  process.exit(0);
} catch (error) {
  console.error('Menu sync failed:', error);
  await mongoose.disconnect();
  process.exit(1);
}

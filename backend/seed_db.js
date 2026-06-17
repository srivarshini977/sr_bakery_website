
import mongoose from 'mongoose';

import User from './models/User.js';
import Product from './models/Product.js';
import Vendor from './models/Vendor.js';
import Inventory from './models/Inventory.js';
import Order from './models/Order.js';
import Notification from './models/Notification.js';
import { srBakeryMenuItems } from './data/srBakeryMenu.js';
import { srBakeryInventoryItems } from './data/srBakeryInventory.js';
import { staffWorkstations } from './data/staffWorkstations.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/srbakery';

const seedData = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to Database. Clearing existing records...');

    await User.deleteMany({});
    await Product.deleteMany({});
    await Vendor.deleteMany({});
    await Inventory.deleteMany({});
    await Order.deleteMany({});
    await Notification.deleteMany({});

    console.log('Inserting default users...');
    const adminPwd = 'Admin@123';
    const staffPwd = 'Staff@123';

    const users = await User.create([
      {
        name: 'Gopinath S (Admin)',
        email: 'admin@srbakery.com',
        phone: '9944019497',
        password: adminPwd,
        role: 'admin',
        address: '233/1A1, Ground Floor, Dindigul–Palani Road, Oddanchatram, Dindigul – 624619'
      },
      ...staffWorkstations.map((station) => ({
        name: station.name,
        email: station.email,
        phone: station.phone,
        password: staffPwd,
        role: 'staff',
        staffRole: station.role,
        staffPerson: station.id,
        address: 'Oddanchatram Town'
      }))
    ]);
    console.log('Users seeded successfully!');

    console.log('Inserting vendors...');
    const vendors = await Vendor.insertMany([
      {
        name: 'Dindigul Flour Mills',
        contactPerson: 'Muthu Kumar',
        phone: '9443210987',
        email: 'muthu@dindigulflour.com',
        address: 'Flour Mill Road, Dindigul',
        deliverySchedule: 'Monday Mornings',
        invoices: [
          { invoiceNumber: 'INV-2026-001', amount: 8500, status: 'Paid' },
          { invoiceNumber: 'INV-2026-002', amount: 12000, status: 'Pending' }
        ]
      },
      {
        name: 'Palani Dairy Farm',
        contactPerson: 'Senthil Velan',
        phone: '9567891234',
        email: 'senthil@palanidairy.com',
        address: 'Dairy Farm Area, Palani',
        deliverySchedule: 'Daily - 6:00 AM',
        invoices: [
          { invoiceNumber: 'INV-2026-003', amount: 4500, status: 'Paid' }
        ]
      }
    ]);
    console.log('Vendors seeded successfully!');

    console.log('Inserting raw inventory...');
    const uniqueInventory = Array.from(
      new Map(srBakeryInventoryItems.map((item) => [item.name, item])).values()
    );
    await Inventory.insertMany(uniqueInventory);
    console.log('Raw inventory seeded successfully!');

    console.log('Inserting products (Menu Items from PDF)...');
    const productsList = [
      // 1. Fried Rice / Starters
      { name: 'Mushroom Fry', price: 65, category: 'Chicken Specials', productionCost: 25 },
      { name: 'Gobi 65', price: 75, category: 'Chicken Specials', productionCost: 30 },
      { name: 'Mushroom 65', price: 85, category: 'Chicken Specials', productionCost: 35 },
      { name: 'Paneer 65', price: 135, category: 'Chicken Specials', productionCost: 55 },
      { name: 'Paneer Manchurian', price: 155, category: 'Chicken Specials', productionCost: 65 },
      { name: 'Mushroom Manchurian', price: 125, category: 'Chicken Specials', productionCost: 50 },
      { name: 'Gobhi Manchurian', price: 125, category: 'Chicken Specials', productionCost: 50 },
      { name: 'Egg Mushroom Fry', price: 75, category: 'Chicken Specials', productionCost: 30 },
      { name: 'Chicken Manchurian', price: 155, category: 'Chicken Specials', productionCost: 65 },
      { name: 'Chicken Fried Lollipop', price: 145, category: 'Chicken Specials', productionCost: 60 },
      { name: 'Chicken Fried Wings', price: 145, category: 'Chicken Specials', productionCost: 60 },
      { name: 'Boneless Chicken 65', price: 135, category: 'Chicken Specials', productionCost: 55 },
      { name: 'Crab Lollipop', price: 115, category: 'Chicken Specials', productionCost: 45 },
      
      // Grilled Chicken
      { name: 'Grilled Chicken (Quarter)', price: 145, category: 'Chicken Specials', productionCost: 60 },
      { name: 'Grilled Chicken (Half)', price: 245, category: 'Chicken Specials', productionCost: 110 },
      { name: 'Grilled Chicken (Full)', price: 465, category: 'Chicken Specials', productionCost: 200 },

      // 2. Fried Rice
      { name: 'Veg Fried Rice', price: 95, category: 'Fried Rice', productionCost: 40 },
      { name: 'Mushroom Fried Rice', price: 125, category: 'Fried Rice', productionCost: 50 },
      { name: 'Paneer Fried Rice', price: 125, category: 'Fried Rice', productionCost: 50 },
      { name: 'Gobhi Fried Rice', price: 125, category: 'Fried Rice', productionCost: 50 },
      { name: 'Egg Fried Rice', price: 105, category: 'Fried Rice', productionCost: 45 },
      { name: 'Chicken Fried Rice', price: 125, category: 'Fried Rice', productionCost: 55 },

      // 3. Noodles
      { name: 'Veg Noodles', price: 95, category: 'Noodles', productionCost: 40 },
      { name: 'Paneer Noodles', price: 125, category: 'Noodles', productionCost: 50 },
      { name: 'Mushroom Noodles', price: 125, category: 'Noodles', productionCost: 50 },
      { name: 'Gobi Noodles', price: 125, category: 'Noodles', productionCost: 50 },
      { name: 'Egg Noodles', price: 105, category: 'Noodles', productionCost: 45 },
      { name: 'Chicken Noodles', price: 125, category: 'Noodles', productionCost: 55 },

      // 4. Pizza
      { name: 'Veg Pizza [7 inches]', price: 125, category: 'Pizza', productionCost: 50 },
      { name: 'Mushroom Pizza [7 inches]', price: 155, category: 'Pizza', productionCost: 65 },
      { name: 'Paneer Pizza [7 inches]', price: 155, category: 'Pizza', productionCost: 65 },
      { name: 'Cheese Pizza [7 inches]', price: 135, category: 'Pizza', productionCost: 55 },
      { name: 'Chicken Pizza [7 inches]', price: 155, category: 'Pizza', productionCost: 70 },

      // 5. Burgers
      { name: 'Veg Burger', price: 115, category: 'Burgers', productionCost: 45 },
      { name: 'Paneer Burger', price: 145, category: 'Burgers', productionCost: 60 },
      { name: 'Cheese Burger', price: 115, category: 'Burgers', productionCost: 45 },
      { name: 'Chicken Burger', price: 145, category: 'Burgers', productionCost: 60 },
      { name: 'Chicken Zinger Burger', price: 165, category: 'Burgers', productionCost: 75 },

      // 6. Sandwiches
      { name: 'Chocolate Sandwich', price: 75, category: 'Sandwiches', productionCost: 30 },
      { name: 'Veg Sandwich', price: 75, category: 'Sandwiches', productionCost: 30 },
      { name: 'Mushroom Sandwich', price: 95, category: 'Sandwiches', productionCost: 40 },
      { name: 'Paneer Sandwich', price: 105, category: 'Sandwiches', productionCost: 45 },
      { name: 'Cheese Sandwich', price: 75, category: 'Sandwiches', productionCost: 30 },
      { name: 'Egg Sandwich', price: 85, category: 'Sandwiches', productionCost: 35 },
      { name: 'Chicken Sandwich', price: 105, category: 'Sandwiches', productionCost: 45 },

      // 7. Chats & Sides
      { name: 'Bhel Puri', price: 65, category: 'Chats', productionCost: 20 },
      { name: 'Pani Puri [5 Pieces]', price: 65, category: 'Chats', productionCost: 20 },
      { name: 'Masala Puri', price: 65, category: 'Chats', productionCost: 20 },
      { name: 'Egg Bhel Puri', price: 85, category: 'Chats', productionCost: 30 },
      { name: 'Bread Omelette', price: 85, category: 'Chats', productionCost: 30 },
      { name: 'Cheese Bread Omelette', price: 95, category: 'Chats', productionCost: 35 },
      { name: 'Potato Garlic Pops', price: 105, category: 'Fries', productionCost: 40 },
      
      // Fries
      { name: 'French Fries', price: 85, category: 'Fries', productionCost: 30 },
      { name: 'Spicy Fries', price: 95, category: 'Fries', productionCost: 35 },
      { name: 'Kung Fu Fries', price: 105, category: 'Fries', productionCost: 40 },

      // 8. Chicken Snacks
      { name: 'Chicken Nuggets [5 Pieces]', price: 115, category: 'Chicken Specials', productionCost: 45 },
      { name: 'Chicken Fingers', price: 115, category: 'Chicken Specials', productionCost: 45 },
      { name: 'Chicken Popcorn', price: 105, category: 'Chicken Specials', productionCost: 40 },
      { name: 'Fish Fingers', price: 125, category: 'Chicken Specials', productionCost: 50 },

      // 9. Shawarma
      { name: 'French Fries Shawarma Roll', price: 135, category: 'Shawarma', productionCost: 55 },
      { name: 'Chicken Shawarma Roll', price: 125, category: 'Shawarma', productionCost: 50 },
      { name: 'Special Chicken Shawarma Roll', price: 145, category: 'Shawarma', productionCost: 60 },
      { name: 'Peri Peri Chicken Shawarma Roll', price: 135, category: 'Shawarma', productionCost: 55 },
      { name: 'Cheese Shawarma Roll', price: 135, category: 'Shawarma', productionCost: 55 },
      { name: 'French Fries Shawarma Plate', price: 135, category: 'Shawarma', productionCost: 55 },
      { name: 'Chicken Shawarma Plate', price: 145, category: 'Shawarma', productionCost: 60 },
      { name: 'Special Chicken Shawarma Plate', price: 175, category: 'Shawarma', productionCost: 75 },
      { name: 'Peri Peri Chicken Shawarma Plate', price: 165, category: 'Shawarma', productionCost: 70 },
      { name: 'Cheese Shawarma Plate', price: 135, category: 'Shawarma', productionCost: 55 },

      // 10. Cakes (seeded from custom weights mapping)
      { name: 'Black Forest Cake [500g]', price: 205, category: 'Cakes', productionCost: 90, description: 'Decadent chocolate layers with fresh cherries and whipped cream.' },
      { name: 'Black Forest Cake [1kg]', price: 375, category: 'Cakes', productionCost: 160, description: 'Decadent chocolate layers with fresh cherries and whipped cream.' },
      { name: 'White Forest Cake [500g]', price: 225, category: 'Cakes', productionCost: 100, description: 'Creamy white chocolate flakes with luscious cherry compote.' },
      { name: 'White Forest Cake [1kg]', price: 425, category: 'Cakes', productionCost: 180, description: 'Creamy white chocolate flakes with luscious cherry compote.' },
      { name: 'Red Velvet Cake [500g]', price: 325, category: 'Cakes', productionCost: 150, description: 'Rich crimson velvet layers with premium cream cheese frosting.' },
      { name: 'Red Velvet Cake [1kg]', price: 625, category: 'Cakes', productionCost: 280, description: 'Rich crimson velvet layers with premium cream cheese frosting.' },

      // 11. Sweets
      { name: 'Special Laddu [250g]', price: 65, category: 'Sweets', productionCost: 30 },
      { name: 'Gulab Jamun [5 Pieces]', price: 75, category: 'Sweets', productionCost: 30 },
      { name: 'Milk Halwa [250g]', price: 120, category: 'Sweets', productionCost: 50 },

      // 12. Beverages
      { name: 'Premium Cold Coffee', price: 75, category: 'Beverages', productionCost: 30 },
      { name: 'Spiced Rose Milk', price: 45, category: 'Beverages', productionCost: 15 },
      { name: 'Thick Badam Milk', price: 45, category: 'Beverages', productionCost: 15 },
      { name: 'Fresh Mint Lime Juice', price: 35, category: 'Beverages', productionCost: 10 },
      { name: 'Masala Tea', price: 20, category: 'Beverages', productionCost: 5 },
      { name: 'Filter Coffee', price: 25, category: 'Beverages', productionCost: 7 }
    ];

    const seededProducts = await Product.insertMany(srBakeryMenuItems.map((item) => ({
      ...item,
      productionCost: Math.round(item.price * 0.45)
    })));
    console.log(`Products seeded successfully! Total: ${seededProducts.length} items.`);

    console.log('Inserting default order to populate analytics...');
    await Order.create({
      user: null,
      guestName: 'Walk-in Customer',
      items: [
        { product: seededProducts[15]._id, name: seededProducts[15].name, quantity: 1, price: seededProducts[15].price },
        { product: seededProducts[30]._id, name: seededProducts[30].name, quantity: 2, price: seededProducts[30].price }
      ],
      totalAmount: seededProducts[15].price + (seededProducts[30].price * 2),
      paymentMethod: 'razorpay',
      paymentStatus: 'Paid',
      orderType: 'delivery',
      status: 'Delivered',
      loyaltyPointsEarned: Math.floor((seededProducts[15].price + (seededProducts[30].price * 2)) / 100)
    });
    console.log('Default orders seeded!');

    console.log('Database seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedData();

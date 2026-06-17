import mongoose from 'mongoose';
import Inventory from '../models/Inventory.js';
import { srBakeryInventoryItems } from '../data/srBakeryInventory.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/srbakery';

try {
  await mongoose.connect(MONGODB_URI);

  const seen = new Set();
  let upserted = 0;
  let skippedDuplicates = 0;

  for (const item of srBakeryInventoryItems) {
    if (seen.has(item.name)) {
      skippedDuplicates += 1;
      continue;
    }
    seen.add(item.name);

    await Inventory.updateOne(
      { name: item.name },
      {
        $setOnInsert: {
          quantity: item.quantity,
          unit: item.unit,
          minThreshold: item.minThreshold,
          costPerUnit: item.costPerUnit,
          lastRestocked: new Date()
        },
        $set: {
          category: item.category
        }
      },
      { upsert: true }
    );
    upserted += 1;
  }

  await Inventory.deleteMany({ name: { $nin: Array.from(seen) } });

  console.log(`Inventory synced: ${upserted} unique items added/updated. ${skippedDuplicates} duplicate category references skipped.`);
  await mongoose.disconnect();
  process.exit(0);
} catch (error) {
  console.error('Inventory sync failed:', error);
  await mongoose.disconnect();
  process.exit(1);
}

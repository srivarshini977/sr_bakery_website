import mongoose from 'mongoose';
import Product from '../models/Product.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/srbakery';

const generatedImages = {
  'French Fries Shawarma Roll': '/uploads/generated-french-fries-shawarma-roll.png',
  'Chicken Shawarma Roll': '/uploads/generated-chicken-shawarma-roll.png',
  'Special Chicken Shawarma Roll': '/uploads/generated-special-chicken-shawarma-roll.png',
  'Peri Peri Chicken Shawarma Roll': '/uploads/generated-peri-peri-chicken-shawarma-roll.png',
  'Cheese Shawarma Roll': '/uploads/generated-cheese-shawarma-roll.png',
  'French Fries Shawarma Plate': '/uploads/generated-french-fries-shawarma-plate.png',
  'Chicken Shawarma Plate': '/uploads/generated-chicken-shawarma-plate.png',
  'Special Chicken Shawarma Plate': '/uploads/generated-special-chicken-shawarma-plate.png',
  'Peri Peri Chicken Shawarma Plate': '/uploads/generated-peri-peri-chicken-shawarma-plate.png',
  'Cheese Shawarma Plate': '/uploads/generated-cheese-shawarma-plate.png'
};

try {
  await mongoose.connect(MONGODB_URI);

  for (const [name, image] of Object.entries(generatedImages)) {
    const result = await Product.updateOne({ name }, { $set: { image } });
    console.log(`${name}: matched ${result.matchedCount}, modified ${result.modifiedCount}`);
  }

  const missing = await Product.find({
    $or: [
      { image: { $exists: false } },
      { image: '' },
      { image: '/placeholder-food.jpg' }
    ]
  }, 'name image').lean();

  console.log(`missing after update: ${missing.length}`);
  if (missing.length) {
    console.log(JSON.stringify(missing, null, 2));
  }
} catch (error) {
  console.error('Unable to assign generated menu images:', error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}

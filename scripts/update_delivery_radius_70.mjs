import mongoose from '../backend/node_modules/mongoose/index.js';
import { updateDeliverySettings } from '../backend/utils/delivery.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/srbakery';

await mongoose.connect(MONGODB_URI);

const settings = await updateDeliverySettings({
  name: 'SR Bakery',
  latitude: 10.3673,
  longitude: 77.9803,
  maxRadiusKm: 70,
  baseSpeedKmph: 35,
  charges: [
    { minKm: 0, maxKm: 5, charge: 0, label: 'Delivery Available' },
    { minKm: 5, maxKm: 15, charge: 30, label: 'Delivery Available + Local Charge' },
    { minKm: 15, maxKm: 30, charge: 60, label: 'Delivery Available + Distance Charge' },
    { minKm: 30, maxKm: 50, charge: 100, label: 'Delivery Available + Long Distance Charge' },
    { minKm: 50, maxKm: 70, charge: 150, label: 'Delivery Available + Extended Radius Charge' }
  ]
});

console.log(JSON.stringify(settings, null, 2));

await mongoose.disconnect();

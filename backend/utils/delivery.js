import Setting from '../models/Setting.js';

const DEFAULT_DELIVERY_SETTINGS = {
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
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const degreesToRadians = (degrees) => degrees * (Math.PI / 180);

export const calculateDistanceKm = (from, to) => {
  const earthRadiusKm = 6371;
  const dLat = degreesToRadians(to.latitude - from.latitude);
  const dLon = degreesToRadians(to.longitude - from.longitude);
  const lat1 = degreesToRadians(from.latitude);
  const lat2 = degreesToRadians(to.latitude);

  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((earthRadiusKm * c).toFixed(2));
};

const estimateCoordinatesFromAddress = (address = '', bakeryLocation) => {
  const source = address.toLowerCase();
  const knownAreas = [
    { words: ['oddanchatram', 'odc'], offset: [0.012, 0.011] },
    { words: ['dindigul'], offset: [0.085, 0.075] },
    { words: ['palani'], offset: [-0.24, -0.11] },
    { words: ['anna nagar'], offset: [0.032, 0.018] },
    { words: ['bus stand', 'market'], offset: [0.018, -0.015] }
  ];

  const match = knownAreas.find((area) => area.words.some((word) => source.includes(word)));
  if (match) {
    return {
      latitude: Number((bakeryLocation.latitude + match.offset[0]).toFixed(6)),
      longitude: Number((bakeryLocation.longitude + match.offset[1]).toFixed(6)),
      source: 'address-estimate'
    };
  }

  const hash = Array.from(source || 'sr bakery customer').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const distanceBucketKm = 2 + (hash % 12);
  const angle = degreesToRadians(hash % 360);
  const latOffset = (Math.cos(angle) * distanceBucketKm) / 111;
  const lonOffset = (Math.sin(angle) * distanceBucketKm) / (111 * Math.cos(degreesToRadians(bakeryLocation.latitude)));

  return {
    latitude: Number((bakeryLocation.latitude + latOffset).toFixed(6)),
    longitude: Number((bakeryLocation.longitude + lonOffset).toFixed(6)),
    source: 'address-estimate'
  };
};

export const getDeliverySettings = async () => {
  const document = await Setting.findOne({ key: 'delivery' });
  return {
    ...DEFAULT_DELIVERY_SETTINGS,
    ...(document?.value || {}),
    charges: document?.value?.charges?.length ? document.value.charges : DEFAULT_DELIVERY_SETTINGS.charges
  };
};

export const updateDeliverySettings = async (settings) => {
  const nextSettings = {
    ...DEFAULT_DELIVERY_SETTINGS,
    ...settings,
    latitude: toNumber(settings.latitude) ?? DEFAULT_DELIVERY_SETTINGS.latitude,
    longitude: toNumber(settings.longitude) ?? DEFAULT_DELIVERY_SETTINGS.longitude,
    maxRadiusKm: toNumber(settings.maxRadiusKm) ?? DEFAULT_DELIVERY_SETTINGS.maxRadiusKm,
    baseSpeedKmph: toNumber(settings.baseSpeedKmph) ?? DEFAULT_DELIVERY_SETTINGS.baseSpeedKmph
  };

  const document = await Setting.findOneAndUpdate(
    { key: 'delivery' },
    { key: 'delivery', value: nextSettings },
    { new: true, upsert: true, runValidators: true }
  );
  return document.value;
};

export const evaluateDelivery = async ({ address, latitude, longitude } = {}) => {
  const settings = await getDeliverySettings();
  const bakery = {
    latitude: Number(settings.latitude),
    longitude: Number(settings.longitude)
  };
  const providedLatitude = toNumber(latitude);
  const providedLongitude = toNumber(longitude);
  const customerLocation = providedLatitude !== null && providedLongitude !== null
    ? { latitude: providedLatitude, longitude: providedLongitude, source: 'customer-location' }
    : estimateCoordinatesFromAddress(address, bakery);

  const distanceKm = calculateDistanceKm(bakery, customerLocation);
  const matchingRule = settings.charges.find((rule) => distanceKm >= rule.minKm && distanceKm <= rule.maxKm);
  const deliveryAvailable = distanceKm <= Number(settings.maxRadiusKm) && Boolean(matchingRule);
  const estimatedTime = Math.max(10, Math.ceil((distanceKm / Number(settings.baseSpeedKmph || 35)) * 60) + 8);

  return {
    bakeryLocation: {
      name: settings.name,
      latitude: bakery.latitude,
      longitude: bakery.longitude
    },
    customerLatitude: customerLocation.latitude,
    customerLongitude: customerLocation.longitude,
    customerLocationSource: customerLocation.source,
    distanceKm,
    estimatedTime,
    deliveryCharge: deliveryAvailable ? Number(matchingRule?.charge || 0) : 0,
    deliveryAvailable,
    serviceAreaStatus: deliveryAvailable ? (matchingRule?.label || 'Delivery Available') : 'Delivery Not Available',
    maxRadiusKm: Number(settings.maxRadiusKm)
  };
};

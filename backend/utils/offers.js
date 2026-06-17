import Coupon from '../models/Coupon.js';

export const getActiveCoupons = async () => {
  const now = new Date();
  return Coupon.find({
    active: true,
    expiryDate: { $gte: now },
    $or: [
      { startDate: { $exists: false } },
      { startDate: null },
      { startDate: { $lte: now } }
    ]
  }).sort({ discountValue: -1, expiryDate: 1 });
};

export const calculateOfferPrice = (price, coupon) => {
  const basePrice = Number(price || 0);
  if (!coupon) return basePrice;
  const value = Number(coupon.discountValue || 0);
  const discounted = coupon.discountType === 'fixed'
    ? basePrice - value
    : basePrice - (basePrice * value / 100);
  return Math.max(0, Math.round(discounted));
};

export const findBestProductOffer = (product, coupons = []) => {
  const productId = product._id?.toString();
  const applicable = coupons.filter((coupon) => {
    if (Number(coupon.minOrderAmount || 0) > Number(product.price || 0)) return false;
    if (!coupon.productIds?.length) return false;
    return coupon.productIds.some((id) => id.toString() === productId);
  });

  if (applicable.length === 0) return null;
  return applicable
    .map((coupon) => ({
      coupon,
      offerPrice: calculateOfferPrice(product.price, coupon)
    }))
    .sort((a, b) => a.offerPrice - b.offerPrice)[0];
};

export const withProductOffer = (product, coupons = []) => {
  const plainProduct = product.toObject ? product.toObject() : product;
  const bestOffer = findBestProductOffer(plainProduct, coupons);
  if (!bestOffer) return plainProduct;

  return {
    ...plainProduct,
    originalPrice: plainProduct.price,
    price: bestOffer.offerPrice,
    activeOffer: {
      _id: bestOffer.coupon._id,
      code: bestOffer.coupon.code,
      title: bestOffer.coupon.title || bestOffer.coupon.code,
      description: bestOffer.coupon.description,
      discountType: bestOffer.coupon.discountType,
      discountValue: bestOffer.coupon.discountValue,
      expiryDate: bestOffer.coupon.expiryDate
    }
  };
};

import React from 'react';
import { resolveMediaUrl } from '../utils/media';

const OfferVisual = ({ offer, discountLabel, className = '' }) => {
  const banner = resolveMediaUrl(offer?.bannerImage);
  const products = offer?.products || [];

  if (banner) {
    return <img src={banner} alt={offer?.title || 'Offer'} className={`h-full w-full object-cover ${className}`} />;
  }

  if (products.length > 0) {
    return (
      <div className={`grid h-full w-full ${products.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} bg-zinc-950 ${className}`}>
        {products.slice(0, 4).map((product) => {
          const image = resolveMediaUrl(product.image);
          return (
            <div key={product._id || product.name} className="relative min-h-0 overflow-hidden border border-black/50 bg-zinc-900">
              {image ? (
                <img src={image} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-black uppercase tracking-widest text-gray-500">
                  {product.name?.slice(0, 2).toUpperCase() || 'SR'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-red-950 to-zinc-950 text-2xl font-black text-white ${className}`}>
      {discountLabel}
    </div>
  );
};

export default OfferVisual;

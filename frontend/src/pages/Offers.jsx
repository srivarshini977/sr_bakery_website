import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import API from '../utils/api';
import { resolveMediaUrl } from '../utils/media';

const formatDiscount = (offer) => {
  if (offer.discountType === 'percentage') return `${offer.discountValue}% OFF`;
  return `Rs. ${offer.discountValue} OFF`;
};

const Offers = () => {
  const { t } = useContext(AuthContext);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const response = await API.get('/products/dynamic/offers');
        setOffers(response.data.data?.offers || []);
      } catch (error) {
        console.error('Failed to fetch offers:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOffers();
  }, []);

  return (
    <div className="w-full px-5 py-12 sm:px-8 lg:px-12 2xl:px-16">
      <h1 className="text-3xl font-bold">{t('navOffers')}</h1>
      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-36 animate-pulse rounded-lg border border-red-900/40 bg-zinc-900/70" />
          ))}
        </div>
      ) : offers.length === 0 ? (
        <div className="mt-6 rounded-lg border border-zinc-800 bg-black/50 p-6 text-gray-300">
          No live offers are available right now.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {offers.map((offer) => {
            const banner = resolveMediaUrl(offer.bannerImage);
            return (
              <article key={offer._id || offer.title} className="overflow-hidden rounded-lg border border-red-900/50 bg-black/60 shadow-xl shadow-black/30">
                <div className="aspect-[16/9] bg-zinc-900">
                  {banner ? (
                    <img src={banner} alt={offer.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-red-950 to-zinc-950 text-3xl font-black text-white">
                      {formatDiscount(offer)}
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-green-900 px-3 py-1 text-xs font-black uppercase tracking-widest text-green-200">{offer.status || 'Active'}</span>
                    {offer.occasion && <span className="text-xs font-black uppercase tracking-widest text-bakery-gold">{offer.occasion}</span>}
                  </div>
                  <h2 className="text-xl font-extrabold text-white">{offer.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-gray-300">{offer.description}</p>
                  <p className="mt-4 text-3xl font-black text-red-300">{formatDiscount(offer)}</p>
                  {offer.products?.length > 0 && (
                    <div className="mt-4 space-y-1 text-xs text-gray-400">
                      {offer.products.slice(0, 4).map((product) => (
                        <p key={product._id}>{product.name}</p>
                      ))}
                    </div>
                  )}
                  {offer.expiryDate && (
                    <p className="mt-4 text-xs font-bold text-gray-500">Valid till {new Date(offer.expiryDate).toLocaleDateString()}</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Offers;

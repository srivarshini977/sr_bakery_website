import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import API from '../utils/api';

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
          {offers.map((offer) => (
            <article key={offer._id || offer.title} className="glass-card rounded-lg border border-red-900/50 p-6">
              {offer.occasion && <p className="mb-2 text-xs font-black uppercase tracking-widest text-bakery-gold">{offer.occasion}</p>}
              <h2 className="text-xl font-extrabold text-white">{offer.title}</h2>
              <p className="mt-3 text-sm leading-6 text-gray-300">{offer.description}</p>
              {offer.products?.length > 0 && (
                <div className="mt-4 space-y-1 text-xs text-gray-400">
                  {offer.products.map((product) => (
                    <p key={product._id}>{product.name}</p>
                  ))}
                </div>
              )}
              <div className="mt-4 flex items-end gap-3">
                {offer.originalPrice && Number(offer.originalPrice) > Number(offer.price) && (
                  <p className="text-sm font-bold text-gray-500 line-through">Rs. {offer.originalPrice}</p>
                )}
                <p className="text-2xl font-black text-red-300">Rs. {offer.price}</p>
              </div>
              {offer.expiryDate && (
                <p className="mt-2 text-xs text-gray-500">Valid till {new Date(offer.expiryDate).toLocaleDateString()}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default Offers;

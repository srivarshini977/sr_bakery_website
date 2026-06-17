import React, { useContext, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';
import Hero from '../components/Hero';
import API from '../utils/api';
import { resolveMediaUrl } from '../utils/media';

const categoryGradients = {
  '65 Varieties': 'from-red-950 to-amber-950',
  Manchurian: 'from-red-950 to-zinc-950',
  'Chicken Specials': 'from-red-950 to-amber-950',
  'Fried Rice': 'from-orange-950 to-red-950',
  Noodles: 'from-amber-950 to-orange-950',
  Pizza: 'from-yellow-950 to-red-950',
  Burgers: 'from-amber-900 to-amber-950',
  Sandwiches: 'from-yellow-900 to-amber-950',
  Chats: 'from-amber-900 to-yellow-950',
  'Fries & Snacks': 'from-yellow-900 to-yellow-950',
  Shawarma: 'from-red-900 to-rose-950',
  'Shawarma Rolls': 'from-red-900 to-rose-950',
  'Shawarma Plates': 'from-red-900 to-rose-950',
  'Bucket Chicken': 'from-red-950 to-amber-950'
};

const FeaturedPlaceholder = ({ item, className = '' }) => (
  <div className={`flex h-full min-h-64 w-full items-center justify-center bg-gradient-to-br ${categoryGradients[item?.category] || 'from-zinc-900 to-black'} ${className}`}>
    <div className="px-5 text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-black/30 text-2xl font-black text-white">
        {(item?.category || 'SR').slice(0, 2).toUpperCase()}
      </span>
      <p className="mt-3 text-xs font-black uppercase tracking-widest text-white/60">Upload photo in admin</p>
    </div>
  </div>
);

const FeaturedImage = ({ item, special = false, className = '', placeholderClassName = '' }) => {
  const [failed, setFailed] = useState(false);
  const image = resolveMediaUrl(special ? (item?.specialImage || item?.image) : item?.image);

  useEffect(() => {
    setFailed(false);
  }, [image]);

  if (!image || failed) {
    return <FeaturedPlaceholder item={item} className={placeholderClassName} />;
  }

  return (
    <img
      src={image}
      alt={special ? 'Today special' : item?.name || 'Featured item'}
      className={`${className} bg-black object-cover object-center`}
      onError={() => setFailed(true)}
    />
  );
};

const Home = () => {
  const { t } = useContext(AuthContext);
  const [featuredItems, setFeaturedItems] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const response = await API.get('/products/dynamic/featured');
        setFeaturedItems(response.data.data?.products || []);
      } catch (error) {
        console.error('Failed to fetch featured products:', error);
      } finally {
        setLoadingFeatured(false);
      }
    };
    fetchFeatured();
    API.get('/reviews/public')
      .then((response) => setReviews(response.data.data?.reviews || []))
      .catch((error) => console.error('Failed to fetch reviews:', error));
  }, []);

  const todaySpecial = featuredItems[0];
  const stats = [
    ['1000+', 'Orders Delivered'],
    ['500+', 'Happy Customers'],
    ['50+', 'Menu Items'],
    ['10+', 'Staff Members']
  ];

  return (
    <div className="flex min-h-screen w-full flex-col items-stretch justify-start">
      <Hero title={t('heroHeading')} subtitle={t('heroSubheading')} ctaText={t('orderNow')} />

      <section className="w-full px-5 py-10 sm:px-8 lg:px-12 2xl:px-16">
        <div className="grid items-start gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-lg border border-red-900/50 bg-black/60">
            <div className="grid md:grid-cols-[minmax(0,1fr)_280px] lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="min-w-0 p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-bakery-gold">Today's Special</p>
                <h2 className="mt-3 line-clamp-2 text-2xl font-black text-white md:text-3xl">{todaySpecial?.specialTitle || todaySpecial?.name || 'Fresh SR Bakery Special'}</h2>
                <p className="mt-3 line-clamp-4 text-sm leading-6 text-gray-300">{todaySpecial?.specialDescription || todaySpecial?.description || 'Freshly made food, sweets and bakery treats ready for today.'}</p>
                <p className="mt-4 text-xl font-black text-red-300">{todaySpecial ? `Rs. ${todaySpecial.price}` : 'Order now'}</p>
              </div>
              <div className="relative h-56 w-full overflow-hidden bg-black sm:h-64 md:h-72 md:max-h-72">
                <FeaturedImage item={todaySpecial} special className="absolute inset-0 h-full w-full" />
              </div>
            </div>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            {stats.map(([value, label], index) => (
              <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="rounded-lg border border-red-900/40 bg-zinc-950 p-5 text-center">
                <p className="text-3xl font-black text-white">{value}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-widest text-gray-400">{label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full px-5 py-14 sm:px-8 md:py-16 lg:px-12 2xl:px-16">
        <h2 className="text-2xl font-bold text-white mb-6">Best Selling Items</h2>
        {loadingFeatured ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-80 animate-pulse rounded-lg border border-red-900/40 bg-zinc-900/70" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
            {featuredItems.map((item) => (
              <article
                key={item._id}
                className="group overflow-hidden rounded-lg border border-red-900/50 bg-black/50 shadow-xl shadow-black/30"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-black">
                  <FeaturedImage item={item} className="absolute inset-0 h-full w-full transition duration-500 group-hover:scale-105" placeholderClassName="min-h-0 transition duration-500 group-hover:scale-105" />
                </div>
                <div className="p-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-bakery-gold">{item.category}</p>
                  <h3 className="mt-2 text-lg font-extrabold text-white">{item.name}</h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-300">{item.description}</p>
                  <p className="mt-3 text-lg font-black text-red-300">Rs. {item.price}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="w-full px-5 pb-16 sm:px-8 lg:px-12 2xl:px-16">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-bakery-gold">Customer Love</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Testimonials & Recent Reviews</h2>
          </div>
        </div>
        {reviews.length === 0 ? (
          <div className="rounded-lg border border-red-900/40 bg-zinc-950 p-6 text-gray-400">Reviews will appear here after delivered orders.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {reviews.slice(0, 6).map((review) => (
              <motion.article key={review._id} whileHover={{ y: -4 }} className="rounded-lg border border-red-900/40 bg-black/55 p-5">
                <p className="text-yellow-300">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</p>
                <h3 className="mt-3 font-black text-white">{review.title || 'Fresh and tasty'}</h3>
                <p className="mt-2 line-clamp-4 text-sm leading-6 text-gray-300">{review.comment}</p>
                <p className="mt-4 text-xs font-bold uppercase tracking-widest text-red-300">{review.user?.name || 'Customer'}</p>
              </motion.article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;

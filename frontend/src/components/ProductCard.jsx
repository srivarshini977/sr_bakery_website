import React, { useContext, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Heart, ShoppingBag } from 'lucide-react';
import { resolveMediaUrl } from '../utils/media';

const ProductCard = ({ product }) => {
  const { addToCart, user, wishlist, toggleWishlist, t } = useContext(AuthContext);
  const [added, setAdded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setImageFailed(false);
  }, [product._id, product.image, product.imageUrl]);

  const handleAdd = () => {
    if (!user || user.role !== 'customer') {
      navigate('/login');
      return;
    }

    try {
      const imgRect = document.querySelector(`#product-card-${product._id}`)?.getBoundingClientRect();
      window.dispatchEvent(new CustomEvent('sr:add-to-cart', { detail: { productId: product._id, rect: imgRect } }));
    } catch (e) {
      // Animation is optional.
    }

    if (!addToCart(product)) return;
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const getGradientForCategory = (category) => {
    const maps = {
      'Starters & 65 Varieties': 'from-red-950 to-amber-950',
      'Manchurian Specials': 'from-red-950 to-zinc-950',
      'Chicken & Seafood Specials': 'from-red-950 to-amber-950',
      'Fried Rice': 'from-orange-950 to-red-950',
      Noodles: 'from-amber-950 to-orange-950',
      Pizza: 'from-yellow-950 to-red-950',
      Burgers: 'from-amber-900 to-amber-950',
      Sandwiches: 'from-yellow-900 to-amber-950',
      Chats: 'from-amber-900 to-yellow-950',
      'Fries & Snacks': 'from-yellow-900 to-yellow-950',
      'Shawarma Rolls': 'from-red-900 to-rose-950',
      'Shawarma Plates': 'from-red-900 to-rose-950',
      'Bucket Chicken / Family Packs': 'from-red-950 to-amber-950',
    };
    return maps[category] || 'from-zinc-800 to-zinc-950';
  };

  const primaryImage = resolveMediaUrl(product.image || product.imageUrl || (product.images && product.images[0]) || '');
  const imgSrc = imageFailed ? '' : primaryImage;
  const isStarred = wishlist.includes(product._id);
  const categoryInitial = (product.category || 'SR').slice(0, 2).toUpperCase();

  return (
    <motion.article
      whileHover={{ scale: 1.02 }}
      layout
      id={`product-card-${product._id}`}
      className="glass-card group relative flex min-h-[370px] flex-col overflow-hidden rounded-lg border-bakery-cardBorder"
    >
      <span className="absolute left-3 top-3 z-10 max-w-[calc(100%-4rem)] truncate rounded bg-bakery-red/85 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white">
        {product.category}
      </span>

      <button
        onClick={() => toggleWishlist(product._id)}
        className="absolute right-3 top-3 z-10 rounded-full bg-bakery-black/60 p-2 text-gray-400 backdrop-blur transition-all hover:bg-bakery-black/80 hover:text-bakery-red active:scale-90"
        aria-label="Toggle wishlist"
      >
        <Heart size={16} fill={isStarred ? '#b30000' : 'none'} className={isStarred ? 'text-bakery-red' : ''} />
      </button>

      <div className="relative h-44 w-full overflow-hidden bg-zinc-900 sm:h-48">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={product.name}
            className="block h-full w-full bg-black object-cover object-center transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              setImageFailed(true);
            }}
          />
        ) : (
          <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${getGradientForCategory(product.category)} transition-transform duration-500 group-hover:scale-110`}>
            <div className="text-center">
              <span className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-black/30 text-xl font-black text-white shadow-[0_0_18px_rgba(255,255,255,0.18)]">
                {categoryInitial}
              </span>
              <span className="block text-xs font-black uppercase tracking-widest text-white/60">SR Special</span>
            </div>
          </div>
        )}
        <div className="absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 bg-bakery-red transition-transform duration-300 group-hover:scale-x-100" />
      </div>

      <div className="flex flex-grow flex-col justify-between p-4">
        <div>
          <h3 className="line-clamp-2 min-h-[2.5rem] text-base font-extrabold tracking-wide text-white transition-colors group-hover:text-bakery-red">
            {product.name}
          </h3>
          <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-gray-400">
            {product.description || 'Freshly prepared SR Bakery special item with premium taste.'}
          </p>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{t('price')}</span>
            {product.originalPrice && Number(product.originalPrice) > Number(product.price) ? (
              <>
                <span className="text-xs font-bold text-gray-500 line-through">Rs. {product.originalPrice}</span>
                <span className="text-lg font-black text-bakery-gold transition-colors group-hover:text-white">
                  Rs. {product.price}
                </span>
                <span className="mt-1 w-fit rounded bg-green-900 px-2 py-0.5 text-[10px] font-black uppercase text-green-200">
                  {product.activeOffer?.title || 'Today Offer'}
                </span>
              </>
            ) : (
              <span className="text-lg font-black text-white transition-colors group-hover:text-bakery-gold">
                Rs. {product.price}
              </span>
            )}
          </div>

          {product.inStock ? (
            <motion.button
              onClick={handleAdd}
              disabled={added}
              whileTap={{ scale: 0.96 }}
              className={`flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-lg px-3 py-2.5 text-xs font-black uppercase tracking-wider transition-all duration-300 sm:px-4 ${
                added
                  ? 'bg-green-600 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]'
                  : 'border border-transparent bg-bakery-red text-white shadow-[0_0_10px_rgba(179,0,0,0.3)] hover:border-bakery-red hover:bg-transparent hover:text-bakery-red'
              }`}
            >
              <ShoppingBag size={14} />
              <span>{added ? t('addedToCart') : t('addToCart')}</span>
            </motion.button>
          ) : (
            <span className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs font-bold uppercase text-gray-500">
              {t('outOfStock')}
            </span>
          )}
        </div>
      </div>
    </motion.article>
  );
};

export default ProductCard;

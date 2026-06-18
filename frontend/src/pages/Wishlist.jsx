import React, { useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { resolveMediaUrl } from '../utils/media';

const Wishlist = () => {
  const {
    user,
    wishlistItems,
    refreshWishlist,
    toggleWishlist,
    removeFromWishlist,
    addToCart,
    showToast
  } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    refreshWishlist().catch((error) => console.error('Unable to refresh wishlist:', error));
  }, [user?._id]);

  const handleRemove = async (productId) => {
    await toggleWishlist(productId);
  };

  const handleAddToCart = async (product) => {
    if (addToCart(product)) {
      try {
        await removeFromWishlist(product._id, { silent: true });
      } catch (error) {
        console.error('Unable to remove moved cart item from wishlist:', error);
      }
      showToast('Moved to Cart');
    }
  };

  return (
    <div className="w-full px-5 py-12 sm:px-8 lg:px-12 2xl:px-16">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-bakery-gold">Customer Wishlist</p>
          <h1 className="mt-2 text-3xl font-black text-white">Wishlist ({wishlistItems.length})</h1>
        </div>
        <Link to="/menu" className="w-fit rounded bg-bakery-red px-4 py-2 text-sm font-bold text-white hover:bg-red-800">
          Browse Menu
        </Link>
      </div>

      {wishlistItems.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-8 text-center">
          <Heart className="mx-auto text-bakery-red" size={36} />
          <h2 className="mt-4 text-xl font-black text-white">No wishlist items yet</h2>
          <p className="mt-2 text-gray-400">Tap the heart on any menu item to save it here.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {wishlistItems.map((product) => {
            const image = resolveMediaUrl(product.image);
            return (
              <article key={product._id} className="overflow-hidden rounded-lg border border-red-900/40 bg-zinc-950">
                <div className="aspect-[4/3] bg-zinc-900">
                  {image ? (
                    <img src={image} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-bold uppercase tracking-widest text-gray-500">
                      No image
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-bakery-gold">{product.category}</p>
                  <h2 className="mt-2 line-clamp-2 min-h-12 text-lg font-black text-white">{product.name}</h2>
                  <p className="mt-3 text-xl font-black text-red-300">Rs. {product.price}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={!product.inStock}
                      className="inline-flex items-center justify-center gap-2 rounded bg-bakery-red px-3 py-2 text-sm font-bold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ShoppingBag size={16} /> Cart
                    </button>
                    <button
                      onClick={() => handleRemove(product._id)}
                      className="inline-flex items-center justify-center gap-2 rounded bg-zinc-800 px-3 py-2 text-sm font-bold text-white hover:bg-zinc-700"
                    >
                      <Trash2 size={16} /> Remove
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Wishlist;

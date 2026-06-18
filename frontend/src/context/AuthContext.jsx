import React, { createContext, useEffect, useState } from 'react';
import API from '../utils/api';

export const AuthContext = createContext();

const dictionary = {
  brandName: 'SR Bakery',
  slogan: 'Fuel on the Fly, Treat with a Smile.',
  heroHeading: 'Fresh Cakes Every Day',
  heroSubheading: 'Traditional Tamil sweets, birthday cakes, chats, fast food, fresh juices and cool drinks from SR Bakery.',
  orderNow: 'Order Now',
  exploreMenu: 'Explore Menu',
  navHome: 'Home',
  navAbout: 'About',
  navMenu: 'Menu',
  navOffers: 'Offers',
  navContact: 'Contact',
  navCart: 'Cart',
  navCheckout: 'Checkout',
  navLogin: 'Login',
  navSignup: 'Sign Up',
  navDashboard: 'Dashboard',
  traditionText: 'Serving fresh taste with tradition and quality.',
  addToCart: 'Add to Cart',
  addedToCart: 'Added',
  price: 'Price',
  searchPlaceholder: 'Search for delicious food...',
  whatsappFloating: 'Chat on WhatsApp',
  aboutHeading: 'About SR Bakery',
  footerCopy: '(c) 2026 SR Bakery. All rights reserved. Created for premium street food lovers.',
  adminPanel: 'Admin Panel',
  staffPanel: 'Staff Panel',
  outOfStock: 'Out of Stock',
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('sr_bakery_token') || '');
  const [loading, setLoading] = useState(true);

  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem('sr_bakery_cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  const [wishlist, setWishlist] = useState(() => {
    const savedWish = localStorage.getItem('sr_bakery_wishlist');
    return savedWish ? JSON.parse(savedWish) : [];
  });
  const [wishlistItems, setWishlistItems] = useState([]);
  const [toast, setToast] = useState('');

  const logout = () => {
    localStorage.removeItem('sr_bakery_token');
    localStorage.removeItem('sr_bakery_cart');
    localStorage.removeItem('sr_bakery_wishlist');
    setToken('');
    setUser(null);
    setCart([]);
    setWishlist([]);
    setWishlistItems([]);
  };

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await API.get('/auth/me');
        setUser(res.data.data.user);
      } catch (_err) {
        console.error('Session expired or invalid token');
        logout();
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token]);

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(window.__srToastTimer);
    window.__srToastTimer = window.setTimeout(() => setToast(''), 1800);
  };

  const refreshWishlist = async () => {
    if (!token || !user || user.role !== 'customer') {
      setWishlist([]);
      setWishlistItems([]);
      return [];
    }

    const response = await API.get('/wishlist');
    const items = response.data.data?.wishlist || [];
    setWishlistItems(items);
    setWishlist(items.map((item) => item._id));
    localStorage.setItem('sr_bakery_wishlist', JSON.stringify(items.map((item) => item._id)));
    return items;
  };

  useEffect(() => {
    if (!loading) {
      refreshWishlist().catch((error) => console.error('Unable to load wishlist:', error));
    }
  }, [loading, token, user?._id, user?.role]);

  useEffect(() => {
    localStorage.setItem('sr_bakery_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'customer')) {
      setCart([]);
    }
  }, [loading, user]);

  const signup = async (name, email, phone, password, address) => {
    const res = await API.post('/auth/signup', { name, email, phone, password, address });
    const { token: newToken, data } = res.data;
    localStorage.setItem('sr_bakery_token', newToken);
    setToken(newToken);
    setUser(data.user);
    return data.user;
  };

  const login = async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    const { token: newToken, data } = res.data;
    localStorage.setItem('sr_bakery_token', newToken);
    setToken(newToken);
    setUser(data.user);
    return data.user;
  };

  const addToCart = (product, quantity = 1) => {
    if (!user || user.role !== 'customer') {
      return false;
    }

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item._id === product._id);
      if (existing) {
        return prevCart.map((item) =>
          item._id === product._id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prevCart, { ...product, quantity }];
    });
    return true;
  };

  const removeFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item._id !== productId));
  };

  const updateCartQty = (productId, qty) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) => (item._id === productId ? { ...item, quantity: qty } : item))
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const toggleWishlist = async (productId) => {
    if (!user || user.role !== 'customer') {
      return { ok: false, message: 'Login to use wishlist' };
    }

    const isWishlisted = wishlist.includes(productId);
    const response = isWishlisted
      ? await API.delete(`/wishlist/remove/${productId}`)
      : await API.post('/wishlist/add', { productId });
    const items = response.data.data?.wishlist || [];
    const ids = items.map((item) => item._id);
    setWishlistItems(items);
    setWishlist(ids);
    localStorage.setItem('sr_bakery_wishlist', JSON.stringify(ids));
    showToast(isWishlisted ? 'Removed from Wishlist' : 'Added to Wishlist');
    return { ok: true, wishlisted: !isWishlisted };
  };

  const removeFromWishlist = async (productId, options = {}) => {
    if (!user || user.role !== 'customer') {
      return { ok: false, message: 'Login to use wishlist' };
    }

    const response = await API.delete(`/wishlist/remove/${productId}`);
    const items = response.data.data?.wishlist || [];
    const ids = items.map((item) => item._id);
    setWishlistItems(items);
    setWishlist(ids);
    localStorage.setItem('sr_bakery_wishlist', JSON.stringify(ids));
    if (!options.silent) {
      showToast('Removed from Wishlist');
    }
    return { ok: true, wishlist: items };
  };

  const t = (key) => dictionary[key] || key;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        signup,
        login,
        logout,
        t,
        cart,
        addToCart,
        removeFromCart,
        updateCartQty,
        clearCart,
        wishlist,
        wishlistItems,
        wishlistCount: wishlist.length,
        toggleWishlist,
        removeFromWishlist,
        refreshWishlist,
        toast,
        showToast,
      }}
    >
      {toast && (
        <div className="fixed right-5 top-24 z-[80] rounded-lg border border-red-800 bg-zinc-950 px-4 py-3 text-sm font-bold text-white shadow-2xl shadow-black/50">
          {toast}
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
};

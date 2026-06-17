import React, { createContext, useEffect, useState } from 'react';
import API from '../utils/api';

export const AuthContext = createContext();

const dictionary = {
  brandName: 'SR Bakery',
  slogan: 'Fuel on the Fly, Treat with a Smile.',
  heroHeading: 'Freshly Made Everyday Just For You!',
  heroSubheading: 'From delicious cakes to traditional sweets, fast food to chats - everything you love!',
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

  const logout = () => {
    localStorage.removeItem('sr_bakery_token');
    localStorage.removeItem('sr_bakery_cart');
    setToken('');
    setUser(null);
    setCart([]);
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

  useEffect(() => {
    localStorage.setItem('sr_bakery_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'customer')) {
      setCart([]);
    }
  }, [loading, user]);

  useEffect(() => {
    localStorage.setItem('sr_bakery_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

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

  const toggleWishlist = (productId) => {
    setWishlist((prevWish) =>
      prevWish.includes(productId) ? prevWish.filter((id) => id !== productId) : [...prevWish, productId]
    );
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
        toggleWishlist,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

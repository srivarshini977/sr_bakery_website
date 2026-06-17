import React, { useContext, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Award, Heart, LogOut, Menu, Shield, ShoppingCart, User, X } from 'lucide-react';
import NotificationBell from './NotificationBell';
import bakeryLogo from '../assets/sr-bakery-logo.svg';

const Navbar = () => {
  const { user, logout, t, cart, wishlistCount } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const totalCartQty = cart.reduce((sum, item) => sum + item.quantity, 0);
  const navLinks = [
    { name: t('navHome'), path: '/' },
    { name: t('navAbout'), path: '/about' },
    { name: t('navMenu'), path: '/menu' },
    { name: t('navOffers'), path: '/offers' },
    { name: 'Gallery', path: '/gallery' },
    { name: t('navContact'), path: '/contact' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav
      className={`fixed left-0 top-0 z-50 w-full transition-all duration-300 ${
        isScrolled
          ? 'bg-bakery-black/95 py-2 shadow-neon-red backdrop-blur-md lg:py-3'
          : 'bg-bakery-black/80 py-3 backdrop-blur-sm lg:bg-transparent lg:py-5'
      }`}
    >
      <div className="w-full px-5 sm:px-8 lg:px-12 2xl:px-16">
        <div className="flex h-16 items-center justify-between gap-3">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-bakery-red bg-white shadow-[0_0_10px_rgba(179,0,0,0.8)] sm:h-12 sm:w-12">
              <img src={bakeryLogo} alt="SR Bakery logo" className="h-full w-full object-contain p-1" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-lg font-black tracking-wider text-white sm:text-2xl">
                SR <span className="text-bakery-red">BAKERY</span>
              </span>
              <span className="-mt-1 text-[9px] font-bold uppercase tracking-widest text-bakery-gold">
                Oddanchatram
              </span>
              <span className="mt-0.5 hidden text-[10px] text-gray-300 xl:block">{t('slogan')}</span>
            </div>
          </Link>

          <div className="hidden items-center gap-6 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-semibold tracking-wider transition-colors duration-200 hover:text-bakery-red ${
                  isActive(link.path) ? 'border-b-2 border-bakery-red pb-1 text-bakery-red' : 'text-gray-300'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-4 lg:flex">
            <Link id="sr-cart-icon" to="/cart" className="relative p-2 text-gray-300 transition-colors hover:text-bakery-red">
              <ShoppingCart size={22} className="transition-transform hover:scale-110" />
              {totalCartQty > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-bakery-black bg-bakery-red text-[10px] font-black text-white">
                  {totalCartQty}
                </span>
              )}
            </Link>
            {user?.role === 'customer' && (
              <Link to="/wishlist" className="relative inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-bold text-gray-300 transition hover:bg-white/5 hover:text-bakery-red">
                <Heart size={20} />
                <span>Wishlist</span>
                {wishlistCount > 0 && (
                  <span className="rounded-full bg-bakery-red px-2 py-0.5 text-[10px] font-black text-white">{wishlistCount}</span>
                )}
              </Link>
            )}

            {user ? (
              <div className="flex items-center gap-3">
                <NotificationBell />
                {user.role === 'admin' && (
                  <Link to="/admin" className="flex items-center gap-1 rounded border border-bakery-red/40 bg-bakery-red/20 px-2 py-1 text-xs font-bold text-bakery-red">
                    <Shield size={12} />
                    <span>{t('adminPanel')}</span>
                  </Link>
                )}
                {user.role === 'staff' && (
                  <Link to="/staff" className="flex items-center gap-1 rounded border border-yellow-500/40 bg-yellow-500/20 px-2 py-1 text-xs font-bold text-yellow-500">
                    <Award size={12} />
                    <span>{t('staffPanel')}</span>
                  </Link>
                )}
                <Link to="/dashboard" className="flex items-center gap-1 text-sm font-bold text-white transition-colors hover:text-bakery-red">
                  <User size={18} />
                  <span className="max-w-24 truncate">{user.name.split(' ')[0]}</span>
                </Link>
                <button onClick={handleLogout} className="p-2 text-gray-400 transition-colors hover:text-bakery-red" title="Logout">
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="text-sm font-bold text-gray-300 transition-colors hover:text-white">
                  {t('navLogin')}
                </Link>
                <Link to="/signup" className="rounded bg-bakery-red px-3 py-2 text-sm font-bold text-white shadow-neon-red hover:bg-bakery-red/90">
                  {t('navSignup')}
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 lg:hidden">
            <Link to="/cart" className="relative p-1 text-gray-300 hover:text-bakery-red">
              <ShoppingCart size={22} />
              {totalCartQty > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-bakery-black bg-bakery-red text-[9px] font-black text-white">
                  {totalCartQty}
                </span>
              )}
            </Link>
            {user?.role === 'customer' && (
              <Link to="/wishlist" className="relative p-1 text-gray-300 hover:text-bakery-red" aria-label="Wishlist">
                <Heart size={22} />
                {wishlistCount > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-bakery-black bg-bakery-red px-1 text-[9px] font-black text-white">
                    {wishlistCount}
                  </span>
                )}
              </Link>
            )}
            <button onClick={() => setIsOpen((open) => !open)} className="p-1 text-gray-300 hover:text-white" aria-label="Toggle navigation menu">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="glass-card mx-4 my-2 space-y-3 rounded-lg border-bakery-red/30 px-3 py-4 shadow-neon-red-strong lg:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`block rounded-md px-3 py-2 text-base font-semibold hover:bg-white/5 ${
                isActive(link.path) ? 'bg-white/5 font-extrabold text-bakery-red' : 'text-gray-300'
              }`}
            >
              {link.name}
            </Link>
          ))}

          <div className="border-t border-gray-800 pt-3">
            {user ? (
              <div className="space-y-3 px-3">
                <div className="text-sm font-semibold text-gray-400">
                  Logged in as: <span className="text-white">{user.name}</span>
                </div>
                <Link to="/dashboard" className="flex items-center gap-2 py-1 text-sm text-gray-300 hover:text-bakery-red">
                  <User size={16} />
                  <span>My Account</span>
                </Link>
                {user.role === 'customer' && (
                  <Link to="/wishlist" className="flex items-center gap-2 py-1 text-sm text-gray-300 hover:text-bakery-red">
                    <Heart size={16} />
                    <span>Wishlist ({wishlistCount})</span>
                  </Link>
                )}
                {user.role === 'admin' && (
                  <Link to="/admin" className="flex items-center gap-2 py-1 text-sm font-bold text-bakery-red">
                    <Shield size={16} />
                    <span>{t('adminPanel')}</span>
                  </Link>
                )}
                {user.role === 'staff' && (
                  <Link to="/staff" className="flex items-center gap-2 py-1 text-sm font-bold text-yellow-500">
                    <Award size={16} />
                    <span>{t('staffPanel')}</span>
                  </Link>
                )}
                <button onClick={handleLogout} className="flex items-center gap-2 py-1 text-sm text-gray-400 hover:text-bakery-red">
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 px-3">
                <Link to="/login" className="rounded border border-gray-600 py-2 text-center text-sm font-semibold text-gray-300 hover:bg-white/5">
                  {t('navLogin')}
                </Link>
                <Link to="/signup" className="rounded bg-bakery-red py-2 text-center text-sm font-bold text-white shadow-neon-red hover:bg-bakery-red/90">
                  {t('navSignup')}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

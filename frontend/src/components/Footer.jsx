import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Clock, Facebook, Instagram, Mail, MapPin, Phone, Twitter } from 'lucide-react';

const Footer = () => {
  const { t } = useContext(AuthContext);

  return (
    <footer className="relative overflow-hidden border-t-2 border-bakery-brown bg-bakery-black pt-12 pb-8 text-gray-400 sm:pt-16">
      <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-transparent via-bakery-red to-transparent" />

      <div className="w-full px-5 sm:px-8 lg:px-12 2xl:px-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <h3 className="text-xl font-black tracking-wider text-white">
              SR <span className="text-bakery-red">BAKERY</span>
            </h3>
            <p className="text-sm leading-relaxed">
              Serving street food, oven-fresh cakes and traditional sweets in Oddanchatram. Fuel on the fly, treat with a smile.
            </p>
            <div className="flex gap-4 pt-2">
              <a href="#" className="rounded-full bg-bakery-brown p-2 text-white transition-all hover:bg-bakery-red" aria-label="Facebook">
                <Facebook size={18} />
              </a>
              <a href="#" className="rounded-full bg-bakery-brown p-2 text-white transition-all hover:bg-bakery-red" aria-label="Instagram">
                <Instagram size={18} />
              </a>
              <a href="#" className="rounded-full bg-bakery-brown p-2 text-white transition-all hover:bg-bakery-red" aria-label="Twitter">
                <Twitter size={18} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-4 border-l-4 border-bakery-red pl-3 text-sm font-bold uppercase tracking-wider text-white">
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="transition-colors hover:text-bakery-red">Home</Link></li>
              <li><Link to="/menu" className="transition-colors hover:text-bakery-red">Explore Menu</Link></li>
              <li><Link to="/offers" className="transition-colors hover:text-bakery-red">Promo Deals</Link></li>
              <li><Link to="/about" className="transition-colors hover:text-bakery-red">Our Story</Link></li>
              <li><Link to="/contact" className="transition-colors hover:text-bakery-red">Contact Us</Link></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="mb-4 border-l-4 border-bakery-red pl-3 text-sm font-bold uppercase tracking-wider text-white">
              Contact Info
            </h4>
            <div className="flex items-start gap-3 text-sm">
              <MapPin size={24} className="shrink-0 text-bakery-red" />
              <span>233/1A1, Ground Floor, Dindigul-Palani Road, Near Keerthi Supermarket, Oddanchatram, Dindigul - 624619</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone size={18} className="shrink-0 text-bakery-red" />
              <span>+91 9944019497</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Mail size={18} className="shrink-0 text-bakery-red" />
              <span className="break-all">gopilion47@gmail.com</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Clock size={18} className="shrink-0 text-bakery-red" />
              <span>Daily: 8:00 AM - 10:00 PM</span>
            </div>
          </div>

          <div>
            <h4 className="mb-4 border-l-4 border-bakery-red pl-3 text-sm font-bold uppercase tracking-wider text-white">
              Our Location
            </h4>
            <div className="relative flex h-36 w-full flex-col justify-between overflow-hidden rounded-lg border border-bakery-red/25 bg-zinc-950 p-4 shadow-[0_0_15px_rgba(179,0,0,0.15)]">
              <div>
                <p className="text-sm font-bold text-white">SR Bakery, Oddanchatram</p>
                <p className="mt-2 text-xs leading-5 text-gray-400">Dindigul-Palani Road, near Keerthi Supermarket.</p>
              </div>
              <a
                href="https://www.google.com/maps/search/?api=1&query=Oddanchatram%20SR%20Bakery"
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center gap-2 rounded bg-bakery-red px-3 py-2 text-xs font-bold text-white hover:bg-bakery-red/90"
              >
                <MapPin size={14} /> Open in Maps
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-800 pt-6 text-center text-xs sm:mt-12 sm:pt-8">
          <p>{t('footerCopy')}</p>
          <p className="mt-2 text-gray-600">GST: 33ATOPG4810D1Z3 | License No: 12423004000189</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const FloatingCartAnim = () => {
  const [flies, setFlies] = useState([]);

  useEffect(() => {
    const handler = (e) => {
      const detail = e.detail || {};
      const rect = detail.rect;
      if (!rect) return;

      const start = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };

      // find cart icon
      const cartEl = document.getElementById('sr-cart-icon');
      const cartRect = cartEl ? cartEl.getBoundingClientRect() : { left: window.innerWidth - 60, top: 40 };
      const end = { x: cartRect.left + cartRect.width / 2, y: cartRect.top + cartRect.height / 2 };

      const id = Date.now() + Math.random();
      setFlies((s) => [...s, { id, start, end }]);

      // cleanup after animation duration
      setTimeout(() => setFlies((s) => s.filter(f => f.id !== id)), 900);
    };

    window.addEventListener('sr:add-to-cart', handler);
    return () => window.removeEventListener('sr:add-to-cart', handler);
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50">
      {flies.map((f) => (
        <motion.div
          key={f.id}
          initial={{ x: f.start.x, y: f.start.y, scale: 0.8, opacity: 0.95 }}
          animate={{ x: f.end.x, y: f.end.y, scale: 0.25, opacity: 0.1 }}
          transition={{ duration: 0.9, ease: 'easeInOut' }}
          style={{ position: 'absolute', translateX: '-50%', translateY: '-50%' }}
        >
          <div className="w-10 h-10 rounded-full bg-bakery-red shadow-neon-red flex items-center justify-center text-white font-black">+</div>
        </motion.div>
      ))}
    </div>
  );
};

export default FloatingCartAnim;

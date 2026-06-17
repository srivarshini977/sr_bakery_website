import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';
import heroImage from '../assets/hero.png';

const Hero = ({ title, subtitle, ctaText }) => {
  const { t } = useContext(AuthContext);

  return (
    <section className="relative w-full overflow-hidden bg-bakery-black">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(179,0,0,0.28),transparent_34%),linear-gradient(135deg,#0b0b0b_0%,#111_48%,#2b0808_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-bakery-black to-transparent" />

      <div className="relative mx-auto grid min-h-[calc(100svh-5rem)] max-w-7xl grid-cols-1 items-center gap-8 px-4 py-8 sm:px-6 md:grid-cols-[minmax(0,1.02fr)_minmax(300px,0.78fr)] md:py-12 lg:px-10">
        <motion.div
          initial={{ x: -28, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="max-w-[720px] pt-2 md:pt-0"
        >
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-bakery-gold sm:mb-4 sm:text-xs sm:tracking-[0.28em]">
            SR Bakery - Oddanchatram
          </p>
          <h1 className="max-w-[12ch] text-[clamp(2.7rem,13vw,6.6rem)] font-black leading-[0.98] text-white sm:max-w-[11ch] sm:text-[clamp(3.25rem,8vw,6.6rem)]">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-[clamp(1rem,4vw,1.55rem)] font-semibold leading-relaxed text-gray-300 sm:mt-7">
            {subtitle || t('slogan')}
          </p>
          <div className="mt-7 flex max-w-2xl flex-col items-stretch gap-3 sm:mt-9 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-4">
            <Link
              to="/menu"
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-bakery-red px-8 text-base font-black text-white shadow-neon-red transition hover:bg-red-800 sm:w-auto"
            >
              {ctaText}
            </Link>
            <span className="text-sm font-bold text-gray-300 sm:text-base">
              Fuel on the Fly, Treat with a Smile.
            </span>
            <Link to="/about" className="text-sm font-bold text-gray-300 underline underline-offset-4 hover:text-white sm:text-base">
              Learn more
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
          className="block"
        >
          <div className="relative mx-auto aspect-[16/11] w-full overflow-hidden rounded-lg border border-bakery-red/40 bg-zinc-950 shadow-neon-red-strong md:ml-auto md:aspect-[4/5] md:max-h-[620px] md:min-h-[420px]">
            <img
              src={heroImage}
              alt="SR Bakery featured food display"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-bakery-gold">
                Fresh Counter
              </p>
              <p className="mt-2 text-lg font-black text-white">
                Cakes, sweets, snacks and fast food under one roof.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;

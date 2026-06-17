import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import storefrontImage from '../assets/about-storefront.jpg';
import interiorImage from '../assets/about-interior.jpg';

const About = () => {
  const { t } = useContext(AuthContext);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
      <section className="grid items-center gap-8 md:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-bakery-red">Our Story</p>
          <h1 className="mt-3 text-3xl font-extrabold text-white md:text-5xl">
            {t('aboutHeading') || 'About SR Bakery'}
          </h1>
          <p className="mt-5 text-base leading-8 text-gray-300 md:text-lg">
            SR Bakery began in 2022 as the dream of two brothers who wanted to build a friendly
            neighborhood bakery for Oddanchatram. What started with fresh bakes and everyday snacks
            has grown into a busy stop for cakes, sweets, fast food, chats, shawarma and family treats.
          </p>
          <p className="mt-4 text-base leading-8 text-gray-300">
            Every day, the team keeps the counter full, the kitchen active and the service simple:
            fresh food, fair prices and a warm welcome for every customer who walks in.
          </p>
        </div>
        <div className="overflow-hidden rounded-lg border border-red-900/50 bg-black shadow-2xl shadow-black/40">
          <img src={storefrontImage} alt="SR Bakery storefront in Oddanchatram" className="h-full w-full object-cover" />
        </div>
      </section>

      <section className="mt-12 grid gap-8 md:grid-cols-[0.95fr_1.05fr]">
        <div className="overflow-hidden rounded-lg border border-red-900/50 bg-black shadow-2xl shadow-black/40">
          <img src={interiorImage} alt="Inside SR Bakery" className="h-full w-full object-cover" />
        </div>
        <div className="grid gap-5">
          <div className="rounded-lg border border-red-900/50 bg-black/55 p-6">
            <h2 className="text-xl font-extrabold text-white">Fresh Counter, Full Menu</h2>
            <p className="mt-3 leading-7 text-gray-300">
              From celebration cakes and traditional sweets to burgers, pizza, noodles, fried rice and
              chicken specials, SR Bakery brings bakery favorites and fast food under one roof.
            </p>
          </div>
          <div className="rounded-lg border border-red-900/50 bg-black/55 p-6">
            <h2 className="text-xl font-extrabold text-white">Location</h2>
            <p className="mt-3 leading-7 text-gray-300">
              233/1A1, Ground Floor, Dindigul-Palani Road, Oddanchatram, Dindigul - 624619.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;

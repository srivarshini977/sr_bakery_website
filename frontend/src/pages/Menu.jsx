import React, { useContext, useEffect, useState } from 'react';
import API from '../utils/api';
import ProductCard from '../components/ProductCard';
import { AuthContext } from '../context/AuthContext';
import { srBakeryCategoryOrder, srBakeryMenuNames } from '../data/srBakeryMenu';

const isCustomerMenuProduct = (product) => {
  const text = [product.name, product.category, product.description].filter(Boolean).join(' ');
  return !/\b(QA|test|smoke)\b/i.test(text);
};

const Menu = () => {
  const { t } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await API.get('/products');
        const fetched = (res.data.data.products || []).filter(isCustomerMenuProduct);
        const exactMenu = fetched.sort((a, b) => {
          const categoryA = srBakeryCategoryOrder.indexOf(a.category);
          const categoryB = srBakeryCategoryOrder.indexOf(b.category);
          const categoryDiff = (categoryA === -1 ? 999 : categoryA) - (categoryB === -1 ? 999 : categoryB);
          if (categoryDiff !== 0) return categoryDiff;
          const nameA = srBakeryMenuNames.indexOf(a.name);
          const nameB = srBakeryMenuNames.indexOf(b.name);
          return (nameA === -1 ? 9999 : nameA) - (nameB === -1 ? 9999 : nameB) || a.name.localeCompare(b.name);
        });

        setProducts(exactMenu);
        const existingCats = Array.from(new Set(exactMenu.map((product) => product.category).filter(Boolean)));
        const cats = [
          ...srBakeryCategoryOrder.filter((category) => existingCats.includes(category)),
          ...existingCats.filter((category) => !srBakeryCategoryOrder.includes(category)).sort()
        ];
        setCategories(['All', ...cats]);
      } catch (err) {
        console.error('Failed fetching products', err);
        setError('Menu is temporarily unavailable. Please make sure the backend server is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const filtered = products.filter((product) => {
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="w-full px-5 py-8 sm:px-8 lg:px-12 2xl:px-16">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-bakery-red">SR Bakery</p>
          <h1 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">{t('navMenu')}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300 sm:text-base">
            Browse the live SR Bakery food menu with today&apos;s prices and offers.
          </p>
        </div>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('searchPlaceholder')}
          className="min-h-12 w-full rounded-lg border border-gray-700 bg-gray-900 px-4 text-white outline-none transition focus:border-bakery-red lg:w-80"
        />
      </div>

      <div className="mb-8 flex gap-3 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition ${
              selectedCategory === cat
                ? 'bg-bakery-red text-white shadow-neon-red'
                : 'bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-[370px] animate-pulse rounded-lg border border-red-900/30 bg-zinc-900/60" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/40 p-5 text-red-100">
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-lg border border-red-900/50 bg-black/50 p-8 text-center text-gray-300">
          No menu items found for this search.
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Menu;

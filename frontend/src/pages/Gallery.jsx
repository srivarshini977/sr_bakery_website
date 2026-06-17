import React, { useEffect, useMemo, useState } from 'react';
import API from '../utils/api';
import { resolveMediaUrl } from '../utils/media';

const Gallery = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await API.get('/products');
        setProducts(response.data.data?.products || []);
      } catch (error) {
        console.error('Error loading gallery products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const galleryItems = useMemo(() => (
    products
      .map((product) => {
        const image = resolveMediaUrl(product.image);
        return image ? {
          id: product._id,
          name: product.name,
          category: product.category,
          image
        } : null;
      })
      .filter(Boolean)
  ), [products]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-bold uppercase tracking-widest text-bakery-gold">Gallery</p>
        <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">SR Bakery Gallery</h1>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-64 animate-pulse rounded-lg border border-zinc-800 bg-zinc-900" />
          ))}
        </div>
      ) : galleryItems.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-8 text-center text-gray-400">
          No gallery images available.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {galleryItems.map((item) => (
            <figure key={item.id} className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
              <img src={item.image} alt={item.name} className="aspect-[4/3] w-full object-cover" loading="lazy" />
              <figcaption className="px-4 py-3">
                <p className="truncate text-sm font-bold text-white">{item.name}</p>
                <p className="mt-1 truncate text-xs text-gray-400">{item.category}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
};

export default Gallery;

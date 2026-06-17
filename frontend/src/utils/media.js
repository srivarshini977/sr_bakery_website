const BACKEND_ORIGIN = import.meta.env.VITE_API_ORIGIN || 'http://localhost:5000';

export const resolveMediaUrl = (url, fallback = '') => {
  if (!url || url === '/placeholder-food.jpg') return fallback;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (url.startsWith('/uploads/')) return `${BACKEND_ORIGIN}${url}`;
  return url;
};

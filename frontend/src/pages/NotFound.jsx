import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="min-h-[60vh] flex items-center justify-center px-4">
    <div className="glass-card border border-red-900 rounded-lg p-8 text-center max-w-lg">
      <p className="text-red-300 font-black uppercase">404</p>
      <h1 className="text-3xl font-black text-white mt-2">Page not found</h1>
      <p className="text-gray-400 mt-3">This counter is closed, but the menu is still hot.</p>
      <Link to="/" className="inline-block mt-6 bg-red-700 hover:bg-red-800 text-white px-6 py-3 rounded-lg font-bold">
        Go Home
      </Link>
    </div>
  </div>
);

export default NotFound;

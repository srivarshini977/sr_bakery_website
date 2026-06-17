import React, { useEffect, useState, useContext } from 'react';
import API from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { resolveMediaUrl } from '../utils/media';

const AdminImageUpload = () => {
  const { t } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState('');
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await API.get('/products');
        setProducts(res.data.data.products || []);
      } catch (e) {}
    };
    fetch();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selected || !file) return setStatus('Select product and file');
    try {
      setStatus('Uploading...');
      const form = new FormData();
      form.append('image', file);
      const up = await API.post('/uploads', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = up.data.data.url;
      // update product image
      await API.patch(`/products/${selected}`, { image: url });
      setStatus('Uploaded and product updated');
      // refresh products
      const res = await API.get('/products');
      setProducts(res.data.data.products || []);
    } catch (err) {
      setStatus('Upload failed');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h2 className="text-2xl font-bold mb-4">Admin — Upload Product Images</h2>
      <form onSubmit={handleUpload} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Product</label>
          <select value={selected} onChange={e=>setSelected(e.target.value)} className="w-full bg-gray-900 border border-gray-700 p-2 rounded">
            <option value="">Select product...</option>
            {products.map(p=> <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Image File</label>
          <input type="file" accept="image/*" onChange={e=>setFile(e.target.files[0])} />
        </div>

        <div>
          <button className="px-4 py-2 bg-bakery-red text-white rounded" type="submit">Upload</button>
          <span className="ml-4 text-sm text-gray-300">{status}</span>
        </div>
      </form>

      <div className="grid grid-cols-3 gap-4 mt-8">
        {products.map(p=> (
          <div key={p._id} className="glass-card p-2 rounded">
            <div className="relative h-36 w-full overflow-hidden rounded bg-black">
              <img src={resolveMediaUrl(p.image)} alt={p.name} className="absolute inset-0 h-full w-full object-cover object-center" />
            </div>
            <div className="mt-2 text-sm font-bold">{p.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminImageUpload;

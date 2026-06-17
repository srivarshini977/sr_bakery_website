import React, { useEffect, useMemo, useState } from 'react';
import { ImagePlus, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import API from '../utils/api';
import { resolveMediaUrl } from '../utils/media';

const emptyForms = {
  ingredient: { name: '', category: 'General', quantity: 0, unit: 'kg', minThreshold: 10, costPerUnit: 0, supplier: '' },
  food: { name: '', price: 0, category: '', image: '', description: '', stock: 100, lowStockThreshold: 10, productionCost: 0, inStock: true },
  category: { name: '', description: '', sortOrder: 0, active: true },
  staff: { name: '', email: '', phone: '', password: 'Staff@123', staffRole: 'chef', staffPerson: '' },
  vendor: { name: '', contactPerson: '', phone: '', email: '', address: '', deliverySchedule: 'Weekly', supplierProducts: [] },
  coupon: { code: '', title: '', occasion: '', description: '', discountType: 'percentage', discountValue: 10, minOrderAmount: 0, startDate: '', expiryDate: '', active: true, productIds: [] },
  role: { name: '', description: '', permissions: ['orders:view'], active: true },
  todaySpecial: { productId: '', image: '', title: '', description: '', active: true },
  bakery: { name: 'SR Bakery', phone: '', email: '', address: '', workingHours: '8:00 AM - 10:00 PM' },
  delivery: { name: 'SR Bakery', latitude: 10.3673, longitude: 77.9803, maxRadiusKm: 70, baseSpeedKmph: 35 }
};

const tabs = [
  { id: 'ingredients', label: 'Ingredient Management' },
  { id: 'food', label: 'Food Item Creator' },
  { id: 'photos', label: 'Photos & Today Special' },
  { id: 'categories', label: 'Category Management' },
  { id: 'staff', label: 'Staff Management' },
  { id: 'vendors', label: 'Vendor Management' },
  { id: 'offers', label: 'Offer & Coupon Management' },
  { id: 'settings', label: 'Bakery Settings' },
  { id: 'roles', label: 'Roles & Permissions' }
];

const inputClass = 'w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white';
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded bg-red-700 px-3 py-2 text-sm font-bold text-white hover:bg-red-800';

const MasterManagement = () => {
  const [activeTab, setActiveTab] = useState('ingredients');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [data, setData] = useState({
    ingredients: [],
    products: [],
    categories: [],
    staff: [],
    vendors: [],
    coupons: [],
    roles: []
  });
  const [forms, setForms] = useState(emptyForms);
  const [productPhoto, setProductPhoto] = useState({ productId: '', file: null, saving: false });
  const [todaySpecialFile, setTodaySpecialFile] = useState(null);

  const products = data.products || [];
  const ingredients = data.ingredients || [];
  const vendors = data.vendors || [];
  const categories = data.categories || [];

  const lowStockIngredients = useMemo(() => ingredients.filter((item) => Number(item.quantity) <= Number(item.minThreshold)), [ingredients]);

  const setForm = (key, patch) => {
    setForms((current) => ({
      ...current,
      [key]: { ...current[key], ...patch }
    }));
  };

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [
        summaryRes,
        ingredientsRes,
        productsRes,
        categoriesRes,
        staffRes,
        vendorsRes,
        couponsRes,
        settingsRes,
        rolesRes,
        todaySpecialRes
      ] = await Promise.all([
        API.get('/master/summary'),
        API.get('/master/ingredients'),
        API.get('/master/food-items'),
        API.get('/master/categories'),
        API.get('/master/staff'),
        API.get('/master/vendors'),
        API.get('/master/coupons'),
        API.get('/master/settings'),
        API.get('/master/roles'),
        API.get('/master/today-special')
      ]);

      setSummary(summaryRes.data.data?.summary || null);
      setData({
        ingredients: ingredientsRes.data.data?.ingredients || [],
        products: productsRes.data.data?.products || [],
        categories: categoriesRes.data.data?.categories || [],
        staff: staffRes.data.data?.staff || [],
        vendors: vendorsRes.data.data?.vendors || [],
        coupons: couponsRes.data.data?.coupons || [],
        roles: rolesRes.data.data?.roles || []
      });
      setForms((current) => ({
        ...current,
        bakery: settingsRes.data.data?.settings?.bakery || emptyForms.bakery,
        delivery: settingsRes.data.data?.settings?.delivery || emptyForms.delivery,
        todaySpecial: {
          ...emptyForms.todaySpecial,
          ...(todaySpecialRes.data.data?.todaySpecial || {})
        }
      }));
    } catch (error) {
      console.error('Error loading master data:', error);
      alert(error.response?.data?.message || 'Unable to load master data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    const refresh = () => fetchAll();
    window.addEventListener('sr:master-refresh', refresh);
    return () => window.removeEventListener('sr:master-refresh', refresh);
  }, []);

  const createItem = async (endpoint, formKey, resetValue = emptyForms[formKey]) => {
    try {
      await API.post(`/master/${endpoint}`, forms[formKey]);
      if (formKey === 'staff') {
        alert(`Staff login saved.\nLogin email: ${forms.staff.email}\nInitial password: ${forms.staff.password}`);
      }
      setForms((current) => ({ ...current, [formKey]: resetValue }));
      fetchAll();
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to save');
    }
  };

  const updateItem = async (endpoint, id, payload) => {
    try {
      await API.patch(`/master/${endpoint}/${id}`, payload);
      fetchAll();
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to update');
    }
  };

  const deleteItem = async (endpoint, id) => {
    if (!window.confirm('Delete this record?')) return;
    try {
      await API.delete(`/master/${endpoint}/${id}`);
      fetchAll();
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to delete');
    }
  };

  const saveSettings = async () => {
    try {
      await API.patch('/master/settings', { bakery: forms.bakery, delivery: forms.delivery });
      fetchAll();
      alert('Bakery settings saved');
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to save settings');
    }
  };

  const uploadImageFile = async (file) => {
    const uploadForm = new FormData();
    uploadForm.append('image', file);
    const uploadRes = await API.post('/uploads', uploadForm, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return uploadRes.data.data?.url;
  };

  const saveProductPhoto = async () => {
    if (!productPhoto.productId || !productPhoto.file) {
      alert('Select a menu item and image file');
      return;
    }
    try {
      setProductPhoto((current) => ({ ...current, saving: true }));
      const imageUrl = await uploadImageFile(productPhoto.file);
      await API.patch(`/master/food-items/${productPhoto.productId}`, { image: imageUrl });
      setProductPhoto({ productId: '', file: null, saving: false });
      fetchAll();
      alert('Menu photo uploaded and saved');
    } catch (error) {
      setProductPhoto((current) => ({ ...current, saving: false }));
      alert(error.response?.data?.message || 'Unable to upload product photo');
    }
  };

  const saveTodaySpecial = async () => {
    if (!forms.todaySpecial.productId) {
      alert('Select a menu item for Today Special');
      return;
    }
    try {
      const imageUrl = todaySpecialFile ? await uploadImageFile(todaySpecialFile) : forms.todaySpecial.image;
      await API.patch('/master/today-special', { ...forms.todaySpecial, image: imageUrl, active: true });
      setForm('todaySpecial', { image: imageUrl, active: true });
      setTodaySpecialFile(null);
      fetchAll();
      alert("Today's Special saved");
    } catch (error) {
      alert(error.response?.data?.message || "Unable to save Today's Special");
    }
  };

  const resetStaffPassword = async (staffId) => {
    const password = window.prompt('Enter new password', 'Staff@123');
    if (!password) return;
    try {
      await API.patch(`/master/staff/${staffId}/reset-password`, { password });
      alert('Password reset successfully');
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to reset password');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-3xl font-black text-white">Master Management</h2>
          <p className="text-sm text-gray-400">Central controls for inventory, menu, staff, vendors, offers, settings, and permissions.</p>
        </div>
        <button onClick={fetchAll} className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 font-bold text-white hover:bg-zinc-700">
          <RefreshCw size={16} /> {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          {[
            ['Ingredients', summary.ingredientCount],
            ['Food Items', summary.productCount],
            ['Categories', summary.categoryCount],
            ['Staff', summary.staffCount],
            ['Vendors', summary.vendorCount],
            ['Coupons', summary.activeCouponCount],
            ['Roles', summary.roleCount]
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="mt-1 text-2xl font-black text-white">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold ${activeTab === tab.id ? 'bg-red-700 text-white' : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'ingredients' && (
        <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <h3 className="text-xl font-bold text-white">Add Ingredient</h3>
            <div className="mt-4 grid gap-3">
              <input className={inputClass} placeholder="Ingredient name" value={forms.ingredient.name} onChange={(e) => setForm('ingredient', { name: e.target.value })} />
              <input className={inputClass} placeholder="Category" value={forms.ingredient.category} onChange={(e) => setForm('ingredient', { category: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <input className={inputClass} type="number" placeholder="Stock" value={forms.ingredient.quantity} onChange={(e) => setForm('ingredient', { quantity: Number(e.target.value) })} />
                <input className={inputClass} placeholder="Unit" value={forms.ingredient.unit} onChange={(e) => setForm('ingredient', { unit: e.target.value })} />
                <input className={inputClass} type="number" placeholder="Threshold" value={forms.ingredient.minThreshold} onChange={(e) => setForm('ingredient', { minThreshold: Number(e.target.value) })} />
                <input className={inputClass} type="number" placeholder="Cost per unit" value={forms.ingredient.costPerUnit} onChange={(e) => setForm('ingredient', { costPerUnit: Number(e.target.value) })} />
              </div>
              <select className={inputClass} value={forms.ingredient.supplier} onChange={(e) => setForm('ingredient', { supplier: e.target.value })}>
                <option value="">No supplier</option>
                {vendors.map((vendor) => <option key={vendor._id} value={vendor._id}>{vendor.name}</option>)}
              </select>
              <button className={buttonClass} onClick={() => createItem('ingredients', 'ingredient')}><Plus size={16} /> Add Ingredient</button>
            </div>
            {lowStockIngredients.length > 0 && (
              <div className="mt-4 rounded border border-yellow-800 bg-yellow-950/40 p-3 text-sm text-yellow-100">
                {lowStockIngredients.length} ingredient stock alert{lowStockIngredients.length === 1 ? '' : 's'} need attention.
              </div>
            )}
          </div>
          <EditableTable
            title="Ingredient Stock"
            rows={ingredients}
            columns={['name', 'category', 'quantity', 'unit', 'minThreshold', 'costPerUnit']}
            endpoint="ingredients"
            updateItem={updateItem}
            deleteItem={deleteItem}
            batchSave
          />
        </section>
      )}

      {activeTab === 'food' && (
        <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <h3 className="text-xl font-bold text-white">Create Food Item</h3>
            <div className="mt-4 grid gap-3">
              <input className={inputClass} placeholder="Food item name" value={forms.food.name} onChange={(e) => setForm('food', { name: e.target.value })} />
              <select className={inputClass} value={forms.food.category} onChange={(e) => setForm('food', { category: e.target.value })}>
                <option value="">Select category</option>
                {categories.map((category) => <option key={category._id} value={category.name}>{category.name}</option>)}
              </select>
              <input className={inputClass} placeholder="Image URL or uploaded /uploads path" value={forms.food.image} onChange={(e) => setForm('food', { image: e.target.value })} />
              <textarea className={inputClass} placeholder="Description" value={forms.food.description} onChange={(e) => setForm('food', { description: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <input className={inputClass} type="number" placeholder="Price" value={forms.food.price} onChange={(e) => setForm('food', { price: Number(e.target.value) })} />
                <input className={inputClass} type="number" placeholder="Stock" value={forms.food.stock} onChange={(e) => setForm('food', { stock: Number(e.target.value) })} />
                <input className={inputClass} type="number" placeholder="Low stock" value={forms.food.lowStockThreshold} onChange={(e) => setForm('food', { lowStockThreshold: Number(e.target.value) })} />
                <input className={inputClass} type="number" placeholder="Production cost" value={forms.food.productionCost} onChange={(e) => setForm('food', { productionCost: Number(e.target.value) })} />
              </div>
              <button className={buttonClass} onClick={() => createItem('food-items', 'food')}><Plus size={16} /> Create Food Item</button>
            </div>
          </div>
          <EditableTable title="Food Items" rows={products} columns={['name', 'category', 'price', 'stock', 'lowStockThreshold', 'productionCost', 'image', 'inStock']} endpoint="food-items" updateItem={updateItem} deleteItem={deleteItem} batchSave />
        </section>
      )}

      {activeTab === 'photos' && (
        <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="text-xl font-bold text-white">Upload Menu Photo</h3>
              <div className="mt-4 grid gap-3">
                <select
                  className={inputClass}
                  value={productPhoto.productId}
                  onChange={(event) => setProductPhoto((current) => ({ ...current, productId: event.target.value }))}
                >
                  <option value="">Select menu item</option>
                  {products.map((product) => <option key={product._id} value={product._id}>{product.name} - {product.category}</option>)}
                </select>
                <input
                  className={inputClass}
                  type="file"
                  accept="image/*"
                  onChange={(event) => setProductPhoto((current) => ({ ...current, file: event.target.files?.[0] || null }))}
                />
                <button className={buttonClass} onClick={saveProductPhoto} disabled={productPhoto.saving}>
                  <ImagePlus size={16} /> {productPhoto.saving ? 'Uploading...' : 'Upload & Save Menu Photo'}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="text-xl font-bold text-white">Today&apos;s Special</h3>
              <div className="mt-4 grid gap-3">
                <select className={inputClass} value={forms.todaySpecial.productId} onChange={(event) => setForm('todaySpecial', { productId: event.target.value, active: true })}>
                  <option value="">Select special item</option>
                  {products.map((product) => <option key={product._id} value={product._id}>{product.name} - Rs. {product.price}</option>)}
                </select>
                <input className={inputClass} placeholder="Special title" value={forms.todaySpecial.title || ''} onChange={(event) => setForm('todaySpecial', { title: event.target.value })} />
                <textarea className={inputClass} placeholder="Special description" value={forms.todaySpecial.description || ''} onChange={(event) => setForm('todaySpecial', { description: event.target.value })} />
                <input className={inputClass} placeholder="Current image path" value={forms.todaySpecial.image || ''} onChange={(event) => setForm('todaySpecial', { image: event.target.value })} />
                <input className={inputClass} type="file" accept="image/*" onChange={(event) => {
                  setTodaySpecialFile(event.target.files?.[0] || null);
                  setForm('todaySpecial', { active: true });
                }} />
                <p className="text-xs font-bold uppercase tracking-widest text-green-300">Saving this form shows it on the home page.</p>
                <button className={buttonClass} onClick={saveTodaySpecial}><Save size={16} /> Save Today&apos;s Special</button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <h3 className="text-xl font-bold text-white">Menu Photo Preview</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => {
                const image = resolveMediaUrl(product.image);
                return (
                  <article key={product._id} className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
                    <div className="relative aspect-[4/3] overflow-hidden bg-black">
                      {image ? (
                        <img
                          src={image}
                          alt={product.name}
                          className="absolute inset-0 block h-full w-full object-cover object-center"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-zinc-950 text-xs font-bold uppercase tracking-widest text-gray-500">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-1 font-bold text-white">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.image || 'No image saved'}</p>
                    </div>
                  </article>
                );
              })}
              {products.length === 0 && <p className="col-span-full rounded-lg border border-zinc-800 p-6 text-center text-gray-500">Create menu items first.</p>}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'categories' && (
        <section className="grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
          <QuickForm title="Add Category" fields={['name', 'description', 'sortOrder']} form={forms.category} formKey="category" setForm={setForm} onSubmit={() => createItem('categories', 'category')} />
          <EditableTable title="Categories" rows={categories} columns={['name', 'description', 'sortOrder', 'active']} endpoint="categories" updateItem={updateItem} deleteItem={deleteItem} />
        </section>
      )}

      {activeTab === 'staff' && (
        <section className="grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <h3 className="text-xl font-bold text-white">Create Staff Login</h3>
            <p className="mt-1 text-sm text-gray-500">The email entered here is saved as the staff login ID.</p>
            <div className="mt-4 grid gap-3">
              {['name', 'email', 'phone', 'password', 'staffRole', 'staffPerson'].map((field) => (
                <input
                  key={field}
                  className={inputClass}
                  type={field === 'password' ? 'text' : field === 'email' ? 'email' : 'text'}
                  placeholder={field === 'staffPerson' ? 'Assigned dashboard page, e.g. kitchen' : field}
                  value={forms.staff[field] || ''}
                  onChange={(event) => setForm('staff', { [field]: event.target.value })}
                />
              ))}
              <button className={buttonClass} onClick={() => createItem('staff', 'staff')}><Plus size={16} /> Save Staff Login</button>
            </div>
          </div>
          <ListPanel title="Staff Accounts" rows={data.staff} endpoint="staff" deleteItem={deleteItem} render={(staff) => (
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-bold text-white">{staff.name}</p>
                <p className="text-sm text-gray-400">Login email: {staff.email}</p>
                <p className="text-sm text-gray-500">{staff.staffRole || 'staff'} | {staff.staffPerson || 'No page'}</p>
              </div>
              <button onClick={() => resetStaffPassword(staff._id)} className="rounded bg-zinc-800 px-3 py-2 text-xs font-bold text-white hover:bg-zinc-700">Reset Password</button>
            </div>
          )} />
        </section>
      )}

      {activeTab === 'vendors' && (
        <section className="grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
          <QuickForm title="Add Vendor" fields={['name', 'contactPerson', 'phone', 'email', 'address', 'deliverySchedule']} form={forms.vendor} formKey="vendor" setForm={setForm} onSubmit={() => createItem('vendors', 'vendor')} />
          <EditableTable title="Vendors" rows={vendors} columns={['name', 'contactPerson', 'phone', 'email', 'deliverySchedule']} endpoint="vendors" updateItem={updateItem} deleteItem={deleteItem} />
        </section>
      )}

      {activeTab === 'offers' && (
        <section className="grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <h3 className="text-xl font-bold text-white">Create Offer / Coupon</h3>
            <div className="mt-4 grid gap-3">
              <input className={inputClass} placeholder="Coupon code" value={forms.coupon.code} onChange={(e) => setForm('coupon', { code: e.target.value.toUpperCase() })} />
              <input className={inputClass} placeholder="Offer title, e.g. Diwali Special" value={forms.coupon.title} onChange={(e) => setForm('coupon', { title: e.target.value })} />
              <input className={inputClass} placeholder="Occasion" value={forms.coupon.occasion} onChange={(e) => setForm('coupon', { occasion: e.target.value })} />
              <textarea className={inputClass} placeholder="Description" value={forms.coupon.description} onChange={(e) => setForm('coupon', { description: e.target.value })} />
              <select className={inputClass} value={forms.coupon.discountType} onChange={(e) => setForm('coupon', { discountType: e.target.value })}>
                <option value="percentage">Percentage discount</option>
                <option value="fixed">Fixed rupees discount</option>
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input className={inputClass} type="number" placeholder="Discount value" value={forms.coupon.discountValue} onChange={(e) => setForm('coupon', { discountValue: Number(e.target.value) })} />
                <input className={inputClass} type="number" placeholder="Min order" value={forms.coupon.minOrderAmount} onChange={(e) => setForm('coupon', { minOrderAmount: Number(e.target.value) })} />
                <input className={inputClass} type="date" value={forms.coupon.startDate || ''} onChange={(e) => setForm('coupon', { startDate: e.target.value })} />
                <input className={inputClass} type="date" value={forms.coupon.expiryDate || ''} onChange={(e) => setForm('coupon', { expiryDate: e.target.value })} />
              </div>
              <select
                multiple
                className={`${inputClass} min-h-36`}
                value={forms.coupon.productIds}
                onChange={(e) => setForm('coupon', { productIds: Array.from(e.target.selectedOptions).map((option) => option.value) })}
              >
                {products.map((product) => <option key={product._id} value={product._id}>{product.name} - Rs. {product.price}</option>)}
              </select>
              <p className="text-xs text-gray-500">Hold Ctrl and click to select combo items. The reduced price appears in Menu and Offers only while the offer date is valid.</p>
              <button className={buttonClass} onClick={() => createItem('coupons', 'coupon')}><Plus size={16} /> Save Offer</button>
            </div>
          </div>
          <EditableTable title="Coupons" rows={data.coupons} columns={['code', 'discountType', 'discountValue', 'minOrderAmount', 'expiryDate', 'active']} endpoint="coupons" updateItem={updateItem} deleteItem={deleteItem} />
        </section>
      )}

      {activeTab === 'settings' && (
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <h3 className="text-xl font-bold text-white">Bakery Settings</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {['name', 'phone', 'email', 'address', 'workingHours'].map((field) => (
              <input key={field} className={inputClass} placeholder={field} value={forms.bakery[field] || ''} onChange={(e) => setForm('bakery', { [field]: e.target.value })} />
            ))}
            {['latitude', 'longitude', 'maxRadiusKm', 'baseSpeedKmph'].map((field) => (
              <input key={field} type="number" className={inputClass} placeholder={field} value={forms.delivery[field] || ''} onChange={(e) => setForm('delivery', { [field]: Number(e.target.value) })} />
            ))}
          </div>
          <button className={`${buttonClass} mt-4`} onClick={saveSettings}><Save size={16} /> Save Bakery Settings</button>
        </section>
      )}

      {activeTab === 'roles' && (
        <section className="grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <h3 className="text-xl font-bold text-white">Create Role</h3>
            <div className="mt-4 grid gap-3">
              <input className={inputClass} placeholder="Role name" value={forms.role.name} onChange={(e) => setForm('role', { name: e.target.value })} />
              <input className={inputClass} placeholder="Description" value={forms.role.description} onChange={(e) => setForm('role', { description: e.target.value })} />
              <textarea className={inputClass} placeholder="Permissions, comma separated" value={forms.role.permissions.join(', ')} onChange={(e) => setForm('role', { permissions: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} />
              <button className={buttonClass} onClick={() => createItem('roles', 'role')}><Plus size={16} /> Create Role</button>
            </div>
          </div>
          <ListPanel title="Roles & Permissions" rows={data.roles} endpoint="roles" deleteItem={deleteItem} render={(role) => (
            <>
              <p className="font-bold text-white">{role.name}</p>
              <p className="text-sm text-gray-400">{role.permissions?.join(', ') || 'No permissions set'}</p>
            </>
          )} />
        </section>
      )}
    </div>
  );
};

const QuickForm = ({ title, fields, form, formKey, setForm, onSubmit }) => (
  <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
    <h3 className="text-xl font-bold text-white">{title}</h3>
    <div className="mt-4 grid gap-3">
      {fields.map((field) => (
        <input
          key={field}
          className={inputClass}
          type={field.toLowerCase().includes('date') ? 'date' : field.toLowerCase().includes('amount') || field.toLowerCase().includes('value') || field.toLowerCase().includes('order') ? 'number' : 'text'}
          placeholder={field}
          value={form[field] || ''}
          onChange={(e) => setForm(formKey, { [field]: e.target.type === 'number' ? Number(e.target.value) : e.target.value })}
        />
      ))}
      <button className={buttonClass} onClick={onSubmit}><Plus size={16} /> Save</button>
    </div>
  </div>
);

const EditableTable = ({ title, rows, columns, endpoint, updateItem, deleteItem, batchSave = false }) => {
  const [draftRows, setDraftRows] = useState(rows);

  useEffect(() => {
    setDraftRows(rows);
  }, [rows]);

  const updateDraft = (id, field, value) => {
    setDraftRows((current) => current.map((row) => row._id === id ? { ...row, [field]: value } : row));
  };

  const saveAll = async () => {
    try {
      await Promise.all(draftRows.map((row) => API.patch(`/master/${endpoint}/${row._id}`, row)));
      window.dispatchEvent(new CustomEvent('sr:master-refresh'));
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to save all changes');
    }
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h3 className="text-xl font-bold text-white">{title}</h3>
        {batchSave && draftRows.length > 0 && (
          <button onClick={saveAll} className="inline-flex items-center justify-center gap-2 rounded bg-red-700 px-3 py-2 text-sm font-bold text-white hover:bg-red-800">
            <Save size={15} /> Save All Changes
          </button>
        )}
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-zinc-800 text-xs uppercase text-gray-500">
            <tr>
              {columns.map((column) => <th key={column} className="py-3 pr-3">{column}</th>)}
              <th className="py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {draftRows.map((row) => (
              <tr key={row._id}>
                {columns.map((column) => (
                  <td key={column} className="py-3 pr-3 text-gray-300">
                    {typeof row[column] === 'boolean' ? (
                      <select className={inputClass} value={row[column] ? 'true' : 'false'} onChange={(event) => updateDraft(row._id, column, event.target.value === 'true')}>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    ) : (
                      <input
                        className={inputClass}
                        type={typeof row[column] === 'number' ? 'number' : column.toLowerCase().includes('date') ? 'date' : 'text'}
                        value={column.toLowerCase().includes('date') && row[column] ? String(row[column]).slice(0, 10) : (row[column] ?? '')}
                        onChange={(event) => updateDraft(row._id, column, event.target.type === 'number' ? Number(event.target.value) : event.target.value)}
                      />
                    )}
                  </td>
                ))}
                <td className="py-3">
                  <div className="flex gap-2">
                    {!batchSave && <button onClick={() => updateItem(endpoint, row._id, row)} className="rounded bg-zinc-800 p-2 text-white hover:bg-zinc-700" title="Save"><Save size={15} /></button>}
                    <button onClick={() => deleteItem(endpoint, row._id)} className="rounded bg-red-950 p-2 text-red-200 hover:bg-red-900" title="Delete"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {draftRows.length === 0 && <p className="py-8 text-center text-gray-500">No records yet.</p>}
      </div>
    </div>
  );
};

const ListPanel = ({ title, rows, endpoint, deleteItem, render }) => (
  <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
    <h3 className="text-xl font-bold text-white">{title}</h3>
    <div className="mt-4 space-y-3">
      {rows.map((row) => (
        <article key={row._id} className="flex items-start justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
          <div>{render(row)}</div>
          <button onClick={() => deleteItem(endpoint, row._id)} className="rounded bg-red-950 p-2 text-red-200 hover:bg-red-900" title="Delete"><Trash2 size={15} /></button>
        </article>
      ))}
      {rows.length === 0 && <p className="rounded-lg border border-zinc-800 p-6 text-center text-gray-500">No records yet.</p>}
    </div>
  </div>
);

export default MasterManagement;

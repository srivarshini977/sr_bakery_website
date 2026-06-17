import React, { useContext, useMemo, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { LocateFixed, MapPin, Truck } from 'lucide-react';

const Checkout = () => {
  const { cart, user, clearCart, t } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingDelivery, setCheckingDelivery] = useState(false);
  const [orderType, setOrderType] = useState('takeaway');
  const [address, setAddress] = useState({
    houseNumber: '',
    street: '',
    area: '',
    city: '',
    pincode: ''
  });
  const [location, setLocation] = useState({ latitude: '', longitude: '', source: '' });
  const [deliveryResult, setDeliveryResult] = useState(null);
  const [deliveryError, setDeliveryError] = useState('');

  const itemsTotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart]);
  const deliveryCharge = orderType === 'delivery' && deliveryResult?.deliveryAvailable ? Number(deliveryResult.deliveryCharge || 0) : 0;
  const payableTotal = itemsTotal + deliveryCharge;
  const fullAddress = useMemo(() => (
    [address.houseNumber, address.street, address.area, address.city, address.pincode].filter(Boolean).join(', ')
  ), [address]);
  const hasCoordinates = (candidate = location) => Boolean(candidate.latitude && candidate.longitude);
  const routeMapUrl = deliveryResult?.bakeryLocation && deliveryResult?.customerLatitude && deliveryResult?.customerLongitude
    ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${deliveryResult.bakeryLocation.latitude}%2C${deliveryResult.bakeryLocation.longitude}%3B${deliveryResult.customerLatitude}%2C${deliveryResult.customerLongitude}`
    : '';
  const mapEmbedUrl = deliveryResult?.bakeryLocation && deliveryResult?.customerLatitude && deliveryResult?.customerLongitude
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${Math.min(deliveryResult.bakeryLocation.longitude, deliveryResult.customerLongitude) - 0.03}%2C${Math.min(deliveryResult.bakeryLocation.latitude, deliveryResult.customerLatitude) - 0.03}%2C${Math.max(deliveryResult.bakeryLocation.longitude, deliveryResult.customerLongitude) + 0.03}%2C${Math.max(deliveryResult.bakeryLocation.latitude, deliveryResult.customerLatitude) + 0.03}&layer=mapnik&marker=${deliveryResult.customerLatitude}%2C${deliveryResult.customerLongitude}`
    : '';

  const handleAddressChange = (field, value) => {
    setAddress((current) => ({ ...current, [field]: value }));
    setDeliveryResult(null);
    setDeliveryError('');
  };

  const checkDelivery = async (nextLocation = location, addressOverride = fullAddress) => {
    if (orderType !== 'delivery') return null;
    const canUseCoordinates = hasCoordinates(nextLocation);
    if (!addressOverride.trim() && !canUseCoordinates) {
      setDeliveryError('Enter the delivery address or use current location first.');
      return null;
    }

    try {
      setCheckingDelivery(true);
      setDeliveryError('Checking delivery availability...');
      const response = await API.post('/orders/delivery/check', {
        address: addressOverride,
        latitude: nextLocation.latitude || undefined,
        longitude: nextLocation.longitude || undefined
      });
      const delivery = response.data.data?.delivery;
      setDeliveryResult(delivery);
      setDeliveryError('');
      return delivery;
    } catch (error) {
      const message = error.response?.data?.message || 'Unable to check delivery availability';
      setDeliveryError(message);
      return null;
    } finally {
      setCheckingDelivery(false);
    }
  };

  const reverseGeocode = async ({ latitude, longitude }) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
      if (!response.ok) return '';
      const data = await response.json();
      const details = data.address || {};
      const nextAddress = {
        houseNumber: details.house_number || address.houseNumber,
        street: details.road || details.neighbourhood || address.street,
        area: details.suburb || details.village || details.town || details.city_district || address.area,
        city: details.city || details.town || details.village || details.county || address.city,
        pincode: details.postcode || address.pincode
      };
      setAddress(nextAddress);
      return [nextAddress.houseNumber, nextAddress.street, nextAddress.area, nextAddress.city, nextAddress.pincode].filter(Boolean).join(', ');
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
      return '';
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setDeliveryError('Current location is not supported in this browser.');
      return;
    }

    setDeliveryError('Fetching your current location...');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          source: 'current-location'
        };
        setLocation(nextLocation);
        const resolvedAddress = await reverseGeocode(nextLocation);
        await checkDelivery(nextLocation, resolvedAddress || fullAddress || 'Current location');
      },
      () => setDeliveryError('Location permission was denied. Enter address and check delivery manually.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePlaceOrder = async () => {
    if (!user || user.role !== 'customer') {
      navigate('/login');
      return;
    }
    if (orderType === 'delivery') {
      const delivery = deliveryResult || await checkDelivery();
      if (!delivery?.deliveryAvailable) {
        setDeliveryError('Delivery is not available for this address.');
        return;
      }
    }

    setLoading(true);
    try {
      const orderPayload = {
        userId: user?._id || null,
        items: cart.map(i => ({ product: i._id, name: i.name, quantity: i.quantity, price: i.price })),
        totalAmount: itemsTotal,
        paymentMethod: 'cash',
        orderType,
        customerAddress: {
          ...address,
          fullAddress
        },
        deliveryAddress: fullAddress,
        customerLatitude: location.latitude || deliveryResult?.customerLatitude || undefined,
        customerLongitude: location.longitude || deliveryResult?.customerLongitude || undefined
      };
      const res = await API.post('/orders', orderPayload);
      const createdOrder = res.data.data?.order;
      clearCart();
      alert('Order placed successfully');
      if (createdOrder?._id) navigate(`/orders/${createdOrder._id}`);
    } catch (err) {
      console.error('Checkout failed', err);
      alert('Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full px-5 py-12 sm:px-8 lg:px-12 2xl:px-16">
      <h1 className="text-2xl font-bold">{t('navCheckout')}</h1>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="glass-card rounded-lg p-6">
          <div className="mb-5 grid grid-cols-2 gap-3">
            {[
              { value: 'takeaway', label: 'Takeaway' },
              { value: 'delivery', label: 'Delivery' }
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setOrderType(item.value);
                  setDeliveryResult(null);
                  setDeliveryError('');
                }}
                className={`rounded-lg border px-4 py-3 font-bold transition ${
                  orderType === item.value
                    ? 'border-red-600 bg-red-700 text-white'
                    : 'border-zinc-700 bg-zinc-900 text-gray-300 hover:bg-zinc-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {orderType === 'delivery' && (
            <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <div className="flex items-center gap-2 text-white">
                <MapPin size={18} className="text-red-300" />
                <h2 className="font-bold">Delivery Address</h2>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input value={address.houseNumber} onChange={(event) => handleAddressChange('houseNumber', event.target.value)} placeholder="House number" className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white" />
                <input value={address.street} onChange={(event) => handleAddressChange('street', event.target.value)} placeholder="Street" className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white" />
                <input value={address.area} onChange={(event) => handleAddressChange('area', event.target.value)} placeholder="Area" className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white" />
                <input value={address.city} onChange={(event) => handleAddressChange('city', event.target.value)} placeholder="City" className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white" />
                <input value={address.pincode} onChange={(event) => handleAddressChange('pincode', event.target.value)} placeholder="Pincode" className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white md:col-span-2" />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={useCurrentLocation} className="inline-flex items-center justify-center gap-2 rounded bg-zinc-800 px-4 py-2 font-bold text-white hover:bg-zinc-700">
                  <LocateFixed size={17} /> Use Current Location
                </button>
                <button type="button" onClick={() => checkDelivery()} disabled={checkingDelivery} className="inline-flex items-center justify-center gap-2 rounded bg-red-700 px-4 py-2 font-bold text-white hover:bg-red-800 disabled:opacity-60">
                  <Truck size={17} /> {checkingDelivery ? 'Checking...' : 'Check Delivery'}
                </button>
              </div>

              {deliveryError && (
                <p className={`rounded border p-3 text-sm ${deliveryError.includes('Checking') || deliveryError.includes('Fetching') ? 'border-yellow-800 bg-yellow-950 text-yellow-200' : 'border-red-900 bg-red-950 text-red-200'}`}>
                  {deliveryError}
                </p>
              )}

              {deliveryResult && (
                <div className={`rounded-lg border p-4 ${deliveryResult.deliveryAvailable ? 'border-green-800 bg-green-950/40' : 'border-red-900 bg-red-950/40'}`}>
                  <p className={`font-bold ${deliveryResult.deliveryAvailable ? 'text-green-300' : 'text-red-300'}`}>
                    {deliveryResult.deliveryAvailable ? 'Delivery Available' : 'Delivery Not Available'}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-gray-300 md:grid-cols-4">
                    <span>Distance: <b className="text-white">{deliveryResult.distanceKm} KM</b></span>
                    <span>ETA: <b className="text-white">{deliveryResult.estimatedTime} Minutes</b></span>
                    <span>Charge: <b className="text-white">Rs. {deliveryResult.deliveryCharge}</b></span>
                    <span>Max Radius: <b className="text-white">{deliveryResult.maxRadiusKm} KM</b></span>
                  </div>
                  <p className="mt-3 text-xs text-gray-400">
                    Using {deliveryResult.customerLocationSource === 'customer-location' ? 'your current GPS location' : 'address estimate'}:
                    {' '}{Number(deliveryResult.customerLatitude).toFixed(5)}, {Number(deliveryResult.customerLongitude).toFixed(5)}
                  </p>
                  {mapEmbedUrl && (
                    <div className="mt-4 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950">
                      <iframe
                        title="Delivery route map"
                        src={mapEmbedUrl}
                        className="h-56 w-full"
                        loading="lazy"
                      />
                    </div>
                  )}
                  {routeMapUrl && (
                    <a href={routeMapUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-bold text-red-300 hover:text-red-200">
                      Open full route map
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="glass-card p-6 rounded-lg h-fit">
        <div className="mb-4">Order Summary: {cart.length} items</div>
        <div className="space-y-2 text-sm text-gray-300">
          <div className="flex justify-between"><span>Items</span><span>Rs. {itemsTotal}</span></div>
          {orderType === 'delivery' && <div className="flex justify-between"><span>Delivery Charge</span><span>Rs. {deliveryCharge}</span></div>}
          <div className="flex justify-between border-t border-zinc-700 pt-3 text-lg font-bold text-white"><span>Total</span><span>Rs. {payableTotal}</span></div>
        </div>
        <button
          onClick={handlePlaceOrder}
          disabled={loading || cart.length === 0}
          className="mt-5 w-full px-4 py-3 bg-bakery-red text-white rounded font-bold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Processing...' : 'Place Order'}
        </button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;

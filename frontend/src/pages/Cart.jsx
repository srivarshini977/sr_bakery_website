import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Cart = () => {
  const { cart, updateCartQty, removeFromCart, t } = useContext(AuthContext);
  const subtotal = cart.reduce((s, item) => s + item.price * item.quantity, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold">{t('navCart')}</h1>
      {cart.length === 0 ? (
        <div className="mt-6 text-gray-300">
          Your cart is empty. <Link to="/menu" className="text-bakery-red">Explore Menu</Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {cart.map(item => (
            <div key={item._id} className="glass-card p-4 rounded flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-bold">{item.name}</div>
                <div className="text-sm text-gray-400">Rs. {item.price} x {item.quantity}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateCartQty(item._id, item.quantity - 1)} className="px-2 py-1 bg-gray-800 rounded">-</button>
                <div>{item.quantity}</div>
                <button onClick={() => updateCartQty(item._id, item.quantity + 1)} className="px-2 py-1 bg-gray-800 rounded">+</button>
                <button onClick={() => removeFromCart(item._id)} className="px-2 py-1 bg-red-700 rounded">Remove</button>
              </div>
            </div>
          ))}

          <div className="text-right font-bold">Subtotal: Rs. {subtotal}</div>
          <div className="flex flex-col justify-end gap-3 sm:flex-row">
            <Link to="/menu" className="px-4 py-2 border border-gray-700 rounded text-center">Continue Shopping</Link>
            <Link to="/checkout" className="px-4 py-2 bg-bakery-red text-white rounded text-center">Checkout</Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;

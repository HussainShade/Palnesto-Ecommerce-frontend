'use client';

import { useState, useEffect } from 'react';
import type { Cart, Shirt } from '@/types';
import { getCart, removeFromCart, updateCartItemQuantity, calculateTotalAmount } from '@/lib/cart';

interface CartProps {
  shirts: Shirt[];
  isOpen: boolean;
  onClose: () => void;
  onCartUpdate: () => void;
}

export default function Cart({ shirts, isOpen, onClose, onCartUpdate }: CartProps) {
  const [cart, setCart] = useState<Cart>({ items: [], totalAmount: 0 });

  useEffect(() => {
    const currentCart = getCart();
    const totalAmount = calculateTotalAmount(currentCart, shirts);
    setCart({ ...currentCart, totalAmount });
  }, [shirts, isOpen]);

  const handleRemoveItem = (shirtId: string) => {
    removeFromCart(shirtId);
    const updatedCart = getCart();
    const totalAmount = calculateTotalAmount(updatedCart, shirts);
    setCart({ ...updatedCart, totalAmount });
    onCartUpdate();
  };

  const handleQuantityChange = (shirtId: string, quantity: number) => {
    updateCartItemQuantity(shirtId, quantity);
    const updatedCart = getCart();
    const totalAmount = calculateTotalAmount(updatedCart, shirts);
    setCart({ ...updatedCart, totalAmount });
    onCartUpdate();
  };

  const getShirtById = (shirtId: string): Shirt | undefined => {
    return shirts.find(s => s.id === shirtId);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 backdrop-blur-sm bg-gray-900/40 z-40"
        onClick={onClose}
      />
      
      {/* Cart Sidebar */}
      <div 
        className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Shopping Cart</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.items.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              Your cart is empty
            </div>
          ) : (
            <div className="space-y-4">
              {cart.items.map(item => {
                const shirt = getShirtById(item.shirtId);
                if (!shirt) return null;

                return (
                  <div key={item.shirtId} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex gap-4">
                      <img
                        src={shirt.imageUrl}
                        alt={shirt.name}
                        className="w-20 h-20 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold">{shirt.name}</h3>
                        <p className="text-sm text-gray-600">{shirt.size} - {shirt.type}</p>
                        <p className="text-lg font-semibold mt-1">
                          ${shirt.discountedPrice.toFixed(2)}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => handleQuantityChange(item.shirtId, item.quantity - 1)}
                            className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-50"
                          >
                            −
                          </button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => handleQuantityChange(item.shirtId, item.quantity + 1)}
                            className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-50"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(item.shirtId)}
                          className="text-red-600 text-sm mt-2 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {cart.items.length > 0 && (
          <div className="border-t p-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold">Total:</span>
              <span className="text-2xl font-bold">${cart.totalAmount.toFixed(2)}</span>
            </div>
            <button
              className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 font-semibold"
            >
              Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
}


'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Cart, Shirt, ShirtSize } from '@/types';
import { getCart, removeFromCart, updateCartItemQuantity, calculateTotalAmount } from '@/lib/cart';
import { fetchShirtById, fetchShirtVariantsByDesignId } from '@/lib/api';

interface CartProps {
  shirts: Shirt[]; // Fallback shirts from parent (for backward compatibility)
  isOpen: boolean;
  onClose: () => void;
  onCartUpdate: () => void;
}

export default function Cart({ shirts, isOpen, onClose, onCartUpdate }: CartProps) {
  const [cart, setCart] = useState<Cart>({ items: [], totalAmount: 0 });
  const [cartShirts, setCartShirts] = useState<Shirt[]>([]); // Fetched shirts for cart items
  const [loadingShirts, setLoadingShirts] = useState(false);

  // Fetch all shirts that are in the cart
  const fetchCartShirts = useCallback(async () => {
    const currentCart = getCart();
    if (currentCart.items.length === 0) {
      setCartShirts([]);
      return;
    }

    setLoadingShirts(true);
    try {
      // Get unique design IDs from cart
      const designIds = [...new Set(currentCart.items.map(item => item.shirtId))];
      
      // Fetch all variants for each design
      const allVariantsPromises = designIds.map(async (designId) => {
        try {
          return await fetchShirtVariantsByDesignId(designId);
        } catch (error) {
          console.warn(`Failed to fetch variants for design ${designId}:`, error);
          return [];
        }
      });
      
      const allVariantsArrays = await Promise.all(allVariantsPromises);
      
      // Create a map of design ID -> variants
      const designVariantsMap = new Map<string, Shirt[]>();
      designIds.forEach((designId, index) => {
        designVariantsMap.set(designId, allVariantsArrays[index] || []);
      });
      
      // For each cart item, find the matching variant by size
      const cartShirts: Shirt[] = [];
      currentCart.items.forEach(item => {
        const designId = item.shirtId;
        const variants = designVariantsMap.get(designId) || [];
        
        if (variants.length > 0) {
          // If size is stored, find variant with matching size
          // Otherwise, use first variant (backward compatibility with old cart items)
          let variant: Shirt | undefined;
          
          if (item.size) {
            variant = variants.find(v => v.size === item.size);
          }
          
          // Fallback to first variant if size match not found
          if (!variant) {
            variant = variants.find(v => v.stock > 0) || variants[0];
          }
          
          if (variant) {
            // Use variant ID as unique key to avoid duplicates
            if (!cartShirts.find(s => s.id === variant!.id)) {
              cartShirts.push(variant);
            }
          }
        }
      });
      
      setCartShirts(cartShirts);
    } catch (error) {
      console.error('Failed to fetch cart shirts:', error);
      setCartShirts([]);
    } finally {
      setLoadingShirts(false);
    }
  }, []);

  // Fetch cart shirts when cart opens
  useEffect(() => {
    if (isOpen) {
      fetchCartShirts();
    }
  }, [isOpen, fetchCartShirts]);

  // Use cartShirts if available, otherwise fall back to shirts prop
  const availableShirts = cartShirts.length > 0 ? cartShirts : shirts;

  const refreshCart = useCallback(() => {
    const currentCart = getCart();
    const totalAmount = calculateTotalAmount(currentCart, availableShirts);
    setCart({ ...currentCart, totalAmount });
  }, [availableShirts]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart, isOpen]);

  // Refresh cart periodically when open to catch external changes (e.g., from product detail page)
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      const currentCart = getCart();
      const totalAmount = calculateTotalAmount(currentCart, availableShirts);
      setCart({ ...currentCart, totalAmount });
      
      // Check if cart items changed and re-fetch if needed
      const currentItemIds = new Set(currentCart.items.map(item => item.shirtId));
      const fetchedItemIds = new Set(cartShirts.map(s => s.id));
      const itemsChanged = currentCart.items.length !== cartShirts.length ||
        ![...currentItemIds].every(id => fetchedItemIds.has(id));
      
      if (itemsChanged) {
        fetchCartShirts();
      }
    }, 500); // Check every 500ms when cart is open

    return () => clearInterval(interval);
  }, [isOpen, availableShirts, cartShirts, fetchCartShirts]);

  // Listen for custom cart update events (for same-tab updates)
  useEffect(() => {
    const handleCartUpdate = () => {
      if (isOpen) {
        fetchCartShirts(); // Re-fetch all cart shirts
      }
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, [isOpen, fetchCartShirts]);

  // Also listen for storage events (for cross-tab updates)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'shirt_ecommerce_cart' && isOpen) {
        fetchCartShirts(); // Re-fetch all cart shirts
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isOpen, fetchCartShirts]);

  const handleRemoveItem = (shirtId: string) => {
    removeFromCart(shirtId);
    const updatedCart = getCart();
    const totalAmount = calculateTotalAmount(updatedCart, availableShirts);
    setCart({ ...updatedCart, totalAmount });
    // Remove from cartShirts state
    setCartShirts(prev => prev.filter(s => s.id !== shirtId));
    onCartUpdate();
  };

  const handleQuantityChange = (shirtId: string, quantity: number) => {
    updateCartItemQuantity(shirtId, quantity);
    const updatedCart = getCart();
    const totalAmount = calculateTotalAmount(updatedCart, availableShirts);
    setCart({ ...updatedCart, totalAmount });
    onCartUpdate();
  };

  const getShirtByCartItem = (cartItem: { shirtId: string; size?: ShirtSize }): Shirt | undefined => {
    // First try to find by exact match (for backward compatibility with variant IDs)
    let shirt = availableShirts.find(s => s.id === cartItem.shirtId);
    
    // If not found and size is provided, find by design ID and size
    if (!shirt && cartItem.size) {
      // Find any variant from the design that matches the size
      shirt = availableShirts.find(s => s.size === cartItem.size);
    }
    
    // Final fallback: use first available shirt
    if (!shirt && availableShirts.length > 0) {
      shirt = availableShirts[0];
    }
    
    return shirt;
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
          {loadingShirts && cart.items.length > 0 ? (
            <div className="text-center text-gray-500 mt-8">
              Loading cart items...
            </div>
          ) : cart.items.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              Your cart is empty
            </div>
          ) : (
            <div className="space-y-4">
              {cart.items.map((item, index) => {
                const shirt = getShirtByCartItem(item);
                if (!shirt) {
                  // Show loading state for items being fetched
                  return (
                    <div key={item.shirtId} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex gap-4">
                        <div className="w-20 h-20 bg-gray-200 rounded animate-pulse" />
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
                          <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={`${item.shirtId}-${item.size || shirt.id}-${index}`} className="border border-gray-200 rounded-lg p-4">
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
                          ₹{shirt.discountedPrice.toFixed(2)}
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
              <span className="text-2xl font-bold">₹{cart.totalAmount.toFixed(2)}</span>
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


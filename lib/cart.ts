import type { Cart, CartItem, Shirt } from '@/types';

const CART_STORAGE_KEY = 'shirt_ecommerce_cart';

/**
 * Cart utilities for localStorage management
 * Frontend-only, no backend persistence
 */

export function getCart(): Cart {
  if (typeof window === 'undefined') {
    return { items: [], totalAmount: 0 };
  }

  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) {
      return { items: [], totalAmount: 0 };
    }
    return JSON.parse(stored);
  } catch {
    return { items: [], totalAmount: 0 };
  }
}

export function saveCart(cart: Cart): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (error) {
    console.error('Failed to save cart to localStorage:', error);
  }
}

export function addToCart(shirtId: string, quantity: number = 1): Cart {
  const cart = getCart();
  const existingItem = cart.items.find(item => item.shirtId === shirtId);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.items.push({ shirtId, quantity });
  }

  // Note: totalAmount will be calculated when rendering with actual shirt prices
  saveCart(cart);
  return cart;
}

export function removeFromCart(shirtId: string): Cart {
  const cart = getCart();
  cart.items = cart.items.filter(item => item.shirtId !== shirtId);
  saveCart(cart);
  return cart;
}

export function updateCartItemQuantity(shirtId: string, quantity: number): Cart {
  const cart = getCart();
  const item = cart.items.find(item => item.shirtId === shirtId);
  
  if (item) {
    if (quantity <= 0) {
      return removeFromCart(shirtId);
    }
    item.quantity = quantity;
  }
  
  saveCart(cart);
  return cart;
}

export function clearCart(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CART_STORAGE_KEY);
}

/**
 * Calculate total amount from cart items and shirt data
 */
export function calculateTotalAmount(cart: Cart, shirts: Shirt[]): number {
  return cart.items.reduce((total, item) => {
    const shirt = shirts.find(s => s.id === item.shirtId);
    if (shirt) {
      return total + (shirt.discountedPrice * item.quantity);
    }
    return total;
  }, 0);
}


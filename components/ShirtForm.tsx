'use client';

import { useState, useEffect } from 'react';
import type { Shirt, CreateShirtData, UpdateShirtData, BatchCreateShirtData, ShirtSize, ShirtType, Discount } from '@/types';

interface ShirtFormProps {
  shirt?: Shirt; // If provided, form is in edit mode (single shirt - backward compatible)
  shirts?: Shirt[]; // If provided, form is in edit mode (multiple variants)
  onSubmit: (data: BatchCreateShirtData | UpdateShirtData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const SIZES: ShirtSize[] = ['M', 'L', 'XL', 'XXL'];
const TYPES: ShirtType[] = ['Casual', 'Formal', 'Wedding', 'Sports', 'Vintage'];

interface SizeStockPair {
  size: ShirtSize;
  stock: number;
}

export default function ShirtForm({ shirt, shirts, onSubmit, onCancel, loading }: ShirtFormProps) {
  // Support both single shirt (backward compatible) and multiple shirts (new grouped mode)
  const editShirts = shirts || (shirt ? [shirt] : []);
  const isEditMode = editShirts.length > 0;
  const mainShirt = editShirts[0]; // Use first shirt as the main one for form data
  
  // Initialize stock for all sizes
  const initializeSizeStocks = () => {
    const stocks: Record<ShirtSize, number> = {
      'M': 0,
      'L': 0,
      'XL': 0,
      'XXL': 0,
    };
    
    // If editing, set stock for all variants
    if (isEditMode) {
      editShirts.forEach(shirt => {
        stocks[shirt.size] = shirt.stock;
      });
    }
    
    return stocks;
  };
  
  const [formData, setFormData] = useState({
    name: mainShirt?.name || '',
    description: mainShirt?.description || '',
    type: (mainShirt?.type || 'Casual') as ShirtType,
    price: mainShirt?.originalPrice || 0,
    discountType: (mainShirt ? (mainShirt.originalPrice > mainShirt.discountedPrice ? 'percentage' : 'none') : 'none') as 'none' | 'percentage' | 'amount',
    discountValue: 0,
    // All sizes with their stock values
    sizeStocks: initializeSizeStocks(),
  });

  // Calculate discount value from existing shirt
  useEffect(() => {
    if (mainShirt && mainShirt.originalPrice > mainShirt.discountedPrice) {
      const discount = mainShirt.originalPrice - mainShirt.discountedPrice;
      const percentage = Math.round((discount / mainShirt.originalPrice) * 100);
      
      // Determine if it's percentage or amount (assume percentage if it's a round number)
      if (percentage > 0 && percentage <= 100) {
        setFormData(prev => ({
          ...prev,
          discountType: 'percentage',
          discountValue: percentage,
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          discountType: 'amount',
          discountValue: discount,
        }));
      }
    }
  }, [mainShirt]);

  const updateStock = (size: ShirtSize, stock: number) => {
    setFormData(prev => ({
      ...prev,
      sizeStocks: {
        ...prev.sizeStocks,
        [size]: stock,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditMode) {
      // Edit mode: update main shirt and handle all size variants
      const mainSize = mainShirt!.size;
      const mainStock = formData.sizeStocks[mainSize];
      
      // Get all sizes (including stock = 0) for existing variants
      // Backend will update existing variants even with stock = 0
      // But will only create new variants if stock > 0
      const allSizeStockPairs = (Object.entries(formData.sizeStocks) as [ShirtSize, number][])
        .map(([size, stock]) => ({ size, stock }));
      
      // Check if at least one size has stock > 0 (for validation)
      const hasStock = allSizeStockPairs.some(pair => pair.stock > 0);
      if (!hasStock) {
        alert('Please enter stock quantity for at least one size');
        return;
      }
      
      const submitData: UpdateShirtData = {
        name: formData.name,
        type: formData.type,
        price: formData.price,
        stock: mainStock,
      };

      // Only include description if it's not empty
      if (formData.description && formData.description.trim()) {
        submitData.description = formData.description.trim();
      }

      // Handle discount: add if applicable, or send null to remove existing discount
      if (formData.discountType !== 'none') {
        submitData.discount = {
          type: formData.discountType,
          value: formData.discountValue,
        };
      } else if (mainShirt && mainShirt.originalPrice > mainShirt.discountedPrice) {
        // If shirt had a discount and user removed it, send null to remove
        submitData.discount = null;
      }

      // Get all other sizes (including stock = 0) excluding main shirt's size
      // Backend will update existing variants (even with stock = 0)
      // and only create new variants if stock > 0
      const otherPairs = allSizeStockPairs.filter(pair => pair.size !== mainSize);
      if (otherPairs.length > 0) {
        submitData.sizes = otherPairs;
      }

      await onSubmit(submitData);
    } else {
      // Create mode: use batch endpoint with all sizes
      // Get all sizes with stock > 0 (for creation, stock must be > 0)
      const sizeStockPairs = (Object.entries(formData.sizeStocks) as [ShirtSize, number][])
        .filter(([_, stock]) => stock > 0)
        .map(([size, stock]) => ({ size, stock }));
      
      if (sizeStockPairs.length === 0) {
        // Prevent submission if no stock entered for any size
        alert('Please enter stock quantity for at least one size');
        return;
      }
      
      const submitData: BatchCreateShirtData = {
        name: formData.name,
        description: formData.description || undefined,
        type: formData.type,
        price: formData.price,
        sizes: sizeStockPairs, // All sizes with stock > 0
      };

      // Add discount if applicable
      if (formData.discountType !== 'none') {
        submitData.discount = {
          type: formData.discountType,
          value: formData.discountValue,
        };
      }

      await onSubmit(submitData);
    }
  };

  const calculateFinalPrice = () => {
    if (formData.discountType === 'percentage') {
      return formData.price * (1 - formData.discountValue / 100);
    } else if (formData.discountType === 'amount') {
      return Math.max(0, formData.price - formData.discountValue);
    }
    return formData.price;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Name *</label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2"
          placeholder="Shirt name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2"
          rows={3}
          placeholder="Shirt description"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Type *</label>
        <select
          required
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value as ShirtType })}
          className="w-full border border-gray-300 rounded px-3 py-2"
        >
          {TYPES.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {/* Size and Stock - All sizes preselected */}
      <div>
        <label className="block text-sm font-medium mb-2">Size & Stock *</label>
        <div className="grid grid-cols-2 gap-4">
          {SIZES.map(size => (
            <div key={size}>
              <label className="block text-xs text-gray-600 mb-1">
                Size: <span className="font-semibold">{size}</span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.sizeStocks[size]}
                onChange={(e) => updateStock(size, parseInt(e.target.value) || 0)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="Stock quantity"
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Enter stock quantity for each size. Only sizes with stock &gt; 0 will be created.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Price (₹) *</label>
        <input
          type="number"
          required
          min="0"
          max="10000"
          step="0.01"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Discount</label>
        <div className="space-y-2">
          <select
            value={formData.discountType}
            onChange={(e) => setFormData({ ...formData, discountType: e.target.value as 'none' | 'percentage' | 'amount' })}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="none">No Discount</option>
            <option value="percentage">Percentage</option>
            <option value="amount">Fixed Amount</option>
          </select>

          {formData.discountType !== 'none' && (
            <input
              type="number"
              min="0"
              max={formData.discountType === 'percentage' ? 100 : formData.price}
              step="0.01"
              value={formData.discountValue}
              onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder={formData.discountType === 'percentage' ? 'Percentage (0-100)' : 'Amount'}
            />
          )}

          {formData.discountType !== 'none' && (
            <div className="text-sm text-gray-600">
              Final Price: ₹{calculateFinalPrice().toFixed(2)}
            </div>
          )}
        </div>
      </div>


      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : isEditMode ? 'Update Shirt' : 'Create Shirt'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

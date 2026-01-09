'use client';

import type { ShirtFilters, ShirtSize, ShirtType } from '@/types';

interface FilterBarProps {
  filters: ShirtFilters;
  onFiltersChange: (filters: ShirtFilters) => void;
}

const SIZES: ShirtSize[] = ['M', 'L', 'XL', 'XXL'];
const TYPES: ShirtType[] = ['Casual', 'Formal', 'Wedding', 'Sports', 'Vintage'];

export default function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
  const handleSizeChange = (size: ShirtSize | '') => {
    onFiltersChange({ ...filters, size: size || undefined });
  };

  const handleTypeChange = (type: ShirtType | '') => {
    onFiltersChange({ ...filters, type: type || undefined });
  };

  const handleMinPriceChange = (value: string) => {
    const minPrice = value === '' ? undefined : parseFloat(value);
    onFiltersChange({ ...filters, minPrice });
  };

  const handleMaxPriceChange = (value: string) => {
    const maxPrice = value === '' ? undefined : parseFloat(value);
    onFiltersChange({ ...filters, maxPrice });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Filters</h2>
        <button
          onClick={clearFilters}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Clear All
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Size</label>
          <select
            value={filters.size || ''}
            onChange={(e) => handleSizeChange(e.target.value as ShirtSize | '')}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="">All Sizes</option>
            {SIZES.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Type</label>
          <select
            value={filters.type || ''}
            onChange={(e) => handleTypeChange(e.target.value as ShirtType | '')}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="">All Types</option>
            {TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Min Price</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={filters.minPrice || ''}
            onChange={(e) => handleMinPriceChange(e.target.value)}
            placeholder="0.00"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Max Price</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={filters.maxPrice || ''}
            onChange={(e) => handleMaxPriceChange(e.target.value)}
            placeholder="No limit"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </div>
      </div>
    </div>
  );
}


'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Shirt, ShirtFilters, PaginationParams } from '@/types';
import { fetchShirts } from '@/lib/api';
import { getCart } from '@/lib/cart';
import ShirtCard from '@/components/ShirtCard';
import FilterBar from '@/components/FilterBar';
import Pagination from '@/components/Pagination';
import Cart from '@/components/Cart';

export default function HomePage() {
  const [shirts, setShirts] = useState<Shirt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ShirtFilters>({});
  const [pagination, setPagination] = useState<PaginationParams>({ page: 1, limit: 12 });
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);

  // Load shirts when filters or pagination changes
  useEffect(() => {
    loadShirts();
  }, [filters, pagination]);

  // Update cart item count
  useEffect(() => {
    updateCartItemCount();
  }, []);

  const loadShirts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchShirts(filters, pagination);
      setShirts(response.data);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shirts');
    } finally {
      setLoading(false);
    }
  };

  const updateCartItemCount = () => {
    const cart = getCart();
    const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    setCartItemCount(count);
  };

  const handleFiltersChange = (newFilters: ShirtFilters) => {
    setFilters(newFilters);
    setPagination({ ...pagination, page: 1 }); // Reset to first page on filter change
  };

  const handlePageChange = (page: number) => {
    setPagination({ ...pagination, page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddToCart = () => {
    updateCartItemCount();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-gray-900">Shirt Store</h1>
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
            >
              <span>Cart</span>
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Seller Login Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between">
          <span className="text-gray-700">Seller? Login as a Seller</span>
          <Link
            href="/seller/login"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
          >
            Login
          </Link>
        </div>

        <FilterBar filters={filters} onFiltersChange={handleFiltersChange} />

        {/* Results Info */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {shirts.length} of {total} shirts
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading shirts...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Error: {error}</p>
            <button
              onClick={loadShirts}
              className="mt-2 text-red-600 hover:text-red-700 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Shirts Grid */}
        {!loading && !error && (
          <>
            {shirts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No shirts found. Try adjusting your filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {shirts.map(shirt => (
                  <ShirtCard
                    key={shirt.id}
                    shirt={shirt}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                currentPage={pagination.page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </main>

      {/* Cart Sidebar */}
      <Cart
        shirts={shirts}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCartUpdate={updateCartItemCount}
      />
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Shirt, BatchCreateShirtData, UpdateShirtData, PaginationParams } from '@/types';
import { fetchSellerShirts, batchCreateShirts, updateShirt, deleteShirt, sellerLogout, setSellerAuthState } from '@/lib/api';
import ShirtForm from '@/components/ShirtForm';
import Pagination from '@/components/Pagination';

// Grouped shirt type - represents a shirt with all its size variants
interface GroupedShirt {
  // Use first shirt's ID as the group identifier
  id: string;
  name: string;
  description: string;
  type: Shirt['type'];
  originalPrice: number;
  discountedPrice: number;
  totalStock: number;
  // All variants of this shirt
  variants: Shirt[];
}

export default function SellerDashboard() {
  const router = useRouter();
  const [shirts, setShirts] = useState<Shirt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationParams>({ page: 1, limit: 20 });
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingShirtGroup, setEditingShirtGroup] = useState<GroupedShirt | null>(null);
  const [deletingShirtGroup, setDeletingShirtGroup] = useState<GroupedShirt | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Group shirts by name, type, and price (same design, different sizes)
  const groupedShirts = useMemo(() => {
    const groups = new Map<string, Shirt[]>();
    
    shirts.forEach(shirt => {
      // Create a unique key based on name, type, and price
      const key = `${shirt.name}|${shirt.type}|${shirt.originalPrice}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(shirt);
    });
    
    // Convert to GroupedShirt array
    const grouped: GroupedShirt[] = Array.from(groups.values()).map(variants => {
      // Sort variants by size for consistency
      const sortedVariants = [...variants].sort((a, b) => {
        const sizeOrder: Record<Shirt['size'], number> = { 'M': 1, 'L': 2, 'XL': 3, 'XXL': 4 };
        return sizeOrder[a.size] - sizeOrder[b.size];
      });
      
      const totalStock = variants.reduce((sum, shirt) => sum + shirt.stock, 0);
      const firstShirt = sortedVariants[0];
      
      return {
        id: firstShirt.id, // Use first variant's ID as group ID
        name: firstShirt.name,
        description: firstShirt.description,
        type: firstShirt.type,
        originalPrice: firstShirt.originalPrice,
        discountedPrice: firstShirt.discountedPrice, // Use first variant's discounted price
        totalStock,
        variants: sortedVariants,
      };
    });
    
    return grouped;
  }, [shirts]);

  useEffect(() => {
    loadShirts();
  }, [pagination]);

  const loadShirts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchSellerShirts(pagination);
      setShirts(response.data);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (err) {
      if (err instanceof Error && err.message.includes('401')) {
        // Unauthorized - redirect to login
        router.push('/seller/login');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load shirts');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: BatchCreateShirtData | UpdateShirtData) => {
    setFormLoading(true);
    setError(null);
    try {
      // In create mode, data will always be BatchCreateShirtData
      const result = await batchCreateShirts(data as BatchCreateShirtData);
      
      if (result.success) {
        const count = result.shirts?.length || 0;
        setSuccessMessage(
          count > 1 
            ? `${count} shirts created successfully!`
            : 'Shirt created successfully!'
        );
        setShowCreateModal(false);
        await loadShirts();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.message || 'Failed to create shirts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shirts');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async (data: UpdateShirtData) => {
    if (!editingShirtGroup) return;
    
    setFormLoading(true);
    setError(null);
    try {
      // Use the first variant as the main shirt to update
      const mainShirt = editingShirtGroup.variants[0];
      const mainSize = mainShirt.size;
      const existingVariants = editingShirtGroup.variants;
      const existingSizes = new Set(existingVariants.map(v => v.size));
      
      // Separate sizes into: with stock > 0 (can use sizes array) and stock = 0 (need individual updates)
      const sizesArray = data.sizes || [];
      const sizesWithStock = sizesArray.filter(pair => pair.stock > 0);
      const sizesWithZeroStock = sizesArray.filter(pair => pair.stock === 0 && existingSizes.has(pair.size));
      
      // Prepare update data - only include sizes with stock > 0 in sizes array
      const updateData: UpdateShirtData = {
        ...data,
        sizes: sizesWithStock.length > 0 ? sizesWithStock : undefined,
      };
      
      // Update main shirt with sizes array (for stock > 0 variants)
      const result = await updateShirt(mainShirt.id, updateData);
      
      if (!result.success) {
        setError(result.message || 'Failed to update shirt');
        return;
      }

      // Update existing variants with stock = 0 individually
      // (Backend filters out stock = 0 from sizes array, so we need to update them separately)
      if (sizesWithZeroStock.length > 0) {
        const zeroStockUpdates = sizesWithZeroStock.map(pair => {
          const variant = existingVariants.find(v => v.size === pair.size);
          if (!variant || variant.size === mainSize) return null; // Skip main size
          
          return updateShirt(variant.id, {
            stock: 0,
            // Update shared attributes if they changed
            name: data.name,
            description: data.description,
            type: data.type,
            price: data.price,
            discount: data.discount,
          });
        }).filter(Boolean) as Promise<{ success: boolean; message?: string }>[];
        
        const zeroStockResults = await Promise.all(zeroStockUpdates);
        const zeroStockFailed = zeroStockResults.some(r => !r.success);
        
        if (zeroStockFailed) {
          setError('Some variants with zero stock failed to update. Please try again.');
          return;
        }
      }

      // Show success message based on updated and created counts
      const updatedCount = result.updatedCount || 0;
      const createdCount = result.createdCount || 0;
      const zeroStockCount = sizesWithZeroStock.length;
      
      const messages: string[] = [];
      if (updatedCount > 0) messages.push(`${updatedCount} variant(s) updated`);
      if (zeroStockCount > 0) messages.push(`${zeroStockCount} variant(s) set to zero stock`);
      if (createdCount > 0) messages.push(`${createdCount} new variant(s) created`);
      
      if (messages.length > 0) {
        setSuccessMessage(`Shirt updated successfully. ${messages.join(', ')}!`);
      } else {
        setSuccessMessage('Shirt updated successfully!');
      }
      
      setEditingShirtGroup(null);
      await loadShirts();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update shirt');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingShirtGroup) return;
    
    setDeleteLoading(true);
    setError(null);
    try {
      // Delete all variants of this shirt group
      const deletePromises = deletingShirtGroup.variants.map(shirt => deleteShirt(shirt.id));
      const results = await Promise.all(deletePromises);
      
      // Check if all deletions succeeded
      const allSuccess = results.every(r => r.success);
      
      if (allSuccess) {
        const count = deletingShirtGroup.variants.length;
        setSuccessMessage(
          count > 1 
            ? `${count} shirt variants deleted successfully!`
            : 'Shirt deleted successfully!'
        );
        setDeletingShirtGroup(null);
        await loadShirts();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const failedResults = results.filter(r => !r.success);
        setError(`Failed to delete ${failedResults.length} variant(s). Please try again.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete shirt');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setPagination({ ...pagination, page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    try {
      await sellerLogout();
    } catch (err) {
      console.error('Logout error:', err);
      // Even if logout fails, clear local auth state
      setSellerAuthState(false);
    }
    // Redirect to login page
    router.push('/seller/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-gray-900">Seller Dashboard</h1>
            <div className="flex items-center gap-4">
              <a
                href="/"
                className="text-gray-600 hover:text-gray-900"
              >
                View Store
              </a>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Error: {error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-red-600 hover:text-red-700 underline text-sm"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Header Actions */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">My Shirts</h2>
            <p className="text-sm text-gray-600 mt-1">
              Showing {groupedShirts.length} shirt design(s) ({shirts.length} total variants)
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Add New Shirt
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading shirts...</p>
          </div>
        )}

        {/* Shirts Table */}
        {!loading && (
          <>
            {groupedShirts.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                <p className="text-gray-600 mb-4">No shirts found. Create your first shirt!</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create Shirt
                </button>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Final Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sizes Available</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {groupedShirts.map((groupedShirt) => (
                      <tr key={groupedShirt.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{groupedShirt.name}</div>
                          {groupedShirt.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">{groupedShirt.description}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{groupedShirt.type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{groupedShirt.originalPrice.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          ₹{groupedShirt.discountedPrice.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {groupedShirt.totalStock}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {groupedShirt.variants.filter(v => v.stock > 0).map(v => v.size).join(', ') || 'None'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => setEditingShirtGroup(groupedShirt)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeletingShirtGroup(groupedShirt)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

      {/* Create Modal */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-gray-900/40 z-50 flex items-center justify-center p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div 
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4">Create New Shirt</h2>
            <ShirtForm
              onSubmit={handleCreate}
              onCancel={() => setShowCreateModal(false)}
              loading={formLoading}
            />
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingShirtGroup && (
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-gray-900/40 z-50 flex items-center justify-center p-4"
          onClick={() => setEditingShirtGroup(null)}
        >
          <div 
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4">Edit Shirt</h2>
            <ShirtForm
              shirts={editingShirtGroup.variants}
              onSubmit={handleUpdate}
              onCancel={() => setEditingShirtGroup(null)}
              loading={formLoading}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingShirtGroup && (
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-gray-900/40 z-50 flex items-center justify-center p-4"
          onClick={() => setDeletingShirtGroup(null)}
        >
          <div 
            className="bg-white rounded-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Delete Shirt</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{deletingShirtGroup.name}"? 
              {deletingShirtGroup.variants.length > 1 && (
                <span className="block mt-2 text-sm">
                  This will delete all {deletingShirtGroup.variants.length} size variant(s). This action cannot be undone.
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setDeletingShirtGroup(null)}
                disabled={deleteLoading}
                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

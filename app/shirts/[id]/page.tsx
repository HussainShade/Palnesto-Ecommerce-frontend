'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Shirt, ShirtSize } from '@/types';
import { fetchShirtById, fetchShirtVariantsByDesignId } from '@/lib/api';
import { addToCart, getCart } from '@/lib/cart';
import Cart from '@/components/Cart';

export default function ShirtDetailPage() {
  const params = useParams();
  const shirtId = params.id as string;
  
  const [shirt, setShirt] = useState<Shirt | null>(null);
  const [variants, setVariants] = useState<Shirt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<ShirtSize | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);

  // Update cart count on mount
  useEffect(() => {
    const updateCartCount = () => {
      const cart = getCart();
      const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      setCartItemCount(count);
    };
    updateCartCount();
  }, []);

  useEffect(() => {
    if (shirtId) {
      loadShirtData();
    }
  }, [shirtId]);

  const loadShirtData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch shirt design and all variants in one call
      // The API returns both shirt design and all sizes in one response
      const allVariants = await fetchShirtVariantsByDesignId(shirtId);
      
      if (!allVariants || allVariants.length === 0) {
        throw new Error('Shirt not found or has no variants');
      }
      
      // Store all variants from API (including those with stock = 0)
      // API returns ALL variants sorted by sizeReference.order (M, L, XL, XXL)
      setVariants(allVariants);
      
      // Create a base shirt object with design info (name, description, type)
      // Price and image will come from the selected variant
      const baseShirt: Shirt = {
        id: shirtId, // Use design ID
        name: allVariants[0].name,
        description: allVariants[0].description,
        imageUrl: allVariants[0].imageUrl, // Will be updated when size changes
        originalPrice: allVariants[0].originalPrice, // Will be updated when size changes
        discountedPrice: allVariants[0].discountedPrice, // Will be updated when size changes
        size: allVariants[0].size,
        type: allVariants[0].type,
        stock: allVariants[0].stock,
      };
      setShirt(baseShirt);
      
      // Set initial selected size to first available size
      const firstAvailable = allVariants.find(v => v.stock > 0);
      if (firstAvailable) {
        setSelectedSize(firstAvailable.size);
        // Update shirt with first available variant's price and image
        setShirt({
          ...baseShirt,
          imageUrl: firstAvailable.imageUrl,
          originalPrice: firstAvailable.originalPrice,
          discountedPrice: firstAvailable.discountedPrice,
        });
      } else if (allVariants.length > 0) {
        setSelectedSize(allVariants[0].size);
      }
    } catch (err) {
      console.error('Error loading shirt data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load shirt details';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Group variants by size and get the first variant for each size (in case of duplicates)
  const getVariantBySize = (size: ShirtSize | null): Shirt | null => {
    if (!size) return null;
    // If multiple variants exist for the same size, use the first one
    return variants.find(v => v.size === size) || null;
  };

  // Get unique sizes from variants (deduplicate by size) - only show sizes that exist in API
  const getUniqueSizes = (): { size: ShirtSize; variant: Shirt; stock: number }[] => {
    const sizeMap = new Map<ShirtSize, Shirt>();
    
    // Group variants by size, keeping the first one for each size
    variants.forEach(variant => {
      if (!sizeMap.has(variant.size)) {
        sizeMap.set(variant.size, variant);
      }
    });
    
    // Return only sizes that exist in the API response (no static sizes)
    return Array.from(sizeMap.entries()).map(([size, variant]) => ({
      size,
      variant,
      stock: variant.stock,
    }));
  };

  const selectedVariant = getVariantBySize(selectedSize);
  const uniqueSizes = getUniqueSizes();
  const availableSizes = uniqueSizes.filter(s => s.stock > 0);
  const outOfStockSizes = uniqueSizes.filter(s => s.stock === 0);

  // Update shirt price and image when size changes
  useEffect(() => {
    if (selectedVariant && shirt) {
      setShirt(prevShirt => {
        if (!prevShirt) return prevShirt;
        return {
          ...prevShirt,
          imageUrl: selectedVariant.imageUrl,
          originalPrice: selectedVariant.originalPrice,
          discountedPrice: selectedVariant.discountedPrice,
          stock: selectedVariant.stock,
        };
      });
      // Reset quantity to 1 when size changes
      setQuantity(1);
    }
  }, [selectedSize, selectedVariant]);

  const handleAddToCart = () => {
    if (!selectedVariant || selectedVariant.stock === 0) {
      return;
    }

    // Check if quantity exceeds stock
    if (quantity > selectedVariant.stock) {
      alert(`Only ${selectedVariant.stock} items available in stock`);
      return;
    }

    // Store design ID and size in cart
    // This allows Cart component to fetch all variants and find the matching one
    addToCart(shirtId, quantity, selectedVariant.size);
    setCartItemCount(prev => prev + quantity);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
    
    // Trigger cart update to refresh Cart component if it's open
    const updateCartCount = () => {
      const cart = getCart();
      const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      setCartItemCount(count);
    };
    updateCartCount();
  };

  const discountPercentage = shirt
    ? Math.round(((shirt.originalPrice - shirt.discountedPrice) / shirt.originalPrice) * 100)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading shirt details...</p>
      </div>
    );
  }

  if (error || !shirt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Shirt not found'}</p>
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 underline"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-2xl font-bold text-gray-900">
              Shirt Store
            </Link>
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
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
            {/* Image Section */}
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
              <img
                src={shirt.imageUrl}
                alt={shirt.name}
                className="w-full h-full object-cover"
              />
              {discountPercentage > 0 && (
                <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded text-lg font-semibold">
                  -{discountPercentage}%
                </div>
              )}
            </div>

            {/* Details Section */}
            <div className="flex flex-col">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{shirt.name}</h1>
              <p className="text-gray-600 mb-4">{shirt.description}</p>
              
              {/* Price */}
              <div className="flex items-center gap-3 mb-6">
                <span className="text-gray-400 line-through text-xl">
                  ₹{shirt.originalPrice.toFixed(2)}
                </span>
                <span className="text-3xl font-bold text-gray-900">
                  ₹{shirt.discountedPrice.toFixed(2)}
                </span>
                {discountPercentage > 0 && (
                  <span className="text-green-600 font-semibold">
                    Save {discountPercentage}%
                  </span>
                )}
              </div>

              {/* Type */}
              <div className="mb-6">
                <span className="text-sm text-gray-600">Type: </span>
                <span className="text-sm font-medium text-gray-900">{shirt.type}</span>
              </div>

              {/* Size Selection - Only show sizes that exist in API response */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Size *
                </label>
                <div className="space-y-3">
                  {/* Available Sizes - Only show sizes from API with stock > 0 */}
                  {availableSizes.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Available Sizes:</p>
                      <div className="flex flex-wrap gap-2">
                        {availableSizes.map(({ size, variant, stock }) => {
                          const isSelected = selectedSize === size;
                          
                          return (
                            <button
                              key={`available-${variant.id}`}
                              onClick={() => setSelectedSize(size)}
                              className={`
                                px-4 py-2 border-2 rounded font-medium transition-colors
                                ${isSelected 
                                  ? 'border-blue-600 bg-blue-50 text-blue-600' 
                                  : 'border-gray-300 hover:border-gray-400 text-gray-700'
                                }
                              `}
                            >
                              {size}
                              <span className="ml-1 text-xs">({stock})</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Out of Stock Sizes - Only show sizes from API with stock = 0 */}
                  {outOfStockSizes.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Out of Stock:</p>
                      <div className="flex flex-wrap gap-2">
                        {outOfStockSizes.map(({ size, variant }) => (
                          <button
                            key={`outofstock-${variant.id}`}
                            disabled
                            className="px-4 py-2 border-2 border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed rounded font-medium"
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {selectedVariant && selectedVariant.stock === 0 && (
                  <p className="text-red-600 text-sm mt-2">This size is out of stock</p>
                )}
              </div>

              {/* Quantity Selection */}
              {selectedVariant && selectedVariant.stock > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                      className="w-10 h-10 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-50"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={selectedVariant.stock}
                      value={quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setQuantity(Math.max(1, Math.min(selectedVariant.stock, val)));
                      }}
                      className="w-20 text-center border border-gray-300 rounded py-2"
                    />
                    <button
                      onClick={() => setQuantity(prev => Math.min(selectedVariant.stock, prev + 1))}
                      className="w-10 h-10 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-50"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Add to Cart Button */}
              <div className="mt-auto">
                {selectedVariant && selectedVariant.stock > 0 ? (
                  <button
                    onClick={handleAddToCart}
                    className={`
                      w-full py-3 rounded font-semibold text-lg transition-colors
                      ${addedToCart
                        ? 'bg-green-600 text-white'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                      }
                    `}
                  >
                    {addedToCart ? '✓ Added to Cart!' : 'Add to Cart'}
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full py-3 rounded font-semibold text-lg bg-gray-300 text-gray-500 cursor-not-allowed"
                  >
                    Out of Stock
                  </button>
                )}
              </div>

              {/* Stock Info */}
              {selectedVariant && (
                <div className="mt-4 text-sm text-gray-600">
                  {selectedVariant.stock > 0 ? (
                    <span className="text-green-600 font-medium">
                      {selectedVariant.stock} items in stock
                    </span>
                  ) : (
                    <span className="text-red-600">Out of stock</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Cart Sidebar */}
      <Cart
        shirts={variants}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCartUpdate={() => {
          const cart = getCart();
          const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
          setCartItemCount(count);
          // Cart component will auto-refresh via interval when open
        }}
      />
    </div>
  );
}

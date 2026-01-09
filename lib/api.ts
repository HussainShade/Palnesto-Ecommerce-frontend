import type {
  Shirt,
  ShirtFilters,
  PaginationParams,
  PaginatedResponse,
  LoginCredentials,
  LoginResponse,
  CreateShirtData,
  UpdateShirtData,
  BackendShirt,
  BatchCreateShirtData,
  GroupedShirt,
  GroupedShirtResponse,
  AdminLoginResponse,
  CustomerSignupData,
  CreateSellerData,
  ShirtSize,
  ShirtType,
} from '@/types';
import { referenceDataManager } from './referenceData';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

/**
 * Helper to extract size from backend response (handles both object and string)
 * NEW API uses sizeRef or sizeReference
 */
function extractSize(backendShirt: BackendShirt | any): ShirtSize {
  // API documentation shows both 'sizeRef' (in grouped/list responses) and 'sizeReference' (in single shirt response)
  // Check both, prioritizing 'sizeReference' as it's used in GET /api/shirts/:id
  if (backendShirt.sizeReference) {
    if (typeof backendShirt.sizeReference === 'object' && backendShirt.sizeReference.name) {
      return backendShirt.sizeReference.name;
    }
  }
  if (backendShirt.sizeRef) {
    if (typeof backendShirt.sizeRef === 'object' && backendShirt.sizeRef.name) {
      return backendShirt.sizeRef.name;
    }
  }
  
  // Legacy support
  if (backendShirt.shirtSize) {
    if (typeof backendShirt.shirtSize === 'object' && backendShirt.shirtSize.name) {
      return backendShirt.shirtSize.name;
    }
    if (typeof backendShirt.shirtSize === 'string') {
      return backendShirt.shirtSize as ShirtSize;
    }
  }
  if (backendShirt.size) {
    return backendShirt.size;
  }
  
  console.warn('Could not extract size from:', backendShirt);
  return 'M'; // Default fallback
}

/**
 * Helper to extract type from backend response (handles both object and string)
 */
function extractType(backendShirt: BackendShirt | any): ShirtType {
  if (backendShirt.shirtType) {
    if (typeof backendShirt.shirtType === 'object' && backendShirt.shirtType.name) {
      return backendShirt.shirtType.name;
    }
    if (typeof backendShirt.shirtType === 'string') {
      return backendShirt.shirtType as ShirtType;
    }
  }
  if (backendShirt.type) {
    return backendShirt.type;
  }
  return 'Casual'; // Default fallback
}

/**
 * Helper to extract imageUrl from backend response
 */
function extractImageUrl(backendShirt: BackendShirt | any): string {
  return backendShirt.imageURL || 'https://fastly.picsum.photos/id/193/200/200.jpg?hmac=JHo5tWHSRWvVbL3HX6rwDNdkvYPFojLtXkEGEUCgz6A';
}

/**
 * Map backend shirt to frontend shirt format
 */
function mapBackendShirtToShirt(backendShirt: BackendShirt): Shirt {
  // Extract reference data for future use
  referenceDataManager.extractFromShirt(backendShirt);
  
  const size = extractSize(backendShirt);
  const type = extractType(backendShirt);
  
  return {
    id: backendShirt._id,
    name: backendShirt.name,
    description: backendShirt.description || '',
    imageUrl: extractImageUrl(backendShirt),
    originalPrice: backendShirt.price,
    discountedPrice: backendShirt.finalPrice,
    size,
    type,
    stock: backendShirt.stock || 0,
  };
}

/**
 * API abstraction layer
 * All backend communication happens through these functions
 */

/**
 * Fetch shirts with server-driven filters and pagination
 * Maps backend response format to frontend types
 * @param groupBy - If 'design', returns grouped shirts. Otherwise returns individual variants.
 */
export async function fetchShirts(
  filters?: ShirtFilters,
  pagination?: PaginationParams,
  groupBy?: 'design'
): Promise<PaginatedResponse<Shirt> | PaginatedResponse<GroupedShirt>> {
  // Set defaults
  const filtersWithDefaults = filters || {};
  const paginationWithDefaults = pagination || { page: 1, limit: 12 };
  const params = new URLSearchParams();
  
  // Add filters - Backend now supports both ObjectId and string formats
  // Prefer string format for better developer experience
  if (filtersWithDefaults.sizeReferenceId) {
    // Check if it's an ObjectId or a string value
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(filtersWithDefaults.sizeReferenceId);
    if (isObjectId) {
      params.append('sizeReferenceId', filtersWithDefaults.sizeReferenceId);
    } else {
      // String value (M, L, XL, XXL) - use 'size' parameter
      params.append('size', filtersWithDefaults.sizeReferenceId);
    }
  } else if (filtersWithDefaults.size) {
    // Direct string value - backend accepts this directly
    params.append('size', filtersWithDefaults.size);
  }
  
  if (filtersWithDefaults.shirtTypeId) {
    // Check if it's an ObjectId or a string value
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(filtersWithDefaults.shirtTypeId);
    if (isObjectId) {
      params.append('shirtTypeId', filtersWithDefaults.shirtTypeId);
    } else {
      // String value (Casual, Formal, etc.) - use 'type' parameter
      params.append('type', filtersWithDefaults.shirtTypeId);
    }
  } else if (filtersWithDefaults.type) {
    // Direct string value - backend accepts this directly
    params.append('type', filtersWithDefaults.type);
  }
  
  if (filtersWithDefaults.minPrice !== undefined) params.append('minPrice', filtersWithDefaults.minPrice.toString());
  if (filtersWithDefaults.maxPrice !== undefined) params.append('maxPrice', filtersWithDefaults.maxPrice.toString());
  
  // Add pagination
  params.append('page', paginationWithDefaults.page.toString());
  params.append('limit', paginationWithDefaults.limit.toString());
  
  // Add groupBy if specified
  if (groupBy === 'design') {
    params.append('groupBy', 'design');
  }

  const response = await fetch(`${API_BASE_URL}/shirts?${params.toString()}`, {
    method: 'GET',
    credentials: 'include', // Important for cookies
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch shirts: ${response.statusText}`);
  }

  const apiResponse = await response.json();
  
  // Map backend response format to frontend format
  if (apiResponse.success && apiResponse.data) {
    const backendData = apiResponse.data;
    
    // Extract reference data from responses FIRST (before mapping)
    // This ensures filters can work on subsequent requests
    backendData.shirts.forEach((shirt: BackendShirt | GroupedShirtResponse) => {
      if ('variants' in shirt) {
        referenceDataManager.extractFromGroupedShirt(shirt as GroupedShirtResponse);
      } else {
        referenceDataManager.extractFromShirt(shirt as BackendShirt);
      }
    });
    
    // Check if we had filters that couldn't be applied due to missing reference data
    // If so, we could trigger a re-fetch, but for now we'll just let the user change filters again
    // The reference data is now populated, so next filter change will work
    
    // If grouped response
    if (groupBy === 'design') {
      return {
        data: backendData.shirts.map((groupedShirt: GroupedShirtResponse) => {
          const type = extractType(groupedShirt);
          
          // Map variants to Shirt format - NEW API: each variant has its own price and imageURL
          const variants: Shirt[] = groupedShirt.variants.map(variant => {
            const size = extractSize(variant);
            const variantImageUrl = variant.imageURL || 'https://fastly.picsum.photos/id/193/200/200.jpg?hmac=JHo5tWHSRWvVbL3HX6rwDNdkvYPFojLtXkEGEUCgz6A';
            return {
              id: variant._id, // ShirtSize document ID
              name: groupedShirt.name,
              description: groupedShirt.description || '',
              imageUrl: variantImageUrl, // Per-size imageURL
              originalPrice: variant.price, // Per-size price
              discountedPrice: variant.finalPrice,
              size,
              type,
              stock: variant.stock || 0,
            };
          });
          
          // Calculate representative price for grouped shirt (use first variant or average)
          const representativePrice = variants.length > 0 ? variants[0].originalPrice : 0;
          const representativeFinalPrice = variants.length > 0 ? variants[0].discountedPrice : 0;
          
          // Return grouped shirt
          return {
            id: groupedShirt._id,
            name: groupedShirt.name,
            description: groupedShirt.description || '',
            type,
            originalPrice: representativePrice, // Representative price
            discountedPrice: representativeFinalPrice, // Representative final price
            variants,
            availableSizes: groupedShirt.availableSizes,
          } as GroupedShirt;
        }),
        total: backendData.total,
        page: backendData.page,
        limit: backendData.limit,
        totalPages: backendData.totalPages,
      };
    }
    
    // Standard response (individual variants)
    return {
      data: backendData.shirts.map((shirt: BackendShirt) => mapBackendShirtToShirt(shirt)),
      total: backendData.total,
      page: backendData.page,
      limit: backendData.limit,
      totalPages: backendData.totalPages,
    };
  }
  
  // Fallback if response format is different
  return apiResponse;
}

/**
 * Fetch a single shirt by ID (Public)
 * NEW API: Returns shirt design and shirtSizes array separately
 * @param shirtId - Shirt design ID (not ShirtSize document ID)
 * @returns First variant as Shirt (for backward compatibility)
 */
export async function fetchShirtById(shirtId: string): Promise<Shirt> {
  const response = await fetch(`${API_BASE_URL}/shirts/${shirtId}`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || `Failed to fetch shirt: ${response.statusText}`;
    throw new Error(errorMessage);
  }

  const apiResponse = await response.json();

  if (!apiResponse.success) {
    throw new Error(apiResponse.message || 'Shirt not found');
  }

  // Backend may return 'sizes' or 'shirtSizes'
  const shirtSizesArray = apiResponse.data?.shirtSizes || apiResponse.data?.sizes;
  
  if (apiResponse.data?.shirt && shirtSizesArray && Array.isArray(shirtSizesArray)) {
    const shirtDesign = apiResponse.data.shirt;
    
    // Use the first size variant (or you could return all variants)
    if (shirtSizesArray.length > 0) {
      const firstVariant = shirtSizesArray[0];
      const size = extractSize(firstVariant);
      const type = extractType(shirtDesign);
      
      // Extract reference data
      referenceDataManager.extractFromShirt({ ...firstVariant, ...shirtDesign } as BackendShirt);
      
      return {
        id: shirtId, // Use design ID (not ShirtSize document ID) for consistency
        name: shirtDesign.name,
        description: shirtDesign.description || '',
        imageUrl: firstVariant.imageURL || 'https://fastly.picsum.photos/id/193/200/200.jpg?hmac=JHo5tWHSRWvVbL3HX6rwDNdkvYPFojLtXkEGEUCgz6A',
        originalPrice: firstVariant.price, // Per-size price
        discountedPrice: firstVariant.finalPrice,
        size,
        type,
        stock: firstVariant.stock || 0,
      };
    }
  }

  throw new Error(apiResponse.message || 'Shirt not found');
}

/**
 * Fetch all variants of a shirt design by design ID
 * NEW API: Uses the shirtSizes array from fetchShirtById response
 */
export async function fetchShirtVariantsByDesignId(shirtId: string): Promise<Shirt[]> {
  const url = `${API_BASE_URL}/shirts/${shirtId}`;
  
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    let errorMessage = `Failed to fetch shirt variants: ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      // Ignore JSON parse errors
    }
    throw new Error(errorMessage);
  }

  const apiResponse = await response.json();

  if (!apiResponse.success) {
    throw new Error(apiResponse.message || 'Failed to fetch shirt variants');
  }

  // Check for the expected response structure
  if (!apiResponse.data) {
    throw new Error('Invalid API response: missing data field');
  }

  // API documentation: response includes 'shirtSizes' and 'sizes' (alias)
  const { shirt: shirtDesign, shirtSizes, sizes } = apiResponse.data;
  // Prioritize 'shirtSizes' over 'sizes' alias
  const shirtSizesArray = shirtSizes || sizes;

  if (!shirtDesign) {
    throw new Error('Shirt design not found');
  }

  if (!shirtSizesArray || !Array.isArray(shirtSizesArray) || shirtSizesArray.length === 0) {
    throw new Error('Shirt has no size variants');
  }
  
  const type = extractType(shirtDesign);
  
  // Map all ShirtSize documents to Shirt format
  // API returns ALL variants (including stock = 0), sorted by sizeReference.order
  // Each variant has sizeReference populated with name, displayName, order
  const mappedVariants = shirtSizesArray.map((shirtSize: any) => {
    // Extract size from sizeReference.name (per API documentation)
    const size = extractSize(shirtSize);
    
    // Extract reference data for future filter operations
    referenceDataManager.extractFromShirt({ ...shirtSize, ...shirtDesign } as BackendShirt);
    
    return {
      id: shirtSize._id, // ShirtSize document ID for cart operations
      name: shirtDesign.name,
      description: shirtDesign.description || '',
      imageUrl: shirtSize.imageURL || 'https://fastly.picsum.photos/id/193/200/200.jpg?hmac=JHo5tWHSRWvVbL3HX6rwDNdkvYPFojLtXkEGEUCgz6A',
      originalPrice: shirtSize.price, // Per-size price (varies by size)
      discountedPrice: shirtSize.finalPrice, // Calculated with discount
      size, // Extracted from sizeReference.name
      type,
      stock: shirtSize.stock || 0, // Can be 0 (out of stock)
    };
  });
  
  // Variants are already sorted by sizeReference.order from backend
  // Return as-is to preserve the order (M, L, XL, XXL)
  return mappedVariants;
}

/**
 * Fetch all variants of a shirt (same design) - for product detail page
 * NEW API: Fetches by shirtId (design ID) to get all size variants
 */
export async function fetchShirtVariants(shirt: Shirt): Promise<Shirt[]> {
  // Try to get shirtId from the shirt (if it's a ShirtSize document, we need the design ID)
  // For now, fetch by name and type, then filter
  const response = await fetchShirts(
    { type: shirt.type },
    { page: 1, limit: 100 } // Get enough to find all variants
  ) as PaginatedResponse<Shirt>;

  // Filter to get only variants with same name (all size variants share the same name)
  // Note: Price can vary by size now, so we don't filter by price
  return response.data.filter(
    s => s.name === shirt.name
  );
}

/**
 * Seller login - sends credentials, receives HTTP-only cookie
 * Endpoint: POST /api/auth/login (per API documentation)
 */
export async function sellerLogin(credentials: LoginCredentials): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Important for receiving HTTP-only cookies
    body: JSON.stringify(credentials),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      message: data.message || 'Login failed',
    };
  }

  // Set auth state on successful login
  setSellerAuthState(true);

  return {
    success: data.success || true,
    message: data.message,
  };
}

/**
 * Batch create shirts with multiple sizes (Protected - requires authentication)
 * Uses POST /api/shirts/batch endpoint
 */
export async function batchCreateShirts(shirtData: BatchCreateShirtData): Promise<{ success: boolean; message?: string; shirts?: Shirt[] }> {
  const response = await fetch(`${API_BASE_URL}/shirts/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(shirtData),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      message: data.message || 'Failed to create shirts',
    };
  }

  // API documentation shows 'shirtSizes', but backend may return 'sizes' (support both)
  // Prioritize documented field name 'shirtSizes' over 'sizes'
  const shirtSizesArray = data.data?.shirtSizes || data.data?.sizes;
  
  if (data.success && data.data?.shirt && shirtSizesArray && Array.isArray(shirtSizesArray)) {
    const shirtDesign = data.data.shirt;
    
    // Map ShirtSize documents to Shirt format
    const shirts: Shirt[] = shirtSizesArray.map((shirtSize: any) => {
      const size = extractSize(shirtSize);
      const type = extractType(shirtDesign);
      
      // Extract reference data
      referenceDataManager.extractFromShirt({ ...shirtSize, ...shirtDesign } as BackendShirt);
      
      return {
        id: shirtSize._id, // ShirtSize document ID
        name: shirtDesign.name,
        description: shirtDesign.description || '',
        imageUrl: shirtSize.imageURL || 'https://fastly.picsum.photos/id/193/200/200.jpg?hmac=JHo5tWHSRWvVbL3HX6rwDNdkvYPFojLtXkEGEUCgz6A',
        originalPrice: shirtSize.price, // Per-size price
        discountedPrice: shirtSize.finalPrice,
        size,
        type,
        stock: shirtSize.stock || 0,
      };
    });

    return {
      success: true,
      message: data.message,
      shirts,
    };
  }
  
  // Legacy support for old response format
  if (data.success && data.data?.shirts) {
    const shirts: Shirt[] = data.data.shirts.map((backendShirt: BackendShirt) => mapBackendShirtToShirt(backendShirt));

    return {
      success: true,
      message: data.message,
      shirts,
    };
  }

  return {
    success: true,
    message: data.message,
  };
}

/**
 * Create a new shirt (Protected - requires authentication)
 * Single shirt creation - kept for backward compatibility
 */
export async function createShirt(shirtData: CreateShirtData): Promise<{ success: boolean; message?: string; shirt?: Shirt }> {
  const response = await fetch(`${API_BASE_URL}/shirts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(shirtData),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      message: data.message || 'Failed to create shirt',
    };
  }

  // NEW API: Returns shirt design and shirtSize (single variant)
  if (data.success && data.data?.shirt && data.data?.shirtSize) {
    const shirtDesign = data.data.shirt;
    const shirtSize = data.data.shirtSize;
    const size = extractSize(shirtSize);
    const type = extractType(shirtDesign);
    
    // Extract reference data
    referenceDataManager.extractFromShirt({ ...shirtSize, ...shirtDesign } as BackendShirt);
    
    return {
      success: true,
      message: data.message,
      shirt: {
        id: shirtSize._id, // ShirtSize document ID
        name: shirtDesign.name,
        description: shirtDesign.description || '',
        imageUrl: shirtSize.imageURL || 'https://fastly.picsum.photos/id/193/200/200.jpg?hmac=JHo5tWHSRWvVbL3HX6rwDNdkvYPFojLtXkEGEUCgz6A',
        originalPrice: shirtSize.price, // Per-size price
        discountedPrice: shirtSize.finalPrice,
        size,
        type,
        stock: shirtSize.stock || 0,
      },
    };
  }
  
  // Legacy support for old response format
  if (data.success && data.data?.shirt) {
    const backendShirt: BackendShirt = data.data.shirt;
    return {
      success: true,
      message: data.message,
      shirt: mapBackendShirtToShirt(backendShirt),
    };
  }

  return {
    success: true,
    message: data.message,
  };
}

/**
 * Update an existing shirt (Protected - requires authentication)
 * Supports updating shirt and creating new size variants via sizes array
 */
export async function updateShirt(
  shirtId: string, 
  shirtData: UpdateShirtData
): Promise<{ success: boolean; message?: string; shirt?: Shirt; updatedShirts?: Shirt[]; createdShirts?: Shirt[]; updatedCount?: number; createdCount?: number }> {
  const response = await fetch(`${API_BASE_URL}/shirts/${shirtId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(shirtData),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      message: data.message || 'Failed to update shirt',
    };
  }

  if (data.success && data.data) {
    const result: { shirt?: Shirt; updatedShirts?: Shirt[]; createdShirts?: Shirt[]; updatedCount?: number; createdCount?: number } = {};
    const shirtDesign = data.data.shirt;
    
    // Map updated shirt design (if provided)
    // Note: The main shirt is the design, but we need a ShirtSize to create a Shirt
    // For now, we'll use the first updated or created variant if available
    if (shirtDesign) {
      // Try to get a variant to map
      const firstVariant = data.data.updatedShirtSizes?.[0] || data.data.createdShirtSizes?.[0];
      if (firstVariant) {
        const size = extractSize(firstVariant);
        const type = extractType(shirtDesign);
        result.shirt = {
          id: firstVariant._id, // Use ShirtSize document ID
          name: shirtDesign.name,
          description: shirtDesign.description || '',
          imageUrl: firstVariant.imageURL || 'https://fastly.picsum.photos/id/193/200/200.jpg?hmac=JHo5tWHSRWvVbL3HX6rwDNdkvYPFojLtXkEGEUCgz6A',
          originalPrice: firstVariant.price,
          discountedPrice: firstVariant.finalPrice,
          size,
          type,
          stock: firstVariant.stock || 0,
        };
      }
    }

    // Map updated shirt sizes (NEW API: updatedShirtSizes instead of updatedShirts)
    if (data.data.updatedShirtSizes && Array.isArray(data.data.updatedShirtSizes)) {
      result.updatedShirts = data.data.updatedShirtSizes.map((shirtSize: any) => {
        const size = extractSize(shirtSize);
        const type = extractType(shirtDesign || {});
        return {
          id: shirtSize._id,
          name: shirtDesign?.name || '',
          description: shirtDesign?.description || '',
          imageUrl: shirtSize.imageURL || 'https://fastly.picsum.photos/id/193/200/200.jpg?hmac=JHo5tWHSRWvVbL3HX6rwDNdkvYPFojLtXkEGEUCgz6A',
          originalPrice: shirtSize.price,
          discountedPrice: shirtSize.finalPrice,
          size,
          type,
          stock: shirtSize.stock || 0,
        };
      });
    }
    
    // Legacy support for old format
    if (data.data.updatedShirts && Array.isArray(data.data.updatedShirts)) {
      result.updatedShirts = data.data.updatedShirts.map((backendShirt: BackendShirt) => mapBackendShirtToShirt(backendShirt));
    }

    // Map created shirt sizes (NEW API: createdShirtSizes instead of createdShirts)
    if (data.data.createdShirtSizes && Array.isArray(data.data.createdShirtSizes)) {
      result.createdShirts = data.data.createdShirtSizes.map((shirtSize: any) => {
        const size = extractSize(shirtSize);
        const type = extractType(shirtDesign || {});
        return {
          id: shirtSize._id,
          name: shirtDesign?.name || '',
          description: shirtDesign?.description || '',
          imageUrl: shirtSize.imageURL || 'https://fastly.picsum.photos/id/193/200/200.jpg?hmac=JHo5tWHSRWvVbL3HX6rwDNdkvYPFojLtXkEGEUCgz6A',
          originalPrice: shirtSize.price,
          discountedPrice: shirtSize.finalPrice,
          size,
          type,
          stock: shirtSize.stock || 0,
        };
      });
    }
    
    // Legacy support for old format
    if (data.data.createdShirts && Array.isArray(data.data.createdShirts)) {
      result.createdShirts = data.data.createdShirts.map((backendShirt: BackendShirt) => mapBackendShirtToShirt(backendShirt));
    }

    result.updatedCount = data.data.updatedCount || 0;
    result.createdCount = data.data.createdCount || 0;

    return {
      success: true,
      message: data.message,
      ...result,
    };
  }

  return {
    success: true,
    message: data.message,
  };
}

/**
 * Delete a shirt (Protected - requires authentication)
 */
export async function deleteShirt(shirtId: string): Promise<{ success: boolean; message?: string }> {
  const response = await fetch(`${API_BASE_URL}/shirts/${shirtId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      message: data.message || 'Failed to delete shirt',
    };
  }

  return {
    success: true,
    message: data.message || 'Shirt deleted successfully',
  };
}

/**
 * Fetch seller's own shirts (Protected - requires authentication)
 * Note: Backend filters by sellerId from auth token
 */
export async function fetchSellerShirts(
  pagination: PaginationParams = { page: 1, limit: 20 }
): Promise<PaginatedResponse<Shirt>> {
  const params = new URLSearchParams();
  params.append('page', pagination.page.toString());
  params.append('limit', pagination.limit.toString());

  const response = await fetch(`${API_BASE_URL}/shirts?${params.toString()}`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch shirts: ${response.statusText}`);
  }

  const apiResponse = await response.json();

  if (apiResponse.success && apiResponse.data) {
    const backendData = apiResponse.data;
    // Extract reference data
    backendData.shirts.forEach((shirt: BackendShirt) => {
      referenceDataManager.extractFromShirt(shirt);
    });
    
    return {
      data: backendData.shirts.map((shirt: BackendShirt) => mapBackendShirtToShirt(shirt)),
      total: backendData.total,
      page: backendData.page,
      limit: backendData.limit,
      totalPages: backendData.totalPages,
    };
  }

  return apiResponse;
}

/**
 * Check if seller is authenticated
 * Uses localStorage to track auth state (set on login, cleared on logout)
 * Note: Actual auth is handled by HTTP-only cookies, this is just for UI state
 */
export function checkSellerAuth(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return localStorage.getItem('seller_authenticated') === 'true';
}

/**
 * Set seller authentication state in localStorage
 */
export function setSellerAuthState(authenticated: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }
  if (authenticated) {
    localStorage.setItem('seller_authenticated', 'true');
  } else {
    localStorage.removeItem('seller_authenticated');
  }
}

/**
 * Seller logout - clears authentication cookie
 */
export async function sellerLogout(): Promise<{ success: boolean; message?: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      message: data.message || 'Logout failed',
    };
  }

  // Clear auth state on logout
  setSellerAuthState(false);

  return {
    success: data.success || true,
    message: data.message,
  };
}

/**
 * Admin logout - clears authentication cookie
 */
export async function adminLogout(): Promise<{ success: boolean; message?: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      message: data.message || 'Logout failed',
    };
  }

  // Clear admin auth state on logout
  if (typeof window !== 'undefined') {
    localStorage.removeItem('admin_authenticated');
  }

  return {
    success: data.success || true,
    message: data.message,
  };
}

/**
 * Customer logout - clears authentication cookie
 */
export async function customerLogout(): Promise<{ success: boolean; message?: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      message: data.message || 'Logout failed',
    };
  }

  // Clear customer auth state on logout
  if (typeof window !== 'undefined') {
    localStorage.removeItem('customer_authenticated');
  }

  return {
    success: data.success || true,
    message: data.message,
  };
}

/**
 * Check if admin is authenticated
 */
export function checkAdminAuth(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return localStorage.getItem('admin_authenticated') === 'true';
}

/**
 * Check if customer is authenticated
 */
export function checkCustomerAuth(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return localStorage.getItem('customer_authenticated') === 'true';
}

/**
 * Health Check - Check if the server is running
 */
export async function healthCheck(): Promise<{ success: boolean; message?: string; timestamp?: string }> {
  const response = await fetch(`${BASE_URL}/health`, {
    method: 'GET',
    credentials: 'include',
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      message: data.message || 'Health check failed',
    };
  }

  return {
    success: data.success || true,
    message: data.message,
    timestamp: data.timestamp,
  };
}

/**
 * Admin login - Authenticate an administrator
 */
export async function adminLogin(credentials: LoginCredentials): Promise<AdminLoginResponse> {
  const response = await fetch(`${API_BASE_URL}/admin/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(credentials),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      message: data.message || 'Login failed',
    };
  }

  return {
    success: data.success || true,
    message: data.message,
    data: data.data,
  };
}

/**
 * Create seller (Admin only) - Create a new seller account
 */
export async function createSeller(sellerData: CreateSellerData): Promise<{ success: boolean; message?: string; data?: { seller: { id: string; email: string; name: string } } }> {
  const response = await fetch(`${API_BASE_URL}/admin/sellers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(sellerData),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      message: data.message || 'Failed to create seller',
    };
  }

  return {
    success: data.success || true,
    message: data.message,
    data: data.data,
  };
}

/**
 * Customer signup - Create a new customer account and auto-login
 */
export async function customerSignup(signupData: CustomerSignupData): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/customer/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(signupData),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      message: data.message || 'Signup failed',
    };
  }

  return {
    success: data.success || true,
    message: data.message,
    data: data.data,
  };
}

/**
 * Customer login - Authenticate a customer
 */
export async function customerLogin(credentials: LoginCredentials): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/customer/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(credentials),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      message: data.message || 'Login failed',
    };
  }

  return {
    success: data.success || true,
    message: data.message,
    data: data.data,
  };
}

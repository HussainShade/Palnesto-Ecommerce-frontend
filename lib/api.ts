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
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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
  
  // Add filters
  if (filtersWithDefaults.size) params.append('size', filtersWithDefaults.size);
  if (filtersWithDefaults.type) params.append('type', filtersWithDefaults.type);
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
    
    // If grouped response
    if (groupBy === 'design') {
      return {
        data: backendData.shirts.map((groupedShirt: GroupedShirtResponse) => {
          // Map variants to Shirt format
          const variants: Shirt[] = groupedShirt.variants.map(variant => ({
            id: variant._id,
            name: groupedShirt.name,
            description: groupedShirt.description || '',
            imageUrl: '/placeholder-shirt.jpg',
            originalPrice: groupedShirt.price,
            discountedPrice: variant.finalPrice,
            size: variant.size,
            type: groupedShirt.type,
            stock: variant.stock || 0,
          }));
          
          // Return grouped shirt
          return {
            id: groupedShirt._id,
            name: groupedShirt.name,
            description: groupedShirt.description || '',
            type: groupedShirt.type,
            originalPrice: groupedShirt.price,
            discountedPrice: groupedShirt.finalPrice,
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
      data: backendData.shirts.map((shirt: BackendShirt) => ({
        id: shirt._id,
        name: shirt.name,
        description: shirt.description || '',
        imageUrl: '/placeholder-shirt.jpg',
        originalPrice: shirt.price,
        discountedPrice: shirt.finalPrice,
        size: shirt.size,
        type: shirt.type,
        stock: shirt.stock || 0,
      })),
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
 */
export async function fetchShirtById(shirtId: string): Promise<Shirt> {
  const response = await fetch(`${API_BASE_URL}/shirts/${shirtId}`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch shirt: ${response.statusText}`);
  }

  const apiResponse = await response.json();

  if (apiResponse.success && apiResponse.data?.shirt) {
    const shirt = apiResponse.data.shirt;
    return {
      id: shirt._id,
      name: shirt.name,
      description: shirt.description || '',
      imageUrl: shirt.imageUrl || '/placeholder-shirt.jpg',
      originalPrice: shirt.price,
      discountedPrice: shirt.finalPrice,
      size: shirt.size,
      type: shirt.type,
      stock: shirt.stock || 0,
    };
  }

  throw new Error('Shirt not found');
}

/**
 * Fetch all variants of a shirt (same name, type, price) - for product detail page
 * Uses the list endpoint with filters to get all variants
 */
export async function fetchShirtVariants(shirt: Shirt): Promise<Shirt[]> {
  // Fetch individual variants (not grouped)
  const response = await fetchShirts(
    { type: shirt.type },
    { page: 1, limit: 100 } // Get enough to find all variants
  ) as PaginatedResponse<Shirt>;

  // Filter to get only variants with same name and price
  return response.data.filter(
    s => s.name === shirt.name && s.originalPrice === shirt.originalPrice
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

  if (data.success && data.data?.shirts) {
    const shirts: Shirt[] = data.data.shirts.map((backendShirt: BackendShirt) => ({
      id: backendShirt._id,
      name: backendShirt.name,
      description: backendShirt.description || '',
      imageUrl: '/placeholder-shirt.jpg',
      originalPrice: backendShirt.price,
      discountedPrice: backendShirt.finalPrice,
      size: backendShirt.size,
      type: backendShirt.type,
      stock: backendShirt.stock || 0,
    }));

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

  if (data.success && data.data?.shirt) {
    const backendShirt: BackendShirt = data.data.shirt;
    return {
      success: true,
      message: data.message,
      shirt: {
        id: backendShirt._id,
        name: backendShirt.name,
        description: backendShirt.description || '',
        imageUrl: '/placeholder-shirt.jpg',
        originalPrice: backendShirt.price,
        discountedPrice: backendShirt.finalPrice,
        size: backendShirt.size,
        type: backendShirt.type,
        stock: backendShirt.stock || 0,
      },
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
    
    // Map updated shirt
    if (data.data.shirt) {
      const backendShirt: BackendShirt = data.data.shirt;
      result.shirt = {
        id: backendShirt._id,
        name: backendShirt.name,
        description: backendShirt.description || '',
        imageUrl: '/placeholder-shirt.jpg',
        originalPrice: backendShirt.price,
        discountedPrice: backendShirt.finalPrice,
        size: backendShirt.size,
        type: backendShirt.type,
        stock: backendShirt.stock || 0,
      };
    }

    // Map updated shirts (existing variants that were updated)
    if (data.data.updatedShirts && Array.isArray(data.data.updatedShirts)) {
      result.updatedShirts = data.data.updatedShirts.map((backendShirt: BackendShirt) => ({
        id: backendShirt._id,
        name: backendShirt.name,
        description: backendShirt.description || '',
        imageUrl: '/placeholder-shirt.jpg',
        originalPrice: backendShirt.price,
        discountedPrice: backendShirt.finalPrice,
        size: backendShirt.size,
        type: backendShirt.type,
        stock: backendShirt.stock || 0,
      }));
    }

    // Map created shirts (new variants that were created)
    if (data.data.createdShirts && Array.isArray(data.data.createdShirts)) {
      result.createdShirts = data.data.createdShirts.map((backendShirt: BackendShirt) => ({
        id: backendShirt._id,
        name: backendShirt.name,
        description: backendShirt.description || '',
        imageUrl: '/placeholder-shirt.jpg',
        originalPrice: backendShirt.price,
        discountedPrice: backendShirt.finalPrice,
        size: backendShirt.size,
        type: backendShirt.type,
        stock: backendShirt.stock || 0,
      }));
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
    return {
      data: backendData.shirts.map((shirt: BackendShirt) => ({
        id: shirt._id,
        name: shirt.name,
        description: shirt.description || '',
        imageUrl: '/placeholder-shirt.jpg',
        originalPrice: shirt.price,
        discountedPrice: shirt.finalPrice,
        size: shirt.size,
        type: shirt.type,
        stock: shirt.stock || 0,
      })),
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

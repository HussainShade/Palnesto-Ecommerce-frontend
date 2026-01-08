import type {
  Shirt,
  ShirtFilters,
  PaginationParams,
  PaginatedResponse,
  LoginCredentials,
  LoginResponse,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * API abstraction layer
 * All backend communication happens through these functions
 */

/**
 * Fetch shirts with server-driven filters and pagination
 * Maps backend response format to frontend types
 */
export async function fetchShirts(
  filters: ShirtFilters = {},
  pagination: PaginationParams = { page: 1, limit: 12 }
): Promise<PaginatedResponse<Shirt>> {
  const params = new URLSearchParams();
  
  // Add filters
  if (filters.size) params.append('size', filters.size);
  if (filters.type) params.append('type', filters.type);
  if (filters.minPrice !== undefined) params.append('minPrice', filters.minPrice.toString());
  if (filters.maxPrice !== undefined) params.append('maxPrice', filters.maxPrice.toString());
  
  // Add pagination
  params.append('page', pagination.page.toString());
  params.append('limit', pagination.limit.toString());

  const response = await fetch(`${API_BASE_URL}/shirts?${params.toString()}`, {
    method: 'GET',
    credentials: 'include', // Important for cookies
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch shirts: ${response.statusText}`);
  }

  const apiResponse = await response.json();
  
  // Map backend response format to frontend format
  // Backend returns: { success: true, data: { shirts: [], total, page, limit, totalPages } }
  // Frontend expects: { data: [], total, page, limit, totalPages }
  if (apiResponse.success && apiResponse.data) {
    const backendData = apiResponse.data;
    return {
      data: backendData.shirts.map((shirt: any) => ({
        id: shirt._id,
        name: shirt.name,
        description: shirt.description || '',
        imageUrl: shirt.imageUrl || '/placeholder-shirt.jpg', // Fallback if no image
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

  return {
    success: data.success || true,
    message: data.message,
  };
}


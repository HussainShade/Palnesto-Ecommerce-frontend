// Shirt types
export type ShirtSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';

export type ShirtType = 'T-Shirt' | 'Polo' | 'Hoodie' | 'Sweatshirt' | 'Tank Top';

export interface Shirt {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  originalPrice: number;
  discountedPrice: number;
  size: ShirtSize;
  type: ShirtType;
  stock: number;
}

// Filter types
export interface ShirtFilters {
  size?: ShirtSize;
  type?: ShirtType;
  minPrice?: number;
  maxPrice?: number;
}

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Cart types
export interface CartItem {
  shirtId: string;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  totalAmount: number;
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
}


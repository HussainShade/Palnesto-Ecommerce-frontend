// Shirt types (matching backend API)
export type ShirtSize = 'M' | 'L' | 'XL' | 'XXL';

export type ShirtType = 'Casual' | 'Formal' | 'Wedding' | 'Sports' | 'Vintage';

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

// Shirt creation/update types
export interface Discount {
  type: 'percentage' | 'amount';
  value: number;
}

export interface CreateShirtData {
  name: string;
  description?: string;
  size: ShirtSize;
  type: ShirtType;
  price: number;
  discount?: Discount | null;
  stock?: number;
}

// Batch create request format (matches backend API)
export interface BatchCreateShirtData {
  name: string;
  description?: string;
  type: ShirtType;
  price: number;
  discount?: Discount | null;
  sizes: Array<{ size: ShirtSize; stock: number }>;
}

export interface UpdateShirtData {
  name?: string;
  description?: string;
  size?: ShirtSize;
  type?: ShirtType;
  price?: number;
  discount?: Discount | null;
  stock?: number;
  sizes?: Array<{ size: ShirtSize; stock: number }>; // For creating new size variants
}

// Backend shirt response format
export interface BackendShirt {
  _id: string;
  sellerId: string;
  name: string;
  description?: string;
  size: ShirtSize;
  type: ShirtType;
  price: number;
  discount?: Discount;
  finalPrice: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
}

// Grouped shirt response format (when groupBy=design)
export interface GroupedShirtResponse {
  _id: string;
  sellerId: string;
  name: string;
  description?: string;
  type: ShirtType;
  price: number;
  discount?: Discount;
  finalPrice: number;
  totalStock: number;
  availableSizes: ShirtSize[];
  variants: Array<{
    _id: string;
    size: ShirtSize;
    stock: number;
    finalPrice: number;
  }>;
}

// Frontend grouped shirt type
export interface GroupedShirt {
  id: string;
  name: string;
  description: string;
  type: ShirtType;
  originalPrice: number;
  discountedPrice: number;
  variants: Shirt[];
  availableSizes: ShirtSize[];
}

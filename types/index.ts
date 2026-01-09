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
  sizeReferenceId?: string; // MongoDB ObjectId (for filtering) - NEW API uses sizeReferenceId
  shirtTypeId?: string; // MongoDB ObjectId (for filtering)
  size?: ShirtSize; // Legacy support - will be converted to sizeReferenceId
  type?: ShirtType; // Legacy support - will be converted to shirtTypeId
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
  shirtId: string; // Design ID (for fetching)
  size?: ShirtSize; // Size (optional, for matching correct variant)
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
  data?: {
    user?: {
      id: string;
      email: string;
      name: string;
    };
    seller?: {
      id: string;
      email: string;
      name: string;
    };
    token?: string;
  };
}

// Admin types
export interface AdminLoginResponse extends LoginResponse {
  data?: {
    user: {
      id: string;
      email: string;
      name: string;
    };
    token: string;
  };
}

// Customer types
export interface CustomerSignupData {
  email: string;
  password: string;
  name: string;
}

export interface CreateSellerData {
  email: string;
  password: string;
  name: string;
}

// Shirt creation/update types
export interface Discount {
  type: 'percentage' | 'amount';
  value: number;
}

export interface CreateShirtData {
  name: string;
  description?: string;
  shirtTypeId: string; // MongoDB ObjectId
  discount?: Discount | null;
  sizeVariant: {
    sizeReferenceId: string; // MongoDB ObjectId
    price: number; // Price for this size
    imageURL?: string; // Image URL for this size
    stock?: number;
  };
}

// Batch create request format (matches backend API)
export interface BatchCreateShirtData {
  name: string;
  description?: string;
  shirtTypeId: string; // MongoDB ObjectId
  discount?: Discount | null;
  sizes: Array<{
    sizeReferenceId: string; // MongoDB ObjectId
    price: number; // Price for this size (can vary by size)
    imageURL?: string; // Image URL for this size (can vary by size)
    stock: number;
  }>;
}

export interface UpdateShirtData {
  name?: string;
  description?: string;
  shirtTypeId?: string; // MongoDB ObjectId
  discount?: Discount | null;
  currentSizeVariant?: {
    price?: number; // Price for current size
    imageURL?: string; // Image URL for current size
    stock?: number;
  };
  sizes?: Array<{
    sizeReferenceId: string; // MongoDB ObjectId
    price: number; // Price for this size (can vary by size)
    imageURL?: string; // Image URL for this size (can vary by size)
    stock: number;
  }>; // For creating/updating size variants
}

// Reference data types (from backend)
export interface SizeReference {
  _id: string;
  name: ShirtSize;
  displayName: string;
  order?: number;
}

// Legacy alias for backward compatibility
export type ShirtSizeReference = SizeReference;

export interface ShirtTypeReference {
  _id: string;
  name: ShirtType;
}

// Backend ShirtSize document (size variant) - NEW API structure
export interface BackendShirtSize {
  _id: string; // ShirtSize document ID
  shirtId: string; // Reference to parent Shirt design
  sizeReferenceId: string; // Reference to SizeReference
  sizeRef?: SizeReference; // Populated size reference object
  sizeReference?: SizeReference; // Alternative name (from API)
  price: number; // Price for this specific size
  imageURL?: string; // Image URL for this specific size
  stock: number;
  finalPrice: number;
  createdAt?: string;
  updatedAt?: string;
}

// Backend Shirt document (design) - NEW API structure
export interface BackendShirtDesign {
  _id: string; // Shirt design ID
  userId?: string;
  sellerId?: string;
  name: string;
  description?: string;
  shirtTypeId?: string;
  shirtType?: ShirtTypeReference | ShirtType | string;
  type?: ShirtType; // Legacy support
  discount?: Discount | null;
  createdAt?: string;
  updatedAt?: string;
}

// Combined format for standard response (ShirtSize with populated shirt data)
export interface BackendShirt {
  _id: string; // ShirtSize document ID
  shirtId?: string; // Reference to parent Shirt design
  userId?: string;
  sellerId?: string;
  name: string;
  description?: string;
  sizeReferenceId?: string;
  sizeRef?: SizeReference; // Populated size reference
  sizeReference?: SizeReference; // Alternative name
  shirtTypeId?: string;
  shirtType?: ShirtTypeReference | ShirtType | string;
  type?: ShirtType; // Legacy support
  price: number; // Price for this size variant
  discount?: Discount | null;
  finalPrice: number;
  stock: number;
  imageURL?: string; // Image URL for this size variant
  createdAt?: string;
  updatedAt?: string;
}

// Grouped shirt response format (when groupBy=design)
export interface GroupedShirtResponse {
  _id: string; // Shirt design ID
  userId?: string;
  sellerId?: string;
  name: string;
  description?: string;
  shirtTypeId?: string;
  shirtType?: ShirtTypeReference | ShirtType | string;
  type?: ShirtType; // Legacy support
  discount?: Discount | null;
  totalStock?: number;
  availableSizes: ShirtSize[]; // Array of size names (strings)
  variants: Array<{
    _id: string; // ShirtSize document ID
    sizeReferenceId: string; // Reference to SizeReference
    sizeRef?: SizeReference; // Populated size reference
    sizeReference?: SizeReference; // Alternative name
    price: number; // Price for this size
    imageURL?: string; // Image URL for this size
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

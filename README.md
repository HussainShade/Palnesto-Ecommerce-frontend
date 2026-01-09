# Frontend Overview

This document explains the architecture, responsibilities, and design decisions of the Shirt E-commerce frontend.

## Architecture

The frontend is built with **Next.js 16 (App Router)**, **TypeScript**, and **Tailwind CSS**. It follows a minimal, clean architecture without overengineering.

### Tech Stack
- **Next.js 16.1.1** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling (already configured)
- **Fetch API** - Native browser API for HTTP requests (no axios, no Redux)

## Project Structure

```
frontend/
├── app/
│   ├── page.tsx              # Customer home page (/)
│   ├── seller/
│   │   └── login/
│   │       └── page.tsx      # Seller login page (/seller/login)
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   ├── ShirtCard.tsx         # Individual shirt display component
│   ├── FilterBar.tsx         # Filter controls (size, type, price)
│   ├── Pagination.tsx        # Page navigation component
│   └── Cart.tsx              # Shopping cart sidebar
├── lib/
│   ├── api.ts                # API abstraction layer
│   └── cart.ts               # Cart utilities (localStorage)
├── types/
│   └── index.ts              # TypeScript type definitions
└── FRONTEND_OVERVIEW.md      # This file
```

## Page Responsibilities

### 1. Customer Home Page (`/`)

**Location:** `app/page.tsx`

**Responsibilities:**
- Display shirt listings in a grid layout
- Manage filter state (size, type, price range)
- Handle pagination state (page, limit)
- Fetch shirts from backend with current filters and pagination
- Display cart button with item count
- Show loading and error states
- Render shirt cards, filter bar, and pagination components

**Key Features:**
- Server-driven filtering: All filter parameters are sent to the backend
- Server-driven pagination: Page and limit are sent to the backend
- Real-time cart updates: Cart item count updates when items are added
- Responsive design: Works on mobile, tablet, and desktop

**State Management:**
- Uses React `useState` for local component state
- Filters and pagination trigger new API calls via `useEffect`
- Cart state is managed through localStorage (see Cart Logic section)

### 2. Seller Login Page (`/seller/login`)

**Location:** `app/seller/login/page.tsx`

**Responsibilities:**
- Display login form (email, password)
- Send credentials to backend via POST request
- Handle authentication response
- Store JWT in HTTP-only cookie (handled by backend)
- Redirect on successful login

**Key Features:**
- Form validation (required fields)
- Loading state during authentication
- Error message display
- Success message with redirect
- Link back to customer store

**Authentication Flow:**
1. User enters email and password
2. Frontend sends POST request to `/api/seller/login` with credentials
3. Backend validates credentials and sets HTTP-only cookie with JWT
4. Frontend receives success response (does NOT read token directly)
5. Frontend redirects user (token is automatically sent with subsequent requests via cookie)

## API Interaction Flow

### API Abstraction Layer

**Location:** `lib/api.ts`

All backend communication is centralized in this file. This provides:
- Single source of truth for API endpoints
- Consistent error handling
- Easy to modify if backend URLs change
- Type-safe request/response handling

### Key Functions

#### `fetchShirts(filters, pagination)`

Fetches shirts from the backend with server-driven filtering and pagination.

**Parameters:**
- `filters`: `ShirtFilters` object (size, type, minPrice, maxPrice)
- `pagination`: `PaginationParams` object (page, limit)

**Backend Request:**
```
GET /api/shirts?size=M&type=T-Shirt&minPrice=10&maxPrice=50&page=1&limit=12
```

**Response:**
```typescript
{
  data: Shirt[],
  total: number,
  page: number,
  limit: number,
  totalPages: number
}
```

**Why Server-Driven?**
- Backend handles complex filtering logic
- Backend can optimize database queries
- Consistent filtering across all clients
- Backend controls pagination limits and performance

#### `sellerLogin(credentials)`

Authenticates seller and receives HTTP-only cookie.

**Parameters:**
- `credentials`: `{ email: string, password: string }`

**Backend Request:**
```
POST /api/seller/login
Content-Type: application/json
Body: { "email": "...", "password": "..." }
```

**Response:**
```typescript
{
  success: boolean,
  message?: string
}
```

**Cookie Handling:**
- Backend sets `Set-Cookie` header with HTTP-only flag
- Browser automatically stores cookie
- Cookie is automatically sent with subsequent requests via `credentials: 'include'`
- Frontend **never** reads the token directly (security best practice)

## Cart Logic

### Cart Storage

**Location:** `lib/cart.ts`

The cart is stored entirely in **localStorage** (client-side only). No backend persistence.

**Storage Key:** `shirt_ecommerce_cart`

**Cart Structure:**
```typescript
{
  items: [
    { shirtId: string, quantity: number }
  ],
  totalAmount: number  // Calculated dynamically from shirt prices
}
```

### Cart Operations

1. **`getCart()`** - Retrieves cart from localStorage
2. **`saveCart(cart)`** - Saves cart to localStorage
3. **`addToCart(shirtId, quantity)`** - Adds item or increments quantity
4. **`removeFromCart(shirtId)`** - Removes item from cart
5. **`updateCartItemQuantity(shirtId, quantity)`** - Updates item quantity
6. **`clearCart()`** - Empties the cart
7. **`calculateTotalAmount(cart, shirts)`** - Calculates total from cart items and shirt prices

### Why localStorage?

- **UI-only requirement**: Cart is for demonstration purposes
- **No backend persistence needed**: Simplifies architecture
- **Fast and simple**: No API calls for cart operations
- **Works offline**: Cart persists across page refreshes

### Total Amount Calculation

The `totalAmount` is calculated dynamically because:
- Shirt prices may change on the backend
- Cart only stores `shirtId` and `quantity` (not prices)
- When cart is displayed, we fetch current shirt data and calculate total
- This ensures prices are always up-to-date

**Calculation Flow:**
1. Get cart from localStorage
2. Fetch current shirt data (or use cached data)
3. Match cart items with shirts by ID
4. Sum: `shirt.discountedPrice * item.quantity` for each item

## Component Architecture

### Reusable Components

All components are in the `components/` directory and follow these principles:
- **Single Responsibility**: Each component has one clear purpose
- **Props-based**: Data flows down via props
- **Event callbacks**: Actions flow up via callback functions
- **No global state**: Components are self-contained

#### `ShirtCard`
- Displays single shirt with image, name, description, prices
- Shows discount badge if applicable
- Handles "Add to Cart" action
- Disables button when out of stock

#### `FilterBar`
- Displays filter controls (size, type, price range)
- Manages filter state locally
- Calls `onFiltersChange` callback when filters change
- Provides "Clear All" functionality

#### `Pagination`
- Displays page numbers with ellipsis for large page counts
- Shows Previous/Next buttons
- Calls `onPageChange` callback when page changes
- Disables buttons at boundaries

#### `Cart`
- Sidebar component that slides in from right
- Displays cart items with images and details
- Allows quantity adjustment and item removal
- Calculates and displays total amount
- Shows empty state when cart is empty

## Why Backend Handles Filters & Pagination

### Server-Driven Filtering

**Benefits:**
1. **Performance**: Backend can optimize database queries with indexes
2. **Consistency**: Same filtering logic for all clients (web, mobile, API)
3. **Security**: Backend can validate and sanitize filter parameters
4. **Scalability**: Backend can cache filtered results
5. **Data Integrity**: Backend ensures filters match actual data structure

**Example:**
- Frontend sends: `?size=M&type=T-Shirt&minPrice=10&maxPrice=50`
- Backend executes optimized SQL query
- Backend returns only matching results
- Frontend displays results (no client-side filtering needed)

### Server-Driven Pagination

**Benefits:**
1. **Performance**: Only fetch data needed for current page
2. **Bandwidth**: Reduces data transfer (12 items vs 1000 items)
3. **Memory**: Frontend doesn't need to store all items
4. **Consistency**: Backend controls page size limits
5. **Real-time**: Always shows current data state

**Example:**
- Frontend sends: `?page=2&limit=12`
- Backend returns: 12 items for page 2, plus metadata (total, totalPages)
- Frontend displays page 2 and pagination controls
- User clicks "Next" → Frontend requests page 3

## Auth Handling via Cookies

### HTTP-Only Cookies

The frontend uses HTTP-only cookies for authentication because:

1. **Security**: JavaScript cannot access HTTP-only cookies (XSS protection)
2. **Automatic**: Browser automatically sends cookies with requests
3. **Backend Control**: Backend sets cookie expiration and security flags
4. **No Token Management**: Frontend doesn't need to store or manage tokens

### Authentication Flow

```
1. User submits login form
   ↓
2. Frontend sends POST /api/seller/login with credentials
   ↓
3. Backend validates credentials
   ↓
4. Backend sets HTTP-only cookie: Set-Cookie: token=...; HttpOnly; Secure; SameSite=Strict
   ↓
5. Backend returns { success: true }
   ↓
6. Frontend redirects user
   ↓
7. Subsequent requests automatically include cookie (via credentials: 'include')
   ↓
8. Backend validates cookie on each request
```

### Frontend Responsibilities

- Send credentials to backend
- Display success/error messages
- Redirect on success
- **NOT** read or store JWT token
- **NOT** manually attach token to requests
- Use `credentials: 'include'` in fetch options

### Backend Responsibilities

- Validate credentials
- Generate JWT token
- Set HTTP-only cookie
- Validate cookie on protected routes
- Handle token expiration
- Clear cookie on logout

## Environment Configuration

### API Base URL

The API base URL is configured via environment variable:

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
```

**Setup:**
Create a `.env` file:
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

For production, set this to your production API URL.

## Type Safety

All API requests and responses are typed using TypeScript interfaces defined in `types/index.ts`:

- `Shirt` - Shirt product data
- `ShirtFilters` - Filter parameters
- `PaginationParams` - Pagination parameters
- `PaginatedResponse<T>` - Generic paginated response
- `Cart` - Cart structure
- `CartItem` - Individual cart item
- `LoginCredentials` - Login form data
- `LoginResponse` - Login API response

This ensures:
- Compile-time type checking
- Better IDE autocomplete
- Self-documenting code
- Easier refactoring

## Error Handling

### API Errors

- Network errors are caught and displayed to user
- Backend error responses are parsed and shown
- Retry functionality available on error state

### Cart Errors

- localStorage errors are caught and logged
- Graceful fallback to empty cart if storage fails
- User experience is not broken by storage issues

## Future Enhancements (Not Implemented)

These are intentionally not implemented to keep the frontend minimal:

- Redux/state management (not needed for this scope)
- Advanced cart features (coupons, shipping calculation)
- User accounts (customer registration/login)
- Order history
- Product reviews
- Search functionality (filters are sufficient for demo)
- Image optimization (Next.js Image component could be added)
- Server-side rendering for SEO (current implementation is client-side)

## Summary

This frontend is designed to be:
- **Minimal**: Only essential features
- **Clean**: Well-organized, readable code
- **Type-safe**: Full TypeScript coverage
- **Backend-focused**: Demonstrates correct backend API usage
- **Maintainable**: Simple architecture, easy to extend

The frontend serves as a demonstration of how a backend API should be consumed, with proper separation of concerns, type safety, and clean component architecture.


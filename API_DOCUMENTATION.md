# API Documentation

## Base URL

```
http://localhost:5000
```

## Authentication

This API uses **HTTP-only cookies** for authentication. After logging in, the JWT token is automatically stored in a cookie named `auth_token`. 

**User Types:**
- **Administrator**: Can create seller accounts and manage the platform (UserType: "Admin")
- **Seller**: Can create, update, and delete shirts (UserType: "Seller")
- **Customer**: Can view shirts and manage their account (UserType: "Customer")

## Model Structure

**Important:** The data model has been refactored to support price and imageURL per size variant:

- **Shirt**: Represents a shirt design/product with common attributes (name, description, type, discount)
- **ShirtSize**: Represents a size variant of a shirt with size-specific attributes (price, imageURL, stock)
- **SizeReference**: Reference table for available sizes (M, L, XL, XXL)
- **Discount**: Applied at the Shirt level (common to all size variants)
- **Price**: Varies by size (stored in ShirtSize)
- **ImageURL**: Can vary by size (stored in ShirtSize)

**Important for Postman:**
- Postman automatically handles cookies, but you need to enable cookie handling
- After login, the cookie is automatically sent with subsequent requests
- No need to manually add Authorization headers
- Different endpoints for seller and customer authentication (see below)

---

## Model Schemas

This section documents all MongoDB models and their schemas used in the API.

### UserType Model

Reference table for user roles/types (e.g., Seller, Admin, Customer).

**Schema:**
```typescript
{
  name: string;           // Required, unique, indexed (e.g., 'Seller', 'Admin', 'Customer')
  description?: string;   // Optional description
  isActive: boolean;     // Default: true, indexed
  createdAt: Date;       // Auto-generated timestamp
  updatedAt: Date;       // Auto-generated timestamp
}
```

**Indexes:**
- `name` (unique)
- `isActive`

**Collection Name:** `usertypes`

---

### User Model

User accounts for all user types (replaces old Seller model for scalability).

**Schema:**
```typescript
{
  email: string;                    // Required, unique, lowercase, trimmed, indexed
  password: string;                 // Required, min 6 chars, auto-hashed on save
  name: string;                     // Required, trimmed
  userTypeId: ObjectId;             // Required, foreign key to UserType, indexed
  isActive: boolean;                // Default: true, indexed
  createdAt: Date;                  // Auto-generated timestamp
  updatedAt: Date;                  // Auto-generated timestamp
}
```

**Methods:**
- `comparePassword(candidatePassword: string): Promise<boolean>` - Compares plain text password with hashed password

**Hooks:**
- `pre('save')` - Automatically hashes password before saving

**Indexes:**
- `email` (unique)
- `userTypeId`
- `isActive`

**Collection Name:** `users`

---

### ShirtType Model

Reference table for shirt types (e.g., Casual, Formal, Wedding, Sports, Vintage).

**Schema:**
```typescript
{
  name: string;           // Required, unique, trimmed, indexed (e.g., 'Casual', 'Formal')
  description?: string;   // Optional description
  isActive: boolean;     // Default: true, indexed
  createdAt: Date;       // Auto-generated timestamp
  updatedAt: Date;       // Auto-generated timestamp
}
```

**Indexes:**
- `name` (unique)
- `isActive`

**Collection Name:** `shirttypes`

---

### SizeReference Model

Reference table for available shirt sizes (e.g., M, L, XL, XXL).

**Schema:**
```typescript
{
  name: string;          // Required, unique, uppercase, trimmed (e.g., 'M', 'L', 'XL', 'XXL')
  displayName: string;   // Required, trimmed (e.g., 'Medium', 'Large')
  order: number;         // Required, unique (for sorting: M=0, L=1, XL=2, XXL=3)
  isActive: boolean;     // Default: true
  createdAt: Date;       // Auto-generated timestamp
  updatedAt: Date;       // Auto-generated timestamp
}
```

**Indexes:**
- `name` (unique)
- `order` (unique)

**Collection Name:** `sizereferences`

---

### Shirt Model

Represents a shirt design/product with common attributes shared across all size variants.

**Schema:**
```typescript
{
  userId: ObjectId;      // Required, foreign key to User, indexed
  name: string;          // Required, trimmed
  description?: string;  // Optional, trimmed
  shirtTypeId: ObjectId; // Required, foreign key to ShirtType, indexed
  discount?: {           // Optional discount (applied to all size variants)
    type: 'amount' | 'percentage';
    value: number;      // Min: 0
  };
  createdAt: Date;       // Auto-generated timestamp
  updatedAt: Date;       // Auto-generated timestamp
}
```

**Indexes:**
- `userId`
- `shirtTypeId`
- Compound: `{ userId: 1, shirtTypeId: 1 }`

**Collection Name:** `shirts`

**Note:** Price, imageURL, and stock are stored in the `ShirtSize` model (varies by size). Discount is common to all size variants of this shirt.

---

### ShirtSize Model

Represents a specific size variant of a shirt with size-specific attributes (price, imageURL, stock).

**Schema:**
```typescript
{
  shirtId: ObjectId;           // Required, foreign key to Shirt, indexed
  sizeReferenceId: ObjectId;   // Required, foreign key to SizeReference, indexed
  price: number;              // Required, min: 0, max: 10000 (varies by size)
  imageURL?: string;          // Optional, trimmed (can vary by size)
  stock: number;             // Required, min: 0, default: 0
  finalPrice: number;         // Required, min: 0, indexed (computed: price with discount)
  createdAt: Date;           // Auto-generated timestamp
  updatedAt: Date;           // Auto-generated timestamp
}
```

**Hooks:**
- `pre('save')` - Automatically calculates `finalPrice` by applying discount from parent `Shirt`:
  - Percentage discount: `finalPrice = price * (1 - discount.value / 100)`
  - Amount discount: `finalPrice = price - discount.value`
  - Rounded to 2 decimal places

**Indexes:**
- `shirtId`
- `sizeReferenceId`
- `finalPrice`
- Compound: `{ sizeReferenceId: 1, finalPrice: 1 }`
- Compound (unique, sparse): `{ shirtId: 1, sizeReferenceId: 1 }` - Ensures one size variant per shirt

**Collection Name:** `shirtsizes`

**Note:** Each `Shirt` can have multiple `ShirtSize` entries (one per size). Price and imageURL can vary by size, while discount is inherited from the parent `Shirt`.

---

### Model Relationships

```
UserType (1) ──< (many) User
                    │
                    │ (1)
                    │
                    └───< (many) Shirt
                                 │
                                 │ (1)
                                 │
                                 └───< (many) ShirtSize
                                              │
                                              │ (many)
                                              │
                                              └───> (1) SizeReference

ShirtType (1) ──< (many) Shirt
```

**Key Relationships:**
- `User.userTypeId` → `UserType._id` (many-to-one)
- `User._id` → `Shirt.userId` (one-to-many)
- `Shirt.shirtTypeId` → `ShirtType._id` (many-to-one)
- `Shirt._id` → `ShirtSize.shirtId` (one-to-many)
- `ShirtSize.sizeReferenceId` → `SizeReference._id` (many-to-one)

**Foreign Key Constraints:**
- All foreign keys are MongoDB ObjectIds
- References are validated at the application level
- Use `populate()` to fetch related documents

---

## Endpoints

### 1. Health Check

**GET** `/health`

Check if the server is running.

**Headers:**
```
None required
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### 2. Administrator Login

**POST** `/api/admin/login`

Authenticate an administrator and receive a JWT token in an HTTP-only cookie.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "admin123"
}
```

**Validation Rules:**
- `email`: Must be a valid email format
- `password`: Minimum 6 characters

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Admin login successful",
  "data": {
    "user": {
      "id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "email": "admin@example.com",
      "name": "Administrator"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Note:** The token is automatically set as an HTTP-only cookie (`auth_token`) and included in the response body for testing.

**Error Responses:**

*Invalid credentials (401):*
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

*Access denied (401):*
```json
{
  "success": false,
  "message": "Access denied. Administrator account required."
}
```

*Validation error (400):*
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "code": "invalid_string",
      "path": ["email"],
      "message": "Invalid email format"
    }
  ]
}
```

---

### 3. Create Seller (Admin Only)

**POST** `/api/admin/sellers`

Create a new seller account. Only accessible by administrators.

**Headers:**
```
Content-Type: application/json
Cookie: auth_token=<jwt_token> (automatically sent by Postman after admin login)
```

**Request Body:**
```json
{
  "email": "newseller@example.com",
  "password": "seller123",
  "name": "New Seller"
}
```

**Validation Rules:**
- `email`: Must be a valid email format, unique
- `password`: Minimum 6 characters
- `name`: Required, 1-100 characters

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Seller account created successfully",
  "data": {
    "seller": {
      "id": "65a1b2c3d4e5f6g7h8i9j0k2",
      "email": "newseller@example.com",
      "name": "New Seller"
    }
  }
}
```

**Error Responses:**

*Unauthorized (401):*
```json
{
  "success": false,
  "message": "Authentication required"
}
```

*Forbidden (403):*
```json
{
  "success": false,
  "message": "Access denied. Administrator privileges required."
}
```

*User already exists (409 Conflict):*
```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

*Validation error (400):*
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "code": "invalid_string",
      "path": ["email"],
      "message": "Invalid email format"
    }
  ]
}
```

---

### 4. Seller Login

**POST** `/api/auth/seller/login` or `/api/auth/login` (legacy)

Authenticate a seller and receive a JWT token in an HTTP-only cookie.

**Note:** Uses User model with UserType "Seller" (replaces old Seller model for better scalability).

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "seller@example.com",
  "password": "password123"
}
```

**Validation Rules:**
- `email`: Must be a valid email format
- `password`: Minimum 6 characters

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "seller": {
      "id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "email": "seller@example.com",
      "name": "Test Seller"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Note:** The token is also automatically set as an HTTP-only cookie (`auth_token`) for browser-based clients. The token in the response body is provided for testing purposes in Postman.

**Error Responses:**

*Invalid credentials (401):*
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

*Validation error (400):*
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "code": "invalid_string",
      "path": ["email"],
      "message": "Invalid email format"
    }
  ]
}
```

**Postman Notes:**
- After successful login, Postman will automatically store the `auth_token` cookie
- This cookie will be sent with all subsequent requests to the same domain
- Check Postman's "Cookies" tab to verify the cookie was set

---

### 5. Customer Signup

**POST** `/api/auth/customer/signup`

Create a new customer account. Automatically logs in the user after signup.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "customer@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Validation Rules:**
- `email`: Must be a valid email format, unique
- `password`: Minimum 6 characters
- `name`: Required, 1-100 characters

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Customer account created successfully",
  "data": {
    "user": {
      "id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "email": "customer@example.com",
      "name": "John Doe"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Note:** The token is automatically set as an HTTP-only cookie (`auth_token`) and included in the response body for testing.

**Error Responses:**

*User already exists (409 Conflict):*
```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

*Validation error (400):*
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "code": "invalid_string",
      "path": ["email"],
      "message": "Invalid email format"
    }
  ]
}
```

---

### 6. Customer Login

**POST** `/api/auth/customer/login`

Authenticate a customer and receive a JWT token in an HTTP-only cookie.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "customer@example.com",
  "password": "password123"
}
```

**Validation Rules:**
- `email`: Must be a valid email format
- `password`: Minimum 6 characters

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "email": "customer@example.com",
      "name": "John Doe"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Note:** The token is automatically set as an HTTP-only cookie (`auth_token`) and included in the response body for testing.

**Error Responses:**

*Invalid credentials (401):*
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

*Access denied (401):*
```json
{
  "success": false,
  "message": "Access denied. Customer account required."
}
```

---

### 7. Logout

**POST** `/api/auth/logout` or `/api/auth/seller/logout` or `/api/auth/customer/logout`

Logout and clear the authentication cookie. Works for both sellers and customers.

**Headers:**
```
Cookie: auth_token=<jwt_token> (automatically sent by Postman)
```

**Request Body:**
```
None
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

### 8. List Shirts (Public)

**GET** `/api/shirts`

Get a paginated list of shirts with optional filtering.

**Note:** This endpoint is **PUBLIC** and does not require authentication.

**Headers:**
```
None required
```

**Query Parameters:**
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `sizeReferenceId` | string | No | Filter by size (ObjectId or string: M, L, XL, XXL) | `?sizeReferenceId=M` or `?sizeReferenceId=65a1b2c3d4e5f6g7h8i9j0k10` |
| `size` | string | No | Alias for `sizeReferenceId` (string format only) | `?size=M` |
| `shirtTypeId` | string | No | Filter by type (ObjectId or string: Casual, Formal, etc.) | `?shirtTypeId=Casual` or `?shirtTypeId=65a1b2c3d4e5f6g7h8i9j0k11` |
| `type` | string | No | Alias for `shirtTypeId` (string format only) | `?type=Casual` |
| `minPrice` | number | No | Minimum final price | `?minPrice=1000` |
| `maxPrice` | number | No | Maximum final price | `?maxPrice=5000` |
| `page` | number | No | Page number (default: 1) | `?page=1` |
| `limit` | number | No | Items per page (default: 10, max: 100) | `?limit=20` |
| `groupBy` | string | No | Group shirts by design (name+type+price). Values: `"design"` | `?groupBy=design` |

**Filter Format Support:**
- **ObjectId format** (backward compatible): `?sizeReferenceId=65a1b2c3d4e5f6g7h8i9j0k10`
- **String format** (new, developer-friendly): `?size=M` or `?sizeReferenceId=M`
- **Type string format** (new): `?type=Casual` or `?shirtTypeId=Casual`
- **Mixed format** (also supported): `?size=M&shirtTypeId=65a1b2c3d4e5f6g7h8i9j0k11`

**Valid Size Values** (case-insensitive, will be converted to uppercase):
- `M`, `L`, `XL`, `XXL`

**Valid Type Values** (case-insensitive):
- `Casual`, `Formal`, `Wedding`, `Sports`, `Vintage`

**Note:** The API accepts both MongoDB ObjectIds and human-readable string values for filtering. String values are automatically resolved to ObjectIds using an in-memory cache for optimal performance. Invalid string values will return a 400 error with a descriptive message.

**Example Requests:**

*Get all shirts:*
```
GET /api/shirts
```

*Filter by size and type (using string values - recommended):*
```
GET /api/shirts?size=M&type=Casual
GET /api/shirts?sizeReferenceId=L&shirtTypeId=Formal
```

*Filter by size and type (using ObjectIds - backward compatible):*
```
GET /api/shirts?sizeReferenceId=65a1b2c3d4e5f6g7h8i9j0k10&shirtTypeId=65a1b2c3d4e5f6g7h8i9j0k11
```

*Filter by price range with pagination:*
```
GET /api/shirts?minPrice=1000&maxPrice=3000&page=1&limit=20
```

*Combined filters (using string values):*
```
GET /api/shirts?size=M&type=Casual&minPrice=1500&maxPrice=2500&page=1&limit=10
```

*Mixed format (ObjectId + string):*
```
GET /api/shirts?size=M&shirtTypeId=65a1b2c3d4e5f6g7h8i9j0k11
```

*Get grouped designs (one record per design with all size variants):*
```
GET /api/shirts?groupBy=design&page=1&limit=12
```

*Get grouped designs with filters (using string values):*
```
GET /api/shirts?groupBy=design&type=Casual&minPrice=1000&maxPrice=3000&page=1&limit=12
```

**Success Response (200 OK):**

*Standard response (individual variants):*
```json
{
  "success": true,
  "data": {
    "shirts": [
      {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k20",
        "shirtId": "65a1b2c3d4e5f6g7h8i9j0k2",
        "userId": "65a1b2c3d4e5f6g7h8i9j0k1",
        "name": "Classic White Formal Shirt",
        "description": "Perfect for business meetings and formal occasions",
        "shirtTypeId": "65a1b2c3d4e5f6g7h8i9j0k11",
        "shirtType": "Formal",
        "discount": {
          "type": "percentage",
          "value": 10
        },
        "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k10",
        "sizeRef": {
          "_id": "65a1b2c3d4e5f6g7h8i9j0k10",
          "name": "L",
          "displayName": "Large",
          "order": 1
        },
        "price": 2500,
        "imageURL": "https://fastly.picsum.photos/id/193/200/200.jpg?hmac=JHo5tWHSRWvVbL3HX6rwDNdkvYPFojLtXkEGEUCgz6A",
        "stock": 50,
        "finalPrice": 2250,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3,
    "grouped": false
  }
}
```

*Grouped response (with `groupBy=design`):*
```json
{
  "success": true,
  "data": {
    "shirts": [
      {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
        "userId": "65a1b2c3d4e5f6g7h8i9j0k1",
        "name": "Premium Cotton Shirt",
        "description": "High-quality cotton fabric for comfort",
        "shirtTypeId": "65a1b2c3d4e5f6g7h8i9j0k11",
        "shirtType": "Casual",
        "discount": {
          "type": "percentage",
          "value": 15
        },
        "totalStock": 75,
        "availableSizes": ["M", "L", "XL"],
        "variants": [
          {
            "_id": "65a1b2c3d4e5f6g7h8i9j0k20",
            "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k12",
            "sizeRef": {
              "_id": "65a1b2c3d4e5f6g7h8i9j0k12",
              "name": "M",
              "displayName": "Medium",
              "order": 0
            },
            "price": 2000,
            "imageURL": "https://fastly.picsum.photos/id/193/200/200.jpg?hmac=JHo5tWHSRWvVbL3HX6rwDNdkvYPFojLtXkEGEUCgz6A",
            "stock": 30,
            "finalPrice": 1700
          },
          {
            "_id": "65a1b2c3d4e5f6g7h8i9j0k21",
            "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k10",
            "sizeRef": {
              "_id": "65a1b2c3d4e5f6g7h8i9j0k10",
              "name": "L",
              "displayName": "Large",
              "order": 1
            },
            "price": 2000,
            "imageURL": "https://fastly.picsum.photos/id/193/200/200.jpg?hmac=JHo5tWHSRWvVbL3HX6rwDNdkvYPFojLtXkEGEUCgz6A",
            "stock": 25,
            "finalPrice": 1700
          },
          {
            "_id": "65a1b2c3d4e5f6g7h8i9j0k22",
            "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k13",
            "sizeRef": {
              "_id": "65a1b2c3d4e5f6g7h8i9j0k13",
              "name": "XL",
              "displayName": "Extra Large",
              "order": 2
            },
            "price": 2000,
            "imageURL": "https://fastly.picsum.photos/id/193/200/200.jpg?hmac=JHo5tWHSRWvVbL3HX6rwDNdkvYPFojLtXkEGEUCgz6A",
            "stock": 20,
            "finalPrice": 1700
          }
        ]
      }
    ],
    "total": 25,
    "page": 1,
    "limit": 12,
    "totalPages": 3,
    "grouped": true
  }
}
```

**Response Format Details:**

**Standard Response (without `groupBy`):**
- Returns individual `ShirtSize` variants (one record per size variant)
- Each record represents a `ShirtSize` document with:
  - `_id`: ShirtSize document ID
  - `shirtId`: Reference to the parent `Shirt` design
  - `sizeReferenceId`: Reference to `SizeReference` (M, L, XL, XXL)
  - `price`: Price for this specific size (varies by size)
  - `imageURL`: Image URL for this specific size (can vary by size)
  - `stock`: Stock quantity for this size
  - `finalPrice`: Calculated price with discount applied
- Pagination is based on individual variants
- Includes populated `sizeRef` object with size details

**Grouped Response (with `groupBy=design`):**
- Returns one record per unique shirt design (grouped by name + type)
- Each record includes:
  - `_id`: Main `Shirt` design ID
  - Shared fields: `name`, `description`, `shirtTypeId`, `discount`
  - `totalStock`: Sum of all variant stocks
  - `availableSizes`: Array of size names (strings) with stock > 0
  - `variants`: Array of all `ShirtSize` variants for this design
- Each variant in `variants` includes: `_id`, `sizeReferenceId`, `sizeRef`, `price`, `imageURL`, `stock`, `finalPrice`
- Pagination is based on unique designs (not individual variants)
- Variants are sorted by size order (M, L, XL, XXL)

**Notes:**
- When `groupBy=design`, the `sizeReferenceId` filter works at the design level (design must have at least one variant matching the size)
- All variants in a design share the same `name`, `shirtTypeId`, and `discount`
- Price and imageURL can vary by size (stored in each `ShirtSize` variant)
- `availableSizes` only includes size names (strings) with stock > 0
- Grouped results are not cached (too complex to invalidate)

**Error Responses:**

*Invalid size string (400 Bad Request):*
```json
{
  "success": false,
  "message": "Invalid size: 'XXL'. Valid sizes are: M, L, XL, XXL"
}
```

*Invalid type string (400 Bad Request):*
```json
{
  "success": false,
  "message": "Invalid shirt type: 'InvalidType'. Valid types are: Casual, Formal, Wedding, Sports, Vintage"
}
```

*Validation error (400 Bad Request):*
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "code": "invalid_string",
      "path": ["sizeReferenceId"],
      "message": "Must be a valid ObjectId or non-empty string"
    }
  ]
}
```

---

### 9. Get Single Shirt (Public)

**GET** `/api/shirts/:id`

Get details of a single shirt by ID.

**Note:** This endpoint is **PUBLIC** and does not require authentication.

**Headers:**
```
None required
```

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Shirt MongoDB ObjectId | `/api/shirts/65a1b2c3d4e5f6g7h8i9j0k2` |

**Example Request:**
```
GET /api/shirts/65a1b2c3d4e5f6g7h8i9j0k2
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "shirt": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
      "userId": "65a1b2c3d4e5f6g7h8i9j0k1",
      "name": "Classic White Formal Shirt",
      "description": "Perfect for business meetings and formal occasions",
      "shirtTypeId": "65a1b2c3d4e5f6g7h8i9j0k11",
      "discount": {
        "type": "percentage",
        "value": 10
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "shirtSizes": [
      {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k20",
        "shirtId": "65a1b2c3d4e5f6g7h8i9j0k2",
        "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k10",
        "sizeReference": {
          "_id": "65a1b2c3d4e5f6g7h8i9j0k10",
          "name": "L",
          "displayName": "Large",
          "order": 1
        },
        "price": 2500,
        "imageURL": "https://fastly.picsum.photos/id/193/200/200.jpg?hmac=JHo5tWHSRWvVbL3HX6rwDNdkvYPFojLtXkEGEUCgz6A",
        "stock": 50,
        "finalPrice": 2250,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      },
      {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k21",
        "shirtId": "65a1b2c3d4e5f6g7h8i9j0k2",
        "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k11",
        "sizeReference": {
          "_id": "65a1b2c3d4e5f6g7h8i9j0k11",
          "name": "XL",
          "displayName": "Extra Large",
          "order": 2
        },
        "price": 2600,
        "imageURL": "https://fastly.picsum.photos/id/193/200/200.jpg?hmac=JHo5tWHSRWvVbL3HX6rwDNdkvYPFojLtXkEGEUCgz6A",
        "stock": 30,
        "finalPrice": 2340,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      },
      {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k22",
        "shirtId": "65a1b2c3d4e5f6g7h8i9j0k2",
        "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k12",
        "sizeReference": {
          "_id": "65a1b2c3d4e5f6g7h8i9j0k12",
          "name": "M",
          "displayName": "Medium",
          "order": 0
        },
        "price": 2400,
        "imageURL": "https://fastly.picsum.photos/id/193/200/200.jpg?hmac=JHo5tWHSRWvVbL3HX6rwDNdkvYPFojLtXkEGEUCgz6A",
        "stock": 0,
        "finalPrice": 2160,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "sizes": [
      // Same as shirtSizes (alias for backward compatibility)
    ]
  }
}
```

**Response Details:**
- **`shirt`**: The main `Shirt` design document with common attributes (name, description, type, discount)
- **`shirtSizes`**: Array of ALL `ShirtSize` variants for this shirt design, including:
  - Variants with `stock > 0` (available)
  - Variants with `stock = 0` (out of stock)
  - **No filtering by stock** - all variants are returned
- **`sizes`**: Alias for `shirtSizes` (included for backward compatibility)

**Each `shirtSize` variant includes:**
- `_id`: ShirtSize document ID
- `shirtId`: Reference to the parent `Shirt` design
- `sizeReferenceId`: ObjectId reference to `SizeReference`
- `sizeReference`: Populated object with size details:
  - `_id`: SizeReference ObjectId
  - `name`: Size code (e.g., "M", "L", "XL", "XXL")
  - `displayName`: Human-readable name (e.g., "Medium", "Large")
  - `order`: Sort order (0 for M, 1 for L, 2 for XL, 3 for XXL)
- `price`: Price for this specific size (varies by size)
- `imageURL`: Image URL for this specific size (can vary by size)
- `stock`: Stock quantity (can be 0)
- `finalPrice`: Calculated price with discount applied from parent `Shirt`
- `createdAt`, `updatedAt`: Timestamps

**Sorting:**
- Variants are sorted by `sizeReference.order` (M, L, XL, XXL) for consistent display

**Note:** The response includes ALL `ShirtSize` variants for the given shirt design ID, regardless of stock value. The frontend should handle displaying only available sizes or showing out-of-stock indicators.

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Shirt not found"
}
```

---

### 10. Create Shirt (Protected)

**POST** `/api/shirts`

Create a new shirt. Requires authentication.

**Headers:**
```
Content-Type: application/json
Cookie: auth_token=<jwt_token> (automatically sent by Postman after login)
```

**Request Body:**
```json
{
  "name": "Premium Cotton Shirt",
  "description": "High-quality cotton fabric for comfort",
  "shirtTypeId": "65a1b2c3d4e5f6g7h8i9j0k11",
  "discount": {
    "type": "percentage",
    "value": 15
  },
  "sizeVariant": {
    "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k12",
    "price": 2000,
    "imageURL": "https://fastly.picsum.photos/id/193/200/200.jpg?hmac=JHo5tWHSRWvVbL3HX6rwDNdkvYPFojLtXkEGEUCgz6A",
    "stock": 30
  }
}
```

**Field Details:**
| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `name` | string | Yes | Shirt name | 1-200 characters |
| `description` | string | No | Shirt description | Max 1000 characters |
| `shirtTypeId` | string | Yes | Shirt type ObjectId | Valid MongoDB ObjectId |
| `discount` | object | No | Discount details (applied to all sizes) | See discount schema below |
| `sizeVariant` | object | Yes | Initial size variant | See sizeVariant schema below |

**sizeVariant Object:**
| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `sizeReferenceId` | string | Yes | Size reference ObjectId | Valid MongoDB ObjectId |
| `price` | number | Yes | Price for this size | 0-10000 |
| `imageURL` | string | No | Image URL for this size | Valid URL format |
| `stock` | number | No | Stock quantity | Integer, min 0 (default: 0) |

**Note:** `shirtTypeId` and `sizeReferenceId` must be valid MongoDB ObjectIds from the ShirtType and SizeReference collections. Run `npm run seed:reference` to populate reference data.

**Discount Object:**
```json
{
  "type": "percentage",  // or "amount"
  "value": 15           // percentage (0-100) or amount in same currency as price
}
```

**Example Requests:**

*With percentage discount:*
```json
{
  "name": "Summer Casual Shirt",
  "shirtTypeId": "65a1b2c3d4e5f6g7h8i9j0k11",
  "discount": {
    "type": "percentage",
    "value": 20
  },
  "sizeVariant": {
    "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k10",
    "price": 1800,
    "imageURL": "https://fastly.picsum.photos/id/193/200/200.jpg?hmac=JHo5tWHSRWvVbL3HX6rwDNdkvYPFojLtXkEGEUCgz6A",
    "stock": 25
  }
}
```

*With amount discount:*
```json
{
  "name": "Formal Business Shirt",
  "shirtTypeId": "65a1b2c3d4e5f6g7h8i9j0k14",
  "discount": {
    "type": "amount",
    "value": 500
  },
  "sizeVariant": {
    "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k13",
    "price": 3000,
    "imageURL": "https://fastly.picsum.photos/id/193/200/200.jpg?hmac=JHo5tWHSRWvVbL3HX6rwDNdkvYPFojLtXkEGEUCgz6A",
    "stock": 40
  }
}
```

*Without discount:*
```json
{
  "name": "Wedding Shirt",
  "description": "Elegant shirt for special occasions",
  "shirtTypeId": "65a1b2c3d4e5f6g7h8i9j0k15",
  "sizeVariant": {
    "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k10",
    "price": 4500,
    "imageURL": "https://fastly.picsum.photos/id/193/200/200.jpg?hmac=JHo5tWHSRWvVbL3HX6rwDNdkvYPFojLtXkEGEUCgz6A",
    "stock": 20
  }
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Shirt created successfully",
  "data": {
    "shirt": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k3",
      "userId": "65a1b2c3d4e5f6g7h8i9j0k1",
      "name": "Premium Cotton Shirt",
      "description": "High-quality cotton fabric for comfort",
      "shirtTypeId": "65a1b2c3d4e5f6g7h8i9j0k11",
      "discount": {
        "type": "percentage",
        "value": 15
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "shirtSize": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k20",
      "shirtId": "65a1b2c3d4e5f6g7h8i9j0k3",
      "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k12",
      "price": 2000,
      "imageURL": "https://fastly.picsum.photos/id/193/200/200.jpg?hmac=JHo5tWHSRWvVbL3HX6rwDNdkvYPFojLtXkEGEUCgz6A",
      "stock": 30,
      "finalPrice": 1700,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

**Error Responses:**

*Unauthorized (401):*
```json
{
  "success": false,
  "message": "Authentication required"
}
```

*Validation error (400):*
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "code": "too_big",
      "path": ["price"],
      "message": "Price cannot exceed 10000"
    }
  ]
}
```

---

### 11. Batch Create Shirts (Protected)

**POST** `/api/shirts/batch`

Create multiple shirts with different sizes and stocks in a single operation. All shirts share the same name, description, type, price, and discount. Each shirt has a different size and stock. Requires authentication.

**Headers:**
```
Content-Type: application/json
Cookie: auth_token=<jwt_token> (automatically sent by Postman after login)
```

**Request Body:**
```json
{
  "name": "Premium Cotton Shirt",
  "description": "High-quality cotton fabric for comfort",
  "shirtTypeId": "65a1b2c3d4e5f6g7h8i9j0k11",
  "discount": {
    "type": "percentage",
    "value": 15
  },
  "sizes": [
    {
      "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k12",
      "price": 2000,
      "imageURL": "https://fastly.picsum.photos/id/193/200/200.jpg?hmac=JHo5tWHSRWvVbL3HX6rwDNdkvYPFojLtXkEGEUCgz6A",
      "stock": 30
    },
    {
      "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k10",
      "price": 2100,
      "imageURL": "https://fastly.picsum.photos/id/193/200/200.jpg?hmac=JHo5tWHSRWvVbL3HX6rwDNdkvYPFojLtXkEGEUCgz6A",
      "stock": 25
    },
    {
      "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k13",
      "price": 2200,
      "stock": 20
    }
  ]
}
```

**Field Details:**
| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `name` | string | Yes | Shirt name | 1-200 characters |
| `description` | string | No | Shirt description | Max 1000 characters |
| `shirtTypeId` | string | Yes | Shirt type ObjectId | Valid MongoDB ObjectId |
| `discount` | object | No | Discount details (applied to all sizes) | See discount schema below |
| `sizes` | array | Yes | Array of size variants | Min 1, no duplicates, at least one with stock > 0 |

**Sizes Array:**
- Each object must have:
  - `sizeReferenceId` (MongoDB ObjectId): Reference to SizeReference
  - `price` (number): Price for this specific size (0-10000)
  - `imageURL` (string, optional): Image URL for this specific size
  - `stock` (integer, min 0): Stock quantity for this size
- No duplicate `sizeReferenceId` values allowed
- At least one size must have stock > 0
- Only sizes with stock > 0 will be created
- Price and imageURL can vary by size

**Example Requests:**

*With percentage discount:*
```json
{
  "name": "Summer Casual Shirt",
  "shirtTypeId": "65a1b2c3d4e5f6g7h8i9j0k11",
  "discount": {
    "type": "percentage",
    "value": 20
  },
  "sizes": [
    {
      "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k12",
      "price": 1800,
      "stock": 25
    },
    {
      "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k10",
      "price": 1900,
      "stock": 30
    },
    {
      "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k13",
      "price": 2000,
      "stock": 15
    }
  ]
}
```

*With amount discount:*
```json
{
  "name": "Formal Business Shirt",
  "description": "Professional attire",
  "shirtTypeId": "65a1b2c3d4e5f6g7h8i9j0k14",
  "discount": {
    "type": "amount",
    "value": 500
  },
  "sizes": [
    {
      "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k10",
      "price": 3000,
      "stock": 40
    },
    {
      "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k13",
      "price": 3100,
      "stock": 35
    }
  ]
}
```

*Without discount:*
```json
{
  "name": "Wedding Shirt",
  "description": "Elegant shirt for special occasions",
  "shirtTypeId": "65a1b2c3d4e5f6g7h8i9j0k15",
  "sizes": [
    {
      "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k12",
      "price": 4500,
      "stock": 20
    },
    {
      "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k10",
      "price": 4600,
      "stock": 25
    },
    {
      "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k13",
      "price": 4700,
      "stock": 20
    },
    {
      "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k16",
      "price": 4800,
      "stock": 15
    }
  ]
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Successfully created 3 shirt variant(s) for design \"Premium Cotton Shirt\"",
  "data": {
    "shirt": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k3",
      "userId": "65a1b2c3d4e5f6g7h8i9j0k1",
      "name": "Premium Cotton Shirt",
      "description": "High-quality cotton fabric for comfort",
      "shirtTypeId": "65a1b2c3d4e5f6g7h8i9j0k11",
      "discount": {
        "type": "percentage",
        "value": 15
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "shirtSizes": [
      {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k20",
        "shirtId": "65a1b2c3d4e5f6g7h8i9j0k3",
        "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k12",
        "price": 2000,
        "imageURL": "https://fastly.picsum.photos/id/193/200/200.jpg?hmac=JHo5tWHSRWvVbL3HX6rwDNdkvYPFojLtXkEGEUCgz6A",
        "stock": 30,
        "finalPrice": 1700,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      },
      {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k21",
        "shirtId": "65a1b2c3d4e5f6g7h8i9j0k3",
        "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k10",
        "price": 2100,
        "imageURL": "https://fastly.picsum.photos/id/193/200/200.jpg?hmac=JHo5tWHSRWvVbL3HX6rwDNdkvYPFojLtXkEGEUCgz6A",
        "stock": 25,
        "finalPrice": 1785,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      },
      {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k22",
        "shirtId": "65a1b2c3d4e5f6g7h8i9j0k3",
        "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k13",
        "price": 2200,
        "stock": 20,
        "finalPrice": 1870,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

**Note:** The response includes one `Shirt` design and multiple `ShirtSize` variants. All variants share the same `name`, `description`, `shirtTypeId`, and `discount`, but each has its own `price`, `imageURL`, and `stock`.

**Error Responses:**

*Unauthorized (401):*
```json
{
  "success": false,
  "message": "Authentication required"
}
```

*Validation error (400):*
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "code": "custom",
      "path": ["sizes"],
      "message": "Duplicate sizes are not allowed"
    }
  ]
}
```

*Validation error - no stock (400):*
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "code": "custom",
      "path": ["sizes"],
      "message": "At least one size must have stock greater than 0"
    }
  ]
}
```

**Notes:**
- Only sizes with `stock > 0` are created (sizes with stock = 0 are filtered out)
- All created variants share the same `name`, `description`, `shirtTypeId`, and `discount`
- Each variant has its own `sizeReferenceId`, `price`, `imageURL`, and `stock`
- `finalPrice` is calculated automatically for each variant based on its `price` and the shared `discount`
- Price and imageURL can vary by size
- Cache is invalidated after batch creation

---

### 12. Update Shirt (Protected)

**PUT** `/api/shirts/:id`

Update an existing shirt and optionally update/create size variants. Only the seller who created the shirt can update it.

**Key Features:**
- Updates the main shirt with provided fields
- If `sizes` array is provided:
  - **Updates existing variants** (same seller, same name, same size) with new stock and shared attributes
  - **Creates new variants** for sizes that don't exist
  - **Skips the current shirt's size** (already updated via main update)

**Headers:**
```
Content-Type: application/json
Cookie: auth_token=<jwt_token> (automatically sent by Postman after login)
```

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Shirt MongoDB ObjectId | `/api/shirts/65a1b2c3d4e5f6g7h8i9j0k2` |

**Request Body:**
All fields are optional (partial update). Only include fields you want to update.

**Standard Update:**
```json
{
  "name": "Updated Shirt Name",
  "description": "Updated description"
}
```

**Update with Size Variants:**
```json
{
  "name": "Updated Shirt Name",
  "discount": {
    "type": "percentage",
    "value": 20
  },
  "currentSizeVariant": {
    "price": 2500,
    "imageURL": "https://fastly.picsum.photos/id/193/200/200.jpg?hmac=JHo5tWHSRWvVbL3HX6rwDNdkvYPFojLtXkEGEUCgz6A",
    "stock": 35
  },
  "sizes": [
    {
      "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k10",
      "price": 2600,
      "imageURL": "https://fastly.picsum.photos/id/193/200/200.jpg?hmac=JHo5tWHSRWvVbL3HX6rwDNdkvYPFojLtXkEGEUCgz6A",
      "stock": 30
    },
    {
      "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k13",
      "price": 2700,
      "stock": 25
    }
  ]
}
```

**Field Details:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | No | Shirt name |
| `description` | string | No | Shirt description |
| `shirtTypeId` | string | No | Shirt type ObjectId |
| `discount` | object | No | Discount details (applied to all variants) |
| `currentSizeVariant` | object | No | Update for the main shirt's size variant |
| `sizes` | array | No | Array of size variants to update existing or create new variants |

**currentSizeVariant Object (Optional):**
- Updates the main shirt's current size variant
- Fields: `price`, `imageURL`, `stock` (all optional)

**Sizes Array (Optional):**
- If provided, updates existing variants or creates new variants for additional sizes
- Each object must have:
  - `sizeReferenceId` (MongoDB ObjectId): Reference to SizeReference
  - `price` (number): Price for this size
  - `imageURL` (string, optional): Image URL for this size
  - `stock` (integer, min 0): Stock quantity
- No duplicate `sizeReferenceId` values allowed
- Updates existing variants (same user, same name, same size) with new price, imageURL, stock, and shared attributes
- Creates new variants for sizes that don't exist
- Skips the current shirt's size (it's updated via `currentSizeVariant`)

**Example Requests:**

*Update name and description only:*
```json
{
  "name": "Updated Shirt Name",
  "description": "Updated description"
}
```

*Update discount:*
```json
{
  "discount": {
    "type": "percentage",
    "value": 25
  }
}
```

*Update current size variant:*
```json
{
  "currentSizeVariant": {
    "price": 2800,
    "stock": 50
  }
}
```

*Remove discount:*
```json
{
  "discount": null
}
```

*Update with new size variants:*
```json
{
  "name": "Premium Cotton Shirt",
  "discount": {
    "type": "percentage",
    "value": 15
  },
  "sizes": [
    {
      "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k10",
      "price": 2000,
      "stock": 30
    },
    {
      "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k13",
      "price": 2100,
      "stock": 25
    },
    {
      "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k16",
      "price": 2200,
      "stock": 20
    }
  ]
}
```

**Note:** 
- The `currentSizeVariant` field updates the main shirt's current size variant
- If a size in the `sizes` array matches the current shirt's size, it will be skipped (use `currentSizeVariant` instead)
- **Existing variants** (same user, same name, different size) will be **updated** with new price, imageURL, stock, and shared attributes (name, description, shirtTypeId, discount)
- **New variants** (sizes that don't exist) will be **created** with the provided price, imageURL, stock, and shared attributes

**Success Response (200 OK):**

*Without sizes array (standard update):*
```json
{
  "success": true,
  "message": "Shirt updated successfully",
  "data": {
    "shirt": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
      "userId": "65a1b2c3d4e5f6g7h8i9j0k1",
      "name": "Updated Shirt Name",
      "description": "Updated description",
      "shirtTypeId": "65a1b2c3d4e5f6g7h8i9j0k14",
      "discount": {
        "type": "amount",
        "value": 300
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:35:00.000Z"
    },
    "updatedShirtSizes": [],
    "createdShirtSizes": [],
    "updatedCount": 0,
    "createdCount": 0
  }
}
```

*With sizes array (update + update/create variants):*
```json
{
  "success": true,
  "message": "Shirt updated successfully. 2 variant(s) updated, 1 variant(s) created.",
  "data": {
    "shirt": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
      "userId": "65a1b2c3d4e5f6g7h8i9j0k1",
      "name": "Premium Cotton Shirt",
      "description": "High-quality cotton fabric for comfort",
      "shirtTypeId": "65a1b2c3d4e5f6g7h8i9j0k11",
      "discount": {
        "type": "percentage",
        "value": 15
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:35:00.000Z"
    },
    "updatedShirtSizes": [
      {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k21",
        "shirtId": "65a1b2c3d4e5f6g7h8i9j0k2",
        "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k10",
        "price": 2000,
        "imageURL": "https://fastly.picsum.photos/id/193/200/200.jpg?hmac=JHo5tWHSRWvVbL3HX6rwDNdkvYPFojLtXkEGEUCgz6A",
        "stock": 30,
        "finalPrice": 1700,
        "createdAt": "2024-01-15T09:00:00.000Z",
        "updatedAt": "2024-01-15T10:35:00.000Z"
      },
      {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k22",
        "shirtId": "65a1b2c3d4e5f6g7h8i9j0k2",
        "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k13",
        "price": 2100,
        "stock": 25,
        "finalPrice": 1785,
        "createdAt": "2024-01-15T09:00:00.000Z",
        "updatedAt": "2024-01-15T10:35:00.000Z"
      }
    ],
    "createdShirtSizes": [
      {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k23",
        "shirtId": "65a1b2c3d4e5f6g7h8i9j0k2",
        "sizeReferenceId": "65a1b2c3d4e5f6g7h8i9j0k16",
        "price": 2200,
        "stock": 20,
        "finalPrice": 1870,
        "createdAt": "2024-01-15T10:35:00.000Z",
        "updatedAt": "2024-01-15T10:35:00.000Z"
      }
    ],
    "updatedCount": 2,
    "createdCount": 1
  }
}
```

**Error Responses:**

*Unauthorized (401):*
```json
{
  "success": false,
  "message": "Authentication required"
}
```

*Not found or unauthorized (404):*
```json
{
  "success": false,
  "message": "Shirt not found or unauthorized"
}
```

*Validation error (400):*
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "code": "custom",
      "path": ["sizes"],
      "message": "Duplicate sizes are not allowed"
    }
  ]
}
```

**Notes:**
- **Backward Compatible**: If `sizes` array is not provided, endpoint works as before (standard update)
- **Update Existing Variants**: If a variant exists (same user, same name, same size), it's updated with:
  - New price, imageURL, and stock values
  - Updated shared attributes (name, description, shirtTypeId, discount)
  - Recalculated finalPrice based on new price and discount
- **Create New Variants**: If a variant doesn't exist, a new `ShirtSize` record is created
- **Current Size Skipped**: The current shirt's size is automatically skipped in the sizes array (use `currentSizeVariant` to update it)
- **Stock Filtering**: Only sizes with stock > 0 are processed (sizes with stock = 0 are filtered out)
- **Shared Attributes**: All variants (updated and created) inherit name, description, shirtTypeId, and discount from the updated shirt
- **Price and ImageURL**: Can vary by size (each variant has its own price and imageURL)
- **Operation Order**: Main shirt update happens first, then variants are updated/created
- **Security**: Only variants belonging to the same user and having the same name are updated (prevents unauthorized updates)

---

### 13. Delete Shirt (Protected)

**DELETE** `/api/shirts/:id`

Delete a shirt. Only the seller who created the shirt can delete it.

**Headers:**
```
Cookie: auth_token=<jwt_token> (automatically sent by Postman after login)
```

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Shirt MongoDB ObjectId | `/api/shirts/65a1b2c3d4e5f6g7h8i9j0k2` |

**Request Body:**
```
None
```

**Example Request:**
```
DELETE /api/shirts/65a1b2c3d4e5f6g7h8i9j0k2
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Shirt deleted successfully"
}
```

**Error Responses:**

*Unauthorized (401):*
```json
{
  "success": false,
  "message": "Authentication required"
}
```

*Not found or unauthorized (404):*
```json
{
  "success": false,
  "message": "Shirt not found or unauthorized"
}
```

---

## Postman Setup Guide

### 1. Enable Cookie Handling

1. Open Postman Settings (gear icon)
2. Go to "General" tab
3. Ensure "Automatically follow redirects" is enabled
4. Cookies are handled automatically by Postman

### 2. Create a Postman Collection

**Recommended Collection Structure:**
```
Shirt Ecommerce API
├── Auth
│   ├── Seller Login
│   ├── Customer Signup
│   ├── Customer Login
│   └── Logout
├── Admin (Admin only)
│   ├── Admin Login
│   └── Create Seller
└── Shirts
    ├── List Shirts (Public)
    ├── Get Single Shirt (Public)
    └── Protected (Seller only)
        ├── Create Shirt
        ├── Batch Create Shirts
        ├── Update Shirt
        └── Delete Shirt
```

### 3. Testing Flow

**Step 1: Login/Signup**
- **For Administrators**: Send `POST /api/admin/login` with admin credentials
- **For Sellers**: Send `POST /api/auth/seller/login` with seller credentials (sellers must be created by admin first)
- **For Customers**: 
  - Send `POST /api/auth/customer/signup` to create account (auto-login)
  - Or send `POST /api/auth/customer/login` with customer credentials
- Postman automatically stores the `auth_token` cookie
- Verify in Postman's "Cookies" tab (click "Cookies" link at bottom)

**Step 2: Use Endpoints**
1. Public endpoints (`GET /api/shirts`, `GET /api/shirts/:id`) work without authentication
2. Protected endpoints (`POST`, `PUT`, `DELETE /api/shirts/*`) require seller authentication
3. Cookie is automatically included in requests
4. No need to manually add headers

**Step 3: Logout (Optional)**
1. Send `POST /api/auth/logout` (or `/api/auth/seller/logout` or `/api/auth/customer/logout`) to clear the cookie

### 4. Environment Variables (Optional)

Create a Postman environment with:
```
baseUrl: http://localhost:5000
baseUrl: http://localhost:5000
adminEmail: admin@example.com
adminPassword: admin123
sellerEmail: seller@example.com
sellerPassword: password123
customerEmail: customer@example.com
customerPassword: password123
```

Then use in requests:
```
{{baseUrl}}/api/auth/login
```

### 5. Pre-request Script (Optional)

To automatically login before protected requests, add this to collection's pre-request script:

```javascript
// Auto-login if no cookie exists
if (!pm.cookies.get('auth_token')) {
    pm.sendRequest({
        url: pm.environment.get('baseUrl') + '/api/auth/login',
        method: 'POST',
        header: {
            'Content-Type': 'application/json'
        },
        body: {
            mode: 'raw',
            raw: JSON.stringify({
                email: pm.environment.get('sellerEmail'),
                password: pm.environment.get('sellerPassword')
            })
        }
    });
}
```

---

## Common Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [ ... ]  // Only present for validation errors
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created (for POST requests) |
| 400 | Bad Request (validation errors) |
| 401 | Unauthorized (authentication required) |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## Test Data

**Important:** Both seed scripts clear existing collections before seeding to ensure a clean state.

### Seeding Reference Data

Run `npm run seed:reference` to populate reference data (UserTypes, ShirtTypes, SizeReferences). This script:
- Clears existing `UserType`, `ShirtType`, and `SizeReference` collections
- Creates fresh reference data

**Note:** Run this script first before running the main seed script.

### Seeding Test Data

After running `npm run seed:reference`, run `npm run seed` to populate test users and shirts. This script:
- Clears existing `User`, `Shirt`, and `ShirtSize` collections
- Creates test administrator and seller accounts
- Creates sample shirts with size variants

**Test Credentials:**

*Administrator:*
- Email: `admin@example.com`
- Password: `admin123`

*Seller:*
- Email: `seller@example.com`
- Password: `password123`
- Note: New sellers must be created by administrators using `POST /api/admin/sellers`

*Customer:*
- Create a new customer account using `POST /api/auth/customer/signup`
- Or use any email/password combination after signup

**Sample Shirt IDs:**
Use the shirt IDs returned from the list shirts endpoint or create new ones.

**Seeding Order:**
1. First: `npm run seed:reference` (creates reference data)
2. Then: `npm run seed` (creates test users and shirts)

---

## Notes

1. **Cookie-based Authentication**: The API uses HTTP-only cookies, which Postman handles automatically. No manual token management needed.

2. **CORS**: If testing from a browser, ensure CORS is configured in your `.env` file.

3. **Cache**: The list shirts endpoint is cached in Redis for 5 minutes. New shirts may not appear immediately in listings.

4. **finalPrice Calculation**:
   - Percentage discount: `finalPrice = price * (1 - discount.value / 100)`
   - Amount discount: `finalPrice = price - discount.value`
   - Automatically calculated on create/update

5. **Pagination**: Default page size is 10, maximum is 100.

6. **Filtering**: Multiple filters can be combined. All filters are optional.

---

## Quick Test Checklist

- [ ] Health check works
- [ ] Admin login with valid credentials
- [ ] Admin can create seller account
- [ ] Seller login with valid credentials
- [ ] Customer signup works
- [ ] Customer login works
- [ ] Cookie is stored after login
- [ ] List shirts (public, no auth needed)
- [ ] Get single shirt by ID (public, no auth needed)
- [ ] Create shirt (requires seller auth)
- [ ] Update shirt (requires seller auth, only own shirts)
- [ ] Delete shirt (requires seller auth, only own shirts)
- [ ] Logout clears cookie
- [ ] Protected endpoints fail without auth
- [ ] Admin endpoints fail without admin privileges


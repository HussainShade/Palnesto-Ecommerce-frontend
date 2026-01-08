# API Documentation

## Base URL

```
http://localhost:5000
```

## Authentication

This API uses **HTTP-only cookies** for authentication. After logging in, the JWT token is automatically stored in a cookie named `auth_token`. 

**Important for Postman:**
- Postman automatically handles cookies, but you need to enable cookie handling
- After login, the cookie is automatically sent with subsequent requests
- No need to manually add Authorization headers

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

### 2. Seller Login

**POST** `/api/auth/login`

Authenticate a seller and receive a JWT token in an HTTP-only cookie.

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

### 3. Seller Logout

**POST** `/api/auth/logout`

Logout and clear the authentication cookie.

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

### 4. List Shirts (Public)

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
| `size` | string | No | Filter by size (M, L, XL, XXL) | `?size=L` |
| `type` | string | No | Filter by type (Casual, Formal, Wedding, Sports, Vintage) | `?type=Formal` |
| `minPrice` | number | No | Minimum final price | `?minPrice=1000` |
| `maxPrice` | number | No | Maximum final price | `?maxPrice=5000` |
| `page` | number | No | Page number (default: 1) | `?page=1` |
| `limit` | number | No | Items per page (default: 10, max: 100) | `?limit=20` |

**Example Requests:**

*Get all shirts:*
```
GET /api/shirts
```

*Filter by size and type:*
```
GET /api/shirts?size=L&type=Formal
```

*Filter by price range with pagination:*
```
GET /api/shirts?minPrice=1000&maxPrice=3000&page=1&limit=20
```

*Combined filters:*
```
GET /api/shirts?size=M&type=Casual&minPrice=1500&maxPrice=2500&page=1&limit=10
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "shirts": [
      {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
        "sellerId": "65a1b2c3d4e5f6g7h8i9j0k1",
        "name": "Classic White Formal Shirt",
        "description": "Perfect for business meetings and formal occasions",
        "size": "L",
        "type": "Formal",
        "price": 2500,
        "discount": {
          "type": "percentage",
          "value": 10
        },
        "finalPrice": 2250,
        "stock": 50,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "code": "invalid_enum_value",
      "path": ["size"],
      "message": "Invalid enum value. Expected 'M' | 'L' | 'XL' | 'XXL', received 'XXL'"
    }
  ]
}
```

---

### 5. Get Single Shirt (Public)

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
      "sellerId": "65a1b2c3d4e5f6g7h8i9j0k1",
      "name": "Classic White Formal Shirt",
      "description": "Perfect for business meetings and formal occasions",
      "size": "L",
      "type": "Formal",
      "price": 2500,
      "discount": {
        "type": "percentage",
        "value": 10
      },
      "finalPrice": 2250,
      "stock": 50,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Shirt not found"
}
```

---

### 6. Create Shirt (Protected)

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
  "size": "M",
  "type": "Casual",
  "price": 2000,
  "discount": {
    "type": "percentage",
    "value": 15
  },
  "stock": 30
}
```

**Field Details:**
| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `name` | string | Yes | Shirt name | 1-200 characters |
| `description` | string | No | Shirt description | Max 1000 characters |
| `size` | string | Yes | Shirt size | M, L, XL, or XXL |
| `type` | string | Yes | Shirt type | Casual, Formal, Wedding, Sports, or Vintage |
| `price` | number | Yes | Base price | 0-10000 |
| `discount` | object | No | Discount details | See discount schema below |
| `stock` | number | No | Stock quantity | Integer, min 0 (default: 0) |

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
  "size": "L",
  "type": "Casual",
  "price": 1800,
  "discount": {
    "type": "percentage",
    "value": 20
  },
  "stock": 25
}
```

*With amount discount:*
```json
{
  "name": "Formal Business Shirt",
  "size": "XL",
  "type": "Formal",
  "price": 3000,
  "discount": {
    "type": "amount",
    "value": 500
  },
  "stock": 40
}
```

*Without discount:*
```json
{
  "name": "Wedding Shirt",
  "description": "Elegant shirt for special occasions",
  "size": "L",
  "type": "Wedding",
  "price": 4500,
  "stock": 20
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
      "sellerId": "65a1b2c3d4e5f6g7h8i9j0k1",
      "name": "Premium Cotton Shirt",
      "description": "High-quality cotton fabric for comfort",
      "size": "M",
      "type": "Casual",
      "price": 2000,
      "discount": {
        "type": "percentage",
        "value": 15
      },
      "finalPrice": 1700,
      "stock": 30,
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

### 7. Update Shirt (Protected)

**PUT** `/api/shirts/:id`

Update an existing shirt. Only the seller who created the shirt can update it.

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

```json
{
  "price": 2500,
  "stock": 35
}
```

**Example Requests:**

*Update price only:*
```json
{
  "price": 2200
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

*Update multiple fields:*
```json
{
  "name": "Updated Shirt Name",
  "price": 2800,
  "stock": 50,
  "discount": {
    "type": "amount",
    "value": 300
  }
}
```

*Remove discount:*
```json
{
  "discount": null
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Shirt updated successfully",
  "data": {
    "shirt": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
      "sellerId": "65a1b2c3d4e5f6g7h8i9j0k1",
      "name": "Updated Shirt Name",
      "size": "L",
      "type": "Formal",
      "price": 2800,
      "discount": {
        "type": "amount",
        "value": 300
      },
      "finalPrice": 2500,
      "stock": 50,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:35:00.000Z"
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
  "errors": [...]
}
```

---

### 8. Delete Shirt (Protected)

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
│   ├── Login
│   └── Logout
└── Shirts (Protected)
    ├── Create Shirt
    ├── Update Shirt
    └── Delete Shirt
```

### 3. Testing Flow

**Step 1: Login**
1. Send `POST /api/auth/login` with credentials
2. Postman automatically stores the `auth_token` cookie
3. Verify in Postman's "Cookies" tab (click "Cookies" link at bottom)

**Step 2: Use Protected Endpoints**
1. Public endpoints (`GET /api/shirts`, `GET /api/shirts/:id`) work without authentication
2. Protected endpoints (`POST`, `PUT`, `DELETE /api/shirts/*`) will automatically include the cookie
3. No need to manually add headers

**Step 3: Logout (Optional)**
1. Send `POST /api/auth/logout` to clear the cookie

### 4. Environment Variables (Optional)

Create a Postman environment with:
```
baseUrl: http://localhost:5000
sellerEmail: seller@example.com
sellerPassword: password123
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

After running `npm run seed`, you can use these credentials:

**Seller Credentials:**
- Email: `seller@example.com`
- Password: `password123`

**Sample Shirt IDs:**
Use the shirt IDs returned from the list shirts endpoint or create new ones.

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
- [ ] Login with valid credentials
- [ ] Cookie is stored after login
- [ ] List shirts (public, no auth needed)
- [ ] Get single shirt by ID (public, no auth needed)
- [ ] Create shirt (requires auth)
- [ ] Update shirt (requires auth, only own shirts)
- [ ] Delete shirt (requires auth, only own shirts)
- [ ] Logout clears cookie
- [ ] Protected endpoints fail without auth


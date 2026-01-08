# CORS Configuration Guide

## Problem

You're seeing this error in the browser console:
```
Access to fetch at 'http://localhost:5000/api/shirts' from origin 'http://localhost:3000' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present 
on the requested resource.
```

This happens because your backend server at `http://localhost:5000` is not configured to allow requests from your frontend at `http://localhost:3000`.

## Solution: Configure CORS on Backend

You need to configure CORS (Cross-Origin Resource Sharing) on your **backend server**. The frontend code is correct - this is a backend configuration issue.

### Required CORS Headers

Your backend must send these headers in responses:

```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### Backend Configuration (Common Frameworks)

#### Express.js with cors middleware

If your backend uses Express.js, install and configure the `cors` package:

```bash
npm install cors
```

Then in your backend server file (e.g., `server.js` or `app.js`):

```javascript
const express = require('express');
const cors = require('cors');
const app = express();

// Configure CORS
app.use(cors({
  origin: 'http://localhost:3000', // Frontend URL
  credentials: true, // Important for HTTP-only cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Your routes...
```

**For development with multiple origins:**

```javascript
const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**Using environment variable:**

```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

Then in your backend `.env` file:
```
FRONTEND_URL=http://localhost:3000
```

#### Manual CORS Headers (if not using cors middleware)

If you're not using the `cors` middleware, add these headers manually:

```javascript
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});
```

### Important Notes

1. **`credentials: true` is CRITICAL**: Since your frontend uses `credentials: 'include'` in fetch requests (for HTTP-only cookies), the backend MUST set `Access-Control-Allow-Credentials: true`. Without this, cookies won't work.

2. **Preflight Requests**: Browsers send OPTIONS requests before actual requests for certain methods. Your backend must handle these.

3. **Environment Variables**: Use environment variables for the frontend URL so you can easily change it for production:
   ```
   FRONTEND_URL=http://localhost:3000  # Development
   FRONTEND_URL=https://yourdomain.com  # Production
   ```

### Testing CORS Configuration

After configuring CORS on your backend:

1. **Restart your backend server**
2. **Clear browser cache** (or use incognito mode)
3. **Check Network tab** in browser DevTools:
   - Look for OPTIONS request (preflight) - should return 200 OK
   - Look for actual GET/POST request - should have CORS headers in response
   - Check Response Headers for `Access-Control-Allow-Origin`

### Verification Checklist

- [ ] Backend server restarted after CORS configuration
- [ ] `Access-Control-Allow-Origin` header includes `http://localhost:3000`
- [ ] `Access-Control-Allow-Credentials: true` is set
- [ ] OPTIONS requests are handled (return 200 OK)
- [ ] Network tab shows CORS headers in response
- [ ] No CORS errors in browser console

### Common Issues

**Issue**: Still getting CORS errors after configuration
- **Solution**: Make sure you restarted the backend server
- **Solution**: Check that the origin URL matches exactly (including `http://` and port)

**Issue**: Cookies not working
- **Solution**: Ensure `Access-Control-Allow-Credentials: true` is set
- **Solution**: Ensure frontend uses `credentials: 'include'` (already done)

**Issue**: Works in Postman but not browser
- **Solution**: Postman doesn't enforce CORS - browser does. This confirms it's a CORS issue.

### Production Configuration

For production, update your CORS configuration:

```javascript
const allowedOrigins = [
  'http://localhost:3000', // Development
  'https://yourdomain.com', // Production
  'https://www.yourdomain.com' // Production with www
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

## Summary

**The fix is on the backend, not the frontend.** Configure CORS middleware or headers on your backend server to allow requests from `http://localhost:3000` with credentials enabled.

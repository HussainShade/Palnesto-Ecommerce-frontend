# Cursor Prompt for Backend CORS Configuration

Copy and paste this prompt into Cursor in your **backend project**:

---

## Prompt for Cursor (Backend Project)

```
I need to configure CORS (Cross-Origin Resource Sharing) on my backend server to allow requests from my Next.js frontend running on http://localhost:3000.

Requirements:
1. Allow requests from origin: http://localhost:3000
2. Enable credentials (Access-Control-Allow-Credentials: true) - CRITICAL for HTTP-only cookies
3. Allow methods: GET, POST, PUT, DELETE, OPTIONS
4. Allow headers: Content-Type, Authorization
5. Handle preflight OPTIONS requests properly

My backend:
- Base URL: http://localhost:5000
- Uses HTTP-only cookies for authentication (cookie name: auth_token)
- API routes are under /api/*

Please:
1. Detect what backend framework I'm using (Express, Fastify, NestJS, Koa, etc.)
2. Install/configure the appropriate CORS middleware or headers
3. Ensure credentials are enabled for cookie support
4. Handle OPTIONS preflight requests
5. Make it configurable via environment variable (FRONTEND_URL) for different environments

If using Express.js, use the 'cors' package.
If using another framework, use the appropriate CORS solution for that framework.

After configuration, verify that:
- Access-Control-Allow-Origin header includes http://localhost:3000
- Access-Control-Allow-Credentials is set to true
- OPTIONS requests return 200 OK with proper headers
```

---

## What This Prompt Will Do

This prompt will:

1. **Detect your backend framework** by examining your codebase
2. **Install necessary packages** (e.g., `cors` for Express)
3. **Configure CORS middleware** with proper settings
4. **Enable credentials** for HTTP-only cookie support
5. **Handle preflight requests** (OPTIONS method)
6. **Make it environment-aware** using `.env` variables

## Expected Changes

After running the prompt, you should see:

### Express.js Example:
```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### Or Manual Headers (if not Express):
```javascript
app.use((req, res, next) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  res.header('Access-Control-Allow-Origin', frontendUrl);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});
```

## After Backend CORS is Configured

1. **Restart your backend server**
2. **Test from frontend** - CORS errors should be gone
3. **Verify in browser DevTools** → Network tab → Check response headers:
   - `Access-Control-Allow-Origin: http://localhost:3000`
   - `Access-Control-Allow-Credentials: true`

## Environment Variable (Optional)

Add to your backend `.env`:
```
FRONTEND_URL=http://localhost:3000
```

For production:
```
FRONTEND_URL=https://yourdomain.com
```

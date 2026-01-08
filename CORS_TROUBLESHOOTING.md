# CORS Troubleshooting Guide

## Current Status

You're experiencing CORS errors because the backend at `http://localhost:5000` is not configured to allow requests from the frontend at `http://localhost:3000`.

## ✅ Temporary Solution: Next.js Proxy (ACTIVE)

I've implemented a **Next.js API proxy** that routes requests through the Next.js server. This bypasses CORS issues.

### How It Works

- Frontend makes requests to `/api/proxy/*` (same origin, no CORS)
- Next.js server forwards requests to `http://localhost:5000/api/*`
- Responses are proxied back to frontend

### To Use

1. **Restart your Next.js dev server** (required for new API routes)
   ```bash
   npm run dev
   ```

2. The frontend will automatically use the proxy when running in the browser.

3. To disable proxy and use direct backend URL, set in `.env.local`:
   ```
   NEXT_PUBLIC_USE_PROXY=false
   ```

### Limitations

- Cookies may not work perfectly through proxy (HTTP-only cookies need proper backend CORS)
- This is a **development workaround only**
- For production, **backend must configure CORS properly**

---

## 🔧 Permanent Solution: Fix Backend CORS

The backend **MUST** be configured to allow CORS. Here's what needs to be done:

### Step 1: Verify Backend Framework

Check what framework your backend uses (Express, Fastify, NestJS, etc.)

### Step 2: Configure CORS

#### Express.js Example

```javascript
const express = require('express');
const cors = require('cors');
const app = express();

// Install cors if not already installed
// npm install cors

app.use(cors({
  origin: 'http://localhost:3000', // Frontend URL
  credentials: true, // CRITICAL for HTTP-only cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Your routes...
```

#### Manual CORS Headers (Any Framework)

```javascript
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});
```

### Step 3: Restart Backend Server

After making changes, **restart your backend server**.

### Step 4: Test CORS

1. Open browser DevTools → Network tab
2. Make a request from frontend
3. Check response headers - you should see:
   ```
   Access-Control-Allow-Origin: http://localhost:3000
   Access-Control-Allow-Credentials: true
   ```

### Step 5: Disable Proxy

Once backend CORS is working:

1. Set in `.env.local`:
   ```
   NEXT_PUBLIC_USE_PROXY=false
   ```

2. Restart Next.js dev server

---

## 🔍 Verification Checklist

### Backend CORS Configuration

- [ ] CORS middleware/headers are configured
- [ ] `Access-Control-Allow-Origin` includes `http://localhost:3000`
- [ ] `Access-Control-Allow-Credentials: true` is set
- [ ] OPTIONS requests are handled (preflight)
- [ ] Backend server restarted after changes

### Frontend Configuration

- [ ] `.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:5000/api`
- [ ] Next.js dev server restarted (for proxy to work)
- [ ] Browser cache cleared (or use incognito mode)

### Testing

- [ ] Open browser DevTools → Network tab
- [ ] Check request URL (should be `/api/proxy/*` if proxy enabled)
- [ ] Check response status (should be 200 OK)
- [ ] Check for CORS errors in console (should be none)
- [ ] Verify data loads correctly

---

## 🐛 Common Issues

### Issue: Still getting CORS errors with proxy

**Solution:**
1. Make sure Next.js dev server was restarted
2. Check browser console - requests should go to `/api/proxy/*`
3. Check Next.js terminal for proxy errors

### Issue: Cookies not working

**Solution:**
- Backend must set `Access-Control-Allow-Credentials: true`
- Frontend already uses `credentials: 'include'` (correct)
- Proxy forwards cookies, but backend CORS must allow credentials

### Issue: Proxy works but want direct connection

**Solution:**
1. Configure backend CORS properly (see above)
2. Set `NEXT_PUBLIC_USE_PROXY=false` in `.env.local`
3. Restart Next.js dev server

### Issue: Backend framework unknown

**Solution:**
- Check backend `package.json` for framework
- Look for `express`, `fastify`, `nestjs`, `koa`, etc.
- Search for CORS configuration in backend code
- Common files: `server.js`, `app.js`, `index.js`, `main.ts`

---

## 📝 Quick Test

Test if backend CORS is working:

```bash
# In terminal (curl test)
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://localhost:5000/api/shirts \
     -v
```

Look for these headers in response:
```
< Access-Control-Allow-Origin: http://localhost:3000
< Access-Control-Allow-Credentials: true
```

If you see these headers, CORS is configured correctly!

---

## 🎯 Summary

1. **Immediate**: Proxy is active - restart Next.js dev server to use it
2. **Permanent**: Configure CORS on backend (see examples above)
3. **Production**: Backend MUST have proper CORS configuration

The proxy is a temporary workaround. The backend team needs to fix CORS for a proper solution.

# 🔐 Complete Authentication Testing Guide

## ✅ Current Status
- **Backend JWT Authentication**: ✅ WORKING on `localhost:3001`
- **Protected Endpoint**: ✅ Correctly blocking unauthorized requests  
- **Test Script**: ✅ Ready at `backend/test-auth.js`

## 🧪 Method 1: Test Without Real Tokens (Already Working)

```bash
cd backend
node test-auth.js
```

**Expected Output:**
```
🧪 Testing Both Sides Authentication...

1️⃣ Testing unprotected endpoint:
   Status: 200
   Response: Hello World!

2️⃣ Testing protected endpoint WITHOUT token:
   Status: 401
   Response: {"message":"Unauthorized","statusCode":401}
```

## 🚀 Method 2: Test with Real Clerk JWT Token

### Step 1: Set Up Clerk Environment
1. **Create `.env.local`** in the frontend root:
```bash
# Get these from https://dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here
```

2. **Also add to backend `.env`**:
```bash
CLERK_SECRET_KEY=sk_test_your_secret_key_here
```

### Step 2: Get JWT Token
**Option A: Browser Method**
1. Go to `http://localhost:3000` and sign in
2. Open DevTools (F12) → **Network** tab
3. Refresh the page or navigate
4. Look for requests with `Authorization: Bearer ...`
5. Copy the JWT token (starts with `eyJ...`)

**Option B: Console Method**
Add this to any React component:
```tsx
import { useAuth } from '@clerk/nextjs'

const { getToken } = useAuth()
getToken().then(token => console.log('JWT Token:', token))
```

### Step 3: Test Backend
```bash
# Replace YOUR_TOKEN with actual JWT
cd backend
node test-auth.js "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9..."
```

**Expected Success Output:**
```
3️⃣ Testing protected endpoint WITH JWT token:
   Status: 200
   Response: {
     "message": "This is a protected endpoint",
     "user": {
       "userId": "user_xxxxx",
       "email": "user@example.com"
     },
     "timestamp": "2024-01-13T12:00:00.000Z"
   }
```

## 🔧 Method 3: Manual cURL Testing

```bash
# Test unprotected endpoint
curl -X GET http://localhost:3001/api

# Test protected endpoint without token (should return 401)
curl -X GET http://localhost:3001/api/protected

# Test protected endpoint with JWT token (should return 200)
curl -X GET http://localhost:3001/api/protected \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

## 🛠️ Method 4: Create Test Token (Development Only)

If you need to test without setting up Clerk completely, you can create a simple test JWT:

```javascript
// backend/create-test-token.js
const jwt = require('jsonwebtoken')

const testPayload = {
  sub: 'test_user_123',
  email: 'test@example.com',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
}

const token = jwt.sign(testPayload, process.env.CLERK_SECRET_KEY || 'fallback-secret')
console.log('Test JWT Token:', token)
```

Run: `node backend/create-test-token.js`

## 🎯 Quick Test Commands

```bash
# Test all endpoints without authentication
cd backend && node test-auth.js

# Test with your real JWT token
cd backend && node test-auth.js "YOUR_REAL_JWT_TOKEN"

# Quick cURL test
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/protected
```

## 📋 Troubleshooting

### Backend Issues:
- **Port 3001 not accessible**: Check if backend is running: `ps aux | grep node`
- **401 even with token**: Token might be expired or invalid
- **Connection refused**: Restart backend: `cd backend && node dist/main.js`

### Token Issues:
- **Token too short**: Make sure you copied the entire JWT (should be 200+ characters)
- **Token expired**: JWT tokens typically expire after 1 hour
- **Invalid signature**: Make sure `CLERK_SECRET_KEY` matches in both frontend and backend

### Clerk Setup:
- **Invalid publishable key**: Get new keys from https://dashboard.clerk.com
- **CORS errors**: Backend allows localhost:3000 by default

## ✅ Success Indicators

**Working Authentication:**
- ✅ Unprotected `/api` returns "Hello World!"
- ✅ Protected `/api/protected` returns 401 without token
- ✅ Protected `/api/protected` returns user data with valid token

**Your JWT authentication is READY! 🎉**

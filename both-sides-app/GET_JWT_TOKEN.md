# 🔐 How to Get and Test Real Clerk JWT Tokens

## Method 1: Browser DevTools (Recommended)

### Step 1: Access the Frontend
1. Open your browser and go to `http://localhost:3000`
2. Sign up or sign in using Clerk authentication

### Step 2: Extract JWT Token
1. **Open DevTools** (F12 or right-click → Inspect)
2. Go to **Application** tab
3. Under **Storage** → **Local Storage** → `http://localhost:3000`
4. Look for a key that contains `clerk` or `session`
5. **OR** go to **Network** tab:
   - Refresh the page or navigate to `/dashboard`
   - Look for API requests to Clerk
   - Check the **Headers** section for `Authorization: Bearer xyz...`

### Step 3: Test with Backend
```bash
# Go to backend directory
cd backend

# Test with your token
node test-auth.js "your_jwt_token_here"
```

## Method 2: Frontend Console Extraction

### Add this to any page component temporarily:
```tsx
'use client'
import { useAuth } from '@clerk/nextjs'
import { useEffect } from 'react'

export function TokenExtractor() {
  const { getToken } = useAuth()
  
  useEffect(() => {
    const extractToken = async () => {
      const token = await getToken()
      console.log('🔐 Clerk JWT Token:', token)
    }
    extractToken()
  }, [getToken])
  
  return null
}
```

## Method 3: Create API Endpoint for Token

### Add this to `src/app/api/debug/token/route.ts`:
```tsx
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { getToken } = auth()
    const token = await getToken()
    
    return NextResponse.json({ 
      token,
      note: 'Remove this endpoint in production!' 
    })
  } catch (error) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
}
```

### Then visit: `http://localhost:3000/api/debug/token`

## Method 4: cURL Test Template

```bash
# Replace YOUR_JWT_TOKEN with actual token
curl -X GET http://localhost:3001/api/protected \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

## Expected Results

### ✅ Success Response:
```json
{
  "message": "This is a protected endpoint",
  "user": {
    "userId": "user_xxxxx",
    "email": "user@example.com"
  },
  "timestamp": "2024-01-13T12:00:00.000Z"
}
```

### ❌ Failed Response (401):
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

## Troubleshooting

### Token Issues:
- **Token too short**: Make sure you copied the entire JWT
- **Token expired**: Get a fresh token (they expire after 1 hour by default)
- **Invalid token**: Verify the token is from the correct Clerk application

### Backend Issues:
- **Connection refused**: Make sure backend is running on port 3001
- **CORS errors**: Backend should allow requests from localhost:3000

### Frontend Issues:
- **No token found**: Make sure you're signed in
- **Token undefined**: User might not be fully authenticated yet

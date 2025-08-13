# Clerk Authentication Setup Guide

## Overview
This guide walks you through setting up Clerk authentication for the Both Sides MVP frontend.

## Step 1: Create Clerk Account & Application

### 1. Sign up for Clerk
1. Go to [clerk.com](https://clerk.com)
2. Sign up for a free account
3. Verify your email address

### 2. Create Application
1. In the Clerk Dashboard, click "Create Application"
2. Configure your application:
   - **Name**: `Both Sides MVP`
   - **Application Type**: `Regular web application`
   - **Sign-in options**: Enable Email + Google/GitHub (recommended)
   - **Instance type**: `Development` (for now)

3. Click "Create Application"

### 3. Get API Keys
After creation, you'll see your API keys:
- **Publishable Key**: `pk_test_...` (safe to expose publicly)
- **Secret Key**: `sk_test_...` (keep secure, server-side only)

## Step 2: Configure Environment Variables

Create a `.env.local` file in your project root with:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here

# App Configuration (optional)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important**: 
- Never commit `.env.local` to version control
- The `NEXT_PUBLIC_` prefix exposes the variable to the browser (only use for publishable key)

## Step 3: Test Your Setup

1. Start the development server:
   ```bash
   yarn dev
   ```

2. Visit `http://localhost:3000` 
3. You should see the Both Sides landing page
4. Click "Sign Up" or "Sign In" to test authentication

## Features Implemented

### 🔐 **Authentication Pages**
- **Sign In**: `/sign-in` - Modal and dedicated page
- **Sign Up**: `/sign-up` - User registration with email verification
- **Profile Management**: `/profile` - Complete user profile editor

### 🛡️ **Protected Routes**
- **Dashboard**: `/dashboard` - Main user dashboard (requires auth)
- **Profile**: `/profile` - Profile management (requires auth)
- Middleware automatically redirects unauthenticated users

### 🎨 **UI Components**
- **Landing Page**: Beautiful hero section with conditional content
- **Navigation**: Smart header that adapts based on auth state
- **User Button**: Profile dropdown with sign out option
- **Responsive Design**: Works on all device sizes

## Clerk Configuration Options

### Sign-in Methods
Configure in Clerk Dashboard → User & Authentication → Email, Phone, Username:
- ✅ **Email addresses** (recommended)
- ✅ **Phone numbers** (optional)
- ✅ **Usernames** (optional)
- ✅ **Social logins** (Google, GitHub, etc.)

### User Profile Fields
Configure in Clerk Dashboard → User & Authentication → Personal Information:
- First name, Last name
- Profile image
- Custom fields (for belief mapping)

### Security Settings
- **Password requirements**: Minimum length, complexity
- **Multi-factor authentication**: SMS, TOTP apps
- **Session management**: Timeout, concurrent sessions

## Integration with Backend

The Clerk integration includes JWT tokens that can be validated by your NestJS backend:

```typescript
// Headers sent with authenticated requests:
Authorization: Bearer <jwt-token>
```

This enables:
- Secure API calls to NestJS backend
- User identification and authorization
- Webhook synchronization for user data

## Customization Options

### Appearance Theming
Clerk components are already styled to match Both Sides design:
- Blue primary colors (`bg-blue-600`)
- Consistent shadows and borders
- Responsive layouts

### Component Customization
```typescript
<SignIn 
  appearance={{
    elements: {
      formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
      card: 'shadow-lg',
    },
  }}
  redirectUrl="/dashboard"
  signUpUrl="/sign-up"
/>
```

## Troubleshooting

### Common Issues

**"Invalid publishable key" error**
```
Error: The publishableKey passed to Clerk is invalid
```
- ✅ Check that your API key is correctly copied from Clerk Dashboard
- ✅ Ensure you're using the correct environment (development vs production keys)
- ✅ Restart your development server after adding environment variables

**Middleware not working**
```
Authenticated users can access public routes
```
- ✅ Check `middleware.ts` is in the root directory (not in `/src`)
- ✅ Verify the `matcher` configuration includes your routes
- ✅ Ensure Clerk components are wrapped in `<ClerkProvider>`

**Build errors with TypeScript**
```
Type errors with Clerk hooks
```
- ✅ Make sure you're using client components (`'use client'`) for hooks like `useUser()`
- ✅ Server components should use `currentUser()` from `@clerk/nextjs/server`

### Development vs Production

**Development Setup** (current):
- Uses `pk_test_` and `sk_test_` keys
- Allows localhost origins
- Relaxed security settings

**Production Setup** (future):
- Upgrade to production keys (`pk_live_` and `sk_live_`)
- Configure production domain in Clerk Dashboard
- Enable additional security features (MFA, etc.)

## Next Steps

1. **Complete Backend Integration** (Task 1.3.2):
   - JWT validation in NestJS
   - Webhook synchronization
   - User data persistence

2. **Enhanced User Experience**:
   - Onboarding flow for new users
   - Profile completion prompts
   - Social login options

3. **Advanced Features**:
   - Role-based access control (Student/Teacher)
   - Custom user metadata for belief profiles
   - Integration with debate matching system

## Architecture Benefits

✅ **Zero-config Security**: Clerk handles password hashing, session management, and security best practices

✅ **Scalable Authentication**: Supports millions of users with global infrastructure

✅ **Developer Experience**: Simple APIs, comprehensive documentation, and helpful error messages

✅ **User Experience**: Fast loading, accessible components, and smooth authentication flows

✅ **Compliance Ready**: GDPR, CCPA, and SOC 2 compliant out of the box

This setup provides a production-ready authentication system that scales with the Both Sides platform! 🚀

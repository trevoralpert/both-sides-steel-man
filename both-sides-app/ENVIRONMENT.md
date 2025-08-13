# Environment Setup Guide

This guide will help you set up the environment variables needed for the Both Sides app.

## Quick Start

1. **Copy the environment template:**
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in your actual values** in `.env.local` (see sections below)

3. **Start the development server:**
   ```bash
   yarn dev
   ```

## Required Services

### 🚀 Immediate Setup (Core App)

These are needed for basic app functionality:

- **App Configuration** - Already set up ✅
- **Development flags** - Already set up ✅

### 🔧 Phase 1 Setup (Authentication & Database)

These will be needed as we progress through Phase 1:

#### Database (Neon PostgreSQL)
1. Go to [neon.tech](https://neon.tech)
2. Create a new project: "both-sides-mvp"
3. Copy the connection string
4. Add to `.env.local`:
   ```env
   DATABASE_URL=postgresql://username:password@host/database?sslmode=require
   ```

#### Authentication (Clerk)
1. Go to [clerk.com](https://clerk.com)
2. Create a new application: "Both Sides MVP"
3. Copy the keys from the dashboard
4. Add to `.env.local`:
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
   CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
   ```

### 🎯 Phase 2+ Setup (AI & Real-time Features)

These will be needed for advanced features:

#### AI Services (OpenAI)
1. Go to [platform.openai.com](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add to `.env.local`:
   ```env
   OPENAI_API_KEY=sk-xxxxxxxxxxxxx
   ```

#### Real-time Messaging (Ably)
1. Go to [ably.com](https://ably.com)
2. Create a new app: "both-sides-realtime"
3. Copy the keys from the dashboard
4. Add to `.env.local`:
   ```env
   NEXT_PUBLIC_ABLY_KEY=xxxxxxxxxxxxx
   ABLY_SECRET_KEY=xxxxxxxxxxxxx
   ```

#### Caching & Sessions (Upstash Redis)
1. Go to [upstash.com](https://upstash.com)
2. Create a new Redis database: "both-sides-cache"
3. Copy the connection details
4. Add to `.env.local`:
   ```env
   REDIS_URL=rediss://default:password@host:port
   REDIS_TOKEN=xxxxxxxxxxxxx
   ```

## Environment Validation

The app automatically validates environment variables on startup. If required variables are missing, you'll see helpful error messages.

### Checking Your Setup

Run this command to validate your environment:
```bash
yarn type-check
```

### Debug Mode

Enable debug mode to see configuration warnings:
```env
DEBUG=true
```

This will show which services are not yet configured.

## Security Best Practices

### ✅ DO
- Keep `.env.local` in `.gitignore` (already configured)
- Use different credentials for development/production
- Regularly rotate API keys
- Use environment-specific URLs

### ❌ DON'T
- Commit `.env.local` to version control
- Share credentials in chat/email
- Use production credentials in development
- Hardcode secrets in source code

## Troubleshooting

### Common Issues

1. **"Invalid environment variables" error**
   - Check that your `.env.local` file exists
   - Verify all required variables are set
   - Ensure no extra spaces around `=` signs

2. **Database connection failed**
   - Verify your `DATABASE_URL` is correct
   - Check that your IP is allowlisted in Neon
   - Ensure SSL mode is enabled

3. **Authentication not working**
   - Verify Clerk keys are correct
   - Check that your domain is configured in Clerk
   - Ensure you're using the right environment (test vs production)

### Getting Help

If you encounter issues:
1. Check the console for specific error messages
2. Verify your `.env.local` against `.env.example`
3. Ensure all services are properly configured
4. Check service dashboards for any issues

## Service Documentation Links

- [Neon Docs](https://neon.tech/docs)
- [Clerk Docs](https://clerk.com/docs)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Ably Docs](https://ably.com/docs)
- [Upstash Docs](https://docs.upstash.com)

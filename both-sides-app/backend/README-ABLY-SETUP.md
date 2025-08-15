# Ably Real-time Setup Guide - Phase 5

## Overview
This guide helps you set up Ably for real-time messaging in the Both Sides debate platform.

## Step 1: Create Ably Account

1. Go to [ably.com](https://ably.com)
2. Sign up for a free account (includes generous free tier)
3. Create a new application for "Both Sides Debate Platform"

## Step 2: Get API Key

1. In your Ably dashboard, go to "API Keys"
2. Use the default "Root" key or create a new one with these capabilities:
   - **Publish**: Allow clients to send messages
   - **Subscribe**: Allow clients to receive messages  
   - **Presence**: Allow presence tracking
   - **Push**: For future mobile push notifications
   - **Channel Metadata**: For channel information

3. Copy your API key (format: `xxxxxxx.xxxxxx:xxxxxxxxxxxxxxxxxx`)

## Step 3: Configure Environment

Add to your `.env` file:
```bash
# Ably Real-time Configuration
ABLY_API_KEY=your_ably_api_key_here
```

## Step 4: Test Integration

Run the test script to verify everything works:
```bash
npm run build
node test-ably-integration.js
```

**Expected Output:**
```
🧪 Testing Ably Integration Setup...

✅ NestJS application context created

✅ AblyConfigService retrieved from DI container

🔍 Testing Ably Service Methods:
   Conversation channel: ✅ conversation:test-conversation-123
   Presence channel: ✅ presence:test-conversation-123
   Moderation channel: ✅ moderation:test-conversation-123
   Coaching channel: ✅ coaching:test-user-456:test-conversation-123

🔍 Testing Channel Access Validation:
   conversation:test-conversation-123: ✅
   presence:test-conversation-123: ✅
   moderation:test-conversation-123: ✅
   coaching:test-user-456:test-conversation-123: ✅
   invalid:channel:name: ❌

🔍 Testing Token Request Generation:
   Token request: ✅ Generated for user test-user-456
   Expires at: 2024-XX-XXTXX:XX:XX.XXX-XX

🎉 Ably Integration Test Complete!
   All core functionality is working correctly.
```

## Step 5: API Endpoints

Once running, these endpoints will be available:

### Generate Token Request
```bash
POST /api/realtime/token-request
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "conversationId": "conversation-uuid-here"
}
```

### Health Check
```bash
GET /api/realtime/health
```

## Channel Structure

The system uses these channel naming patterns:

- **Conversation Messages**: `conversation:{conversationId}`
- **User Presence**: `presence:{conversationId}`
- **Moderation Events**: `moderation:{conversationId}`
- **AI Coaching**: `coaching:{userId}:{conversationId}`

## Security Features

- ✅ JWT-based authentication integration
- ✅ User-specific token generation
- ✅ Conversation-scoped channel access
- ✅ Automatic token expiration (1 hour)
- ✅ Channel access validation

## Rate Limits (Ably Free Tier)

- **6M messages/month** (200k/day average)
- **200 concurrent connections**
- **100 channels**

Perfect for development and early production!

## Troubleshooting

### "ABLY_API_KEY not found"
- Make sure your `.env` file has the correct API key
- Restart your development server after adding the key

### "Connection failed"
- Verify your API key is correct
- Check your internet connection
- Ensure no firewall blocking WebSocket connections

### "Channel access denied"
- Verify JWT token is valid
- Check that user is a participant in the conversation
- Ensure conversation ID is correct

## Next Steps

After Ably is working:
1. ✅ Task 5.1.2 Complete - Ably integration ready
2. ⏳ Task 5.1.3 - WebSocket Connection Management
3. ⏳ Task 5.1.4 - Message Routing & Delivery
4. ⏳ Task 5.1.5 - Presence & Typing Indicators

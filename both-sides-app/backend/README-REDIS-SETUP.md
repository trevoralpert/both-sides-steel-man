# Redis Setup with Upstash - Complete Guide

## Overview
This guide walks you through setting up Redis caching and session storage using Upstash for the Both Sides MVP backend.

## Step 1: Create Upstash Account and Database

### 1. Sign up for Upstash
1. Go to [upstash.com](https://upstash.com)
2. Sign up for a free account (includes 10,000 commands/day)
3. Verify your email address

### 2. Create Redis Database
1. In the Upstash Console, click "Create Database"
2. Configure your database:
   - **Name**: `both-sides-cache`
   - **Region**: Choose closest to your deployment region (for best performance)
   - **Type**: Regional (Global for multi-region if needed)
   - **TLS**: Enable (recommended for security)

3. Click "Create Database"

### 3. Get Connection Details
After creation, you'll see your database dashboard with:
- **Endpoint**: Your Redis server URL
- **Port**: Usually 6379 (6380 for TLS)
- **Password**: Auto-generated secure password
- **Connection String**: Complete Redis URL

## Step 2: Configure Environment Variables

Update your `.env` file with the Upstash connection details:

```bash
# Redis Configuration (Upstash)
REDIS_URL="rediss://default:YOUR_PASSWORD@YOUR_ENDPOINT.upstash.io:6380"
```

**Example:**
```bash
REDIS_URL="rediss://default:AX_8xexamplex5QQ@us1-apt-shark-12345.upstash.io:6380"
```

## Step 3: Test Your Connection

Build and test your Redis setup:

```bash
# Build the application
yarn build

# Run Redis connection test
node test-redis-connection.js
```

**Expected Output:**
```
🧪 Testing Redis Connection and Cache Service...

✅ NestJS application context created

🔍 Testing Basic Redis Operations:
   Ping test: ✅ PONG
   Set operation: ✅ SUCCESS
   Get operation: ✅ SUCCESS (Hello Redis!)
   Delete operation: ✅ SUCCESS

🔍 Testing JSON Operations:
   JSON Set: ✅ SUCCESS
   JSON Get: ✅ SUCCESS

🔍 Testing Cache Service:
   User Session Set: ✅ SUCCESS
   User Session Get: ✅ SUCCESS
   Rate Limit Check: ✅ SUCCESS (4 remaining)

🔍 Testing Health Check:
   Redis Health: ✅ HEALTHY
   Operations Health: ✅ HEALTHY

🎉 All Redis tests completed successfully!
```

## Architecture Overview

### Redis Service (`RedisService`)
Low-level Redis client wrapper with:
- ✅ Connection management and error handling
- ✅ Basic operations (get, set, del)
- ✅ JSON operations (getJson, setJson)
- ✅ List operations (lpush, rpop, llen)
- ✅ Hash operations (hget, hset, hgetall)
- ✅ Set operations (sadd, sismember, smembers)
- ✅ Utility methods (exists, expire, keys, flushall)
- ✅ Health checks and monitoring

### Cache Service (`CacheService`)
High-level application-specific caching with:
- ✅ **User Sessions**: Secure session storage with TTL
- ✅ **User Profiles**: Profile data caching
- ✅ **Debate Sessions**: Real-time debate state caching
- ✅ **Rate Limiting**: Request throttling and abuse prevention
- ✅ **API Response Caching**: Reduce external API calls
- ✅ **Presence Tracking**: Online user status
- ✅ **Temporary Data**: Form drafts, file uploads
- ✅ **Debate Queues**: Matchmaking and lobby management
- ✅ **Cache Invalidation**: Intelligent cache clearing

## Usage Examples

### Basic Caching
```typescript
import { CacheService } from '@/common/services/cache.service';

@Injectable()
export class UserService {
  constructor(private cache: CacheService) {}

  async getUserProfile(userId: string) {
    // Try cache first
    let profile = await this.cache.getUserProfile(userId);
    
    if (!profile) {
      // Fetch from database
      profile = await this.prisma.user.findUnique({ where: { id: userId } });
      
      // Cache for 12 hours
      await this.cache.setUserProfile(userId, profile, 12);
    }
    
    return profile;
  }
}
```

### Session Management
```typescript
// Set user session
await this.cache.setUserSession('user123', {
  userId: 'user123',
  email: 'user@example.com',
  role: 'student',
  loginTime: Date.now()
}, 24); // 24 hours

// Get session
const session = await this.cache.getUserSession('user123');
```

### Rate Limiting
```typescript
const { allowed, remaining, resetTime } = await this.cache.checkRateLimit(
  `api:${userId}`, 
  100, // 100 requests
  3600 // per hour
);

if (!allowed) {
  throw new HttpException('Rate limit exceeded', 429);
}
```

### Debate Queue Management
```typescript
// Add user to matchmaking queue
await this.cache.addToDebateQueue('general', userId, {
  topics: ['climate', 'politics'],
  difficulty: 'intermediate',
  anonymous: true
});

// Get users in queue
const queuedUsers = await this.cache.getDebateQueueUsers('general');
```

## Performance Considerations

### Connection Settings
- **Serverless Optimized**: Configured for Vercel/Netlify deployments
- **Auto-reconnection**: Handles connection drops gracefully
- **Connection Pooling**: Efficient connection reuse
- **Command Pipelining**: Batches multiple operations

### Upstash Features
- **Global Edge Network**: Low latency worldwide
- **Persistence**: Data survives server restarts
- **Automatic Scaling**: Handles traffic spikes
- **Built-in Monitoring**: Performance metrics and alerts

### Caching Strategies
- **Write-Through**: Update cache and database simultaneously
- **Cache-Aside**: Load from database, cache the result
- **TTL Management**: Automatic expiration prevents stale data
- **Selective Invalidation**: Clear specific cache patterns

## Security Features

### Connection Security
- **TLS Encryption**: All data encrypted in transit
- **Authentication**: Password-protected access
- **IP Whitelisting**: Restrict access by IP (optional)

### Data Protection
- **Automatic Expiration**: Sensitive data auto-expires
- **Namespace Isolation**: Different data types use separate key spaces
- **No Persistent Storage**: Session data doesn't persist beyond TTL

## Monitoring and Debugging

### Health Checks
```typescript
const health = await this.cache.healthCheck();
console.log('Redis Health:', health);
// { redis: true, operations: true }
```

### Upstash Dashboard
- **Real-time Metrics**: Commands per second, memory usage
- **Command History**: See all executed commands
- **Performance Analytics**: Response times and throughput
- **Alerts**: Get notified of issues

### Application Logs
The services include comprehensive logging:
- Connection events (connect, disconnect, error)
- Operation failures with error details
- Performance metrics for slow operations

## Troubleshooting

### Common Issues

**Connection Failed**
```
Error: getaddrinfo ENOTFOUND your-endpoint.upstash.io
```
- ✅ Check REDIS_URL is correctly formatted
- ✅ Verify endpoint URL from Upstash console
- ✅ Ensure database is not paused/deleted

**Authentication Failed**
```
Error: NOAUTH Authentication required
```
- ✅ Check password in connection string
- ✅ Verify TLS is enabled (rediss:// not redis://)

**Rate Limits**
```
Error: ERR max number of clients reached
```
- ✅ Upgrade Upstash plan or optimize connection usage
- ✅ Review connection pooling settings

### Debug Mode
Set environment variable for detailed logging:
```bash
DEBUG=ioredis:* yarn start:dev
```

## Production Considerations

### Performance
- **Connection Limits**: Monitor concurrent connections
- **Memory Usage**: Track Redis memory consumption
- **Command Latency**: Monitor response times

### Scaling
- **Vertical Scaling**: Upgrade Upstash plan as needed
- **Horizontal Scaling**: Use Redis Cluster for very high loads
- **Regional Distribution**: Deploy close to your users

### Backup & Recovery
- **Point-in-time Recovery**: Upstash provides automated backups
- **Export Data**: Backup important cache data periodically
- **Disaster Recovery**: Plan for Redis unavailability

This setup provides a robust, scalable caching solution ready for production use! 🚀

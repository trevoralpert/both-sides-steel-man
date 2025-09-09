# Multi-stage Dockerfile for Both Sides Platform
# Optimized for production deployment with security and performance

# ============================================================================
# Build Arguments
# ============================================================================
ARG NODE_VERSION=20
ARG YARN_VERSION=4.9.1
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION

# ============================================================================
# Base Image
# ============================================================================
FROM node:${NODE_VERSION}-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    libc6-compat \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Enable Corepack for Yarn
RUN corepack enable

# Set working directory
WORKDIR /app

# ============================================================================
# Dependencies Stage
# ============================================================================
FROM base AS deps

# Copy package files
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn .yarn

# Install dependencies
RUN yarn install --frozen-lockfile --production=false

# ============================================================================
# Build Stage
# ============================================================================
FROM base AS builder

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set build environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build arguments for build-time information
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION

ENV BUILD_DATE=${BUILD_DATE}
ENV VCS_REF=${VCS_REF}
ENV VERSION=${VERSION}

# Build the application
RUN yarn build

# ============================================================================
# Production Stage
# ============================================================================
FROM base AS runner

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy package.json for runtime dependencies
COPY --from=builder /app/package.json ./package.json

# Set correct permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node healthcheck.js || exit 1

# Create healthcheck script
RUN echo 'const http = require("http"); \
const options = { \
  host: "localhost", \
  port: process.env.PORT || 3000, \
  path: "/api/health", \
  timeout: 2000 \
}; \
const request = http.request(options, (res) => { \
  console.log(`STATUS: ${res.statusCode}`); \
  process.exitCode = (res.statusCode === 200) ? 0 : 1; \
  process.exit(); \
}); \
request.on("error", function(err) { \
  console.log("ERROR"); \
  process.exit(1); \
}); \
request.end();' > healthcheck.js

# Expose port
EXPOSE 3000

# Add labels for metadata
LABEL maintainer="Both Sides Team <team@bothsides.app>"
LABEL org.opencontainers.image.title="Both Sides Platform"
LABEL org.opencontainers.image.description="AI-powered educational debate platform"
LABEL org.opencontainers.image.version="${VERSION}"
LABEL org.opencontainers.image.created="${BUILD_DATE}"
LABEL org.opencontainers.image.revision="${VCS_REF}"
LABEL org.opencontainers.image.source="https://github.com/both-sides/platform"
LABEL org.opencontainers.image.licenses="MIT"

# Start the application with dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]

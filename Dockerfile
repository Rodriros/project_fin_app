# Multi-Stage Dockerfile for FinRod APP Backend (Google Cloud Run optimized)

# Stage 1: Build & Dependencies
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies (openssl required for Prisma on Alpine)
RUN apk add --no-cache openssl libc6-compat

# Copy package manifests
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including devDependencies for build)
RUN npm install

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source code and compile TypeScript to dist/
COPY src ./src
RUN npm run build

# Prune dev dependencies for production runtime
RUN npm prune --production

# ----------------------------------------------------
# Stage 2: Minimal Production Image
FROM node:20-alpine AS runner

WORKDIR /app

# Environment defaults
ENV NODE_ENV=production
ENV PORT=8080

# Install OpenSSL for Prisma engine compatibility on Alpine
RUN apk add --no-cache openssl libc6-compat

# Create non-root user for security
RUN addgroup -S nodejs -g 1001 && adduser -S nodejs -u 1001

# Copy production artifacts from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma

# Switch to non-root user
USER nodejs

# Cloud Run dynamic port exposure
EXPOSE 8080

# Start production server
CMD ["node", "dist/server.js"]

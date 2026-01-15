# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (ci for reproducible builds)
RUN npm ci

# Stage 2: Builder
FROM node:22-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# Stage 3: Runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 dashboard

# Copy built application
COPY --from=builder --chown=dashboard:nodejs /app/dist ./dist
COPY --from=builder --chown=dashboard:nodejs /app/package.json ./package.json

USER dashboard

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "dist/server/server.js"]

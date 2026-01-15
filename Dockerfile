# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY workers/favicon/package*.json ./workers/favicon/

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the frontend and functions
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine

WORKDIR /app

# Install only production dependencies + wrangler
# We need wrangler to run the local server simulation
RUN npm install -g wrangler@latest

# Copy built assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/functions ./functions
COPY --from=builder /app/workers ./workers
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/wrangler.toml ./wrangler.toml
COPY --from=builder /app/scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh

# Install dependencies for the runtime (if any specific ones are needed outside of bundled code)
# In this case, we rely on global wrangler, but let's ensure we have local deps if referenced
COPY --from=builder /app/node_modules ./node_modules

# Create directory for persistent data
RUN mkdir -p /data/state

# Expose ports
EXPOSE 8799
EXPOSE 8787

# Environment variables with defaults
ENV NAV_PAGES_PORT=8799
ENV NAV_FAVICON_PORT=8787
ENV NODE_ENV=production

# Make entrypoint executable
RUN chmod +x ./scripts/docker-entrypoint.sh

ENTRYPOINT ["./scripts/docker-entrypoint.sh"]

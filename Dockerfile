# Multi-stage build for optimized image size
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
# Skip prepare script to avoid issues
RUN npm ci --ignore-scripts

# Copy source files
COPY src ./src
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies (skip prepare script)
RUN npm ci --only=production --ignore-scripts

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy necessary documentation
COPY README.md LICENSE ./

# Set environment variable placeholder
ENV PDFMONKEY_API_KEY=""

# Make the executable accessible
RUN chmod +x /app/dist/index.js

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose no ports (MCP uses stdio)
# The server communicates via stdin/stdout

# Run the MCP server
CMD ["node", "/app/dist/index.js"]

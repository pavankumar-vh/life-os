# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Copy source code
COPY . .

# Build the TypeScript project
RUN npm run build

# Install ONLY production dependencies for the final image
RUN npm ci --omit=dev

# Stage 2: Production
FROM node:22-alpine AS runner

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production
ENV PORT=4000

# Create a non-root user for security
RUN addgroup -S lifeos && adduser -S lifeos -G lifeos

# Copy only the compiled dist and production node_modules from builder
COPY --from=builder --chown=lifeos:lifeos /app/dist ./dist
COPY --from=builder --chown=lifeos:lifeos /app/node_modules ./node_modules
COPY --from=builder --chown=lifeos:lifeos /app/package.json ./

# Ensure bin scripts are executable if they exist
COPY --from=builder --chown=lifeos:lifeos /app/bin ./bin
RUN chmod +x ./bin/* || true

USER lifeos

EXPOSE 4000

CMD ["npm", "start"]

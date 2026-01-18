# Use lightweight Node.js Alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production mode)
RUN npm ci --only=production

# Copy application code
COPY . .

# Change ownership to the 'node' user (UID 1000) which exists by default in this image
RUN chown -R node:node /app

# Switch to non-root 'node' user
USER node

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/ || exit 1

# Start application
CMD ["npm", "start"]

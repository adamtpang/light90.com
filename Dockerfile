FROM node:18-alpine

# Set the main application directory
WORKDIR /app

# Copy package files first for better caching
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production --no-audit --no-fund

# Copy the rest of the backend code
COPY backend/ ./

# Set environment variables
ENV PORT=5000
ENV NODE_ENV=production

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S backend -u 1001
USER backend

# Expose the port
EXPOSE 5000

# Start the app
CMD ["npm", "start"]
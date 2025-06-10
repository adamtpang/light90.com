FROM node:18-alpine

WORKDIR /usr/src/app

# Copy backend package files
COPY backend/package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy backend source code
COPY backend/ ./

# Set environment
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Start application
CMD ["node", "index.js"]
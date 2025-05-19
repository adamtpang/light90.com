FROM node:18-alpine

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY backend/package*.json ./backend/

# Install backend dependencies
WORKDIR /app/backend
RUN npm ci --only=production

# Copy the backend code
COPY backend/ ./

# Set environment variables
ENV PORT=5000
ENV NODE_ENV=production

# Expose the port
EXPOSE 5000

# Start the app
CMD ["npm", "start"]
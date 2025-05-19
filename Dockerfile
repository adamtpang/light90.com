FROM node:18-alpine

# Set the main application directory
WORKDIR /app

# Copy only the package files for the backend to a dedicated 'backend' subdirectory in the image
COPY backend/package*.json ./backend/

# Explicitly set the working directory to where package files are for npm ci
WORKDIR /app/backend

# Run npm ci. This should now correctly execute in /app/backend
RUN npm ci --only=production

# Now, copy the rest of the backend application code.
# Source: 'backend/' directory from your repository's root (build context).
# Destination: '.' which is the current WORKDIR (/app/backend in the image).
COPY backend/ .

# Set environment variables
ENV PORT=5000
ENV NODE_ENV=production

# Expose the port
EXPOSE 5000

# Start the app
CMD ["npm", "start"]
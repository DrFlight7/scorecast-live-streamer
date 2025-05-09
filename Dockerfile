
FROM node:20-alpine

# Install FFmpeg with all required dependencies
RUN apk add --no-cache ffmpeg curl

# Set the working directory
WORKDIR /app

# Print FFmpeg version for logging during build
RUN ffmpeg -version

# Copy package files first for caching
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy all other files
COPY . .

# Set NODE_ENV to production
ENV NODE_ENV=production

# Build the application
RUN npm run build

# Add express-cors dependency
RUN npm install express-cors

# Install production-only diagnostic tools
RUN npm install --no-save pino pino-pretty

# Expose the port - Railway will set PORT env var
EXPOSE ${PORT:-3000}

# Start with proper binding to 0.0.0.0
CMD ["node", "server.js"]

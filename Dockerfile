
FROM node:20-alpine

# Install FFmpeg with all required dependencies
RUN apk add --no-cache ffmpeg curl

# Set the working directory
WORKDIR /app

# Print FFmpeg version for logging during build
RUN ffmpeg -version

# Copy package files first for caching
COPY package*.json ./

# Install ALL dependencies (including dev dependencies needed for build)
RUN npm ci

# Copy all other files
COPY . .

# Build the application
RUN npm run build

# Clean up dev dependencies to make the image smaller
RUN npm prune --production

# Install express-cors dependency
RUN npm install express-cors

# Install production-only diagnostic tools
RUN npm install --no-save pino pino-pretty

# Expose the port - Railway will set PORT env var
EXPOSE ${PORT:-3000}

# Start with proper binding to 0.0.0.0
CMD ["node", "server.js"]

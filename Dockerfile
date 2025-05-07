# Use official Node.js 20 Alpine (lightweight)
FROM node:20-alpine

# Install FFmpeg and dependencies
RUN apk add --no-cache ffmpeg

# Set working directory
WORKDIR /app

# Copy package files first (better caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all other project files
COPY . .

# Build (if you have a build step)
RUN npm run build

# Expose port (match your app's port, e.g., 3000)
EXPOSE 3000

# Run your app
CMD ["node", "server.js"]  # Replace with your entry file
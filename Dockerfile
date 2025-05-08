
FROM node:20-alpine

# Install FFmpeg with all required dependencies
RUN apk add --no-cache ffmpeg

# Set the working directory
WORKDIR /app

# Print FFmpeg version for logging during build
RUN ffmpeg -version

# Copy package files first for caching
COPY package*.json ./

RUN npm install

# Copy all other files
COPY . .

# Set NODE_ENV to production
ENV NODE_ENV=production

# Build if needed
RUN npm run build

# Expose the port
EXPOSE 3000

# Use node to run our server.js
CMD ["node", "server.js"]

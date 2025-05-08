
FROM node:20-alpine

# Install FFmpeg
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copy package files first for caching
COPY package*.json ./

RUN npm install

# Copy all other files
COPY . .

# Build if needed
RUN npm run build

EXPOSE 3000

# Use serve to serve static files
CMD ["npx", "serve", "-s", "dist"]

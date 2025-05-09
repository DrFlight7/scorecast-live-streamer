
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import cors from 'express-cors';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use PORT env var from Railway or fallback to 8080
const PORT = process.env.PORT || 8080;

const app = express();

// Add CORS support with more permissive configuration
app.use(cors({
  allowedOrigins: ['*'],
  headers: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Additional CORS headers for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  next();
});

// Middleware to parse JSON
app.use(express.json());

// Explicit OPTIONS handler for preflight requests
app.options('*', (req, res) => {
  res.sendStatus(200);
});

// Health check endpoint with improved headers
app.get('/health', (req, res) => {
  // Check if FFmpeg is available
  let ffmpegAvailable = false;
  let ffmpegVersion = null;
  let ffmpegPath = null;
  let error = null;
  
  try {
    // Use system-wide ffmpeg command (we know it's installed from our Dockerfile/nixpacks)
    ffmpegPath = 'ffmpeg';
    console.log(`Attempting to check FFmpeg at: ${ffmpegPath}`);
    
    const output = execSync(`${ffmpegPath} -version`).toString();
    ffmpegAvailable = true;
    ffmpegVersion = output.split('\n')[0];
    console.log(`FFmpeg check succeeded: ${ffmpegVersion}`);
  } catch (err) {
    error = err.message;
    console.error('FFmpeg check failed:', err.message);
  }
  
  // Add detailed environment info
  const envInfo = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: PORT,
    PATH: process.env.PATH,
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    workingDirectory: process.cwd()
  };
  
  // Send response - always use status 200 with health details in body
  // This helps with detection across different environments
  res.status(200).json({
    status: ffmpegAvailable ? 'ok' : 'error',
    message: ffmpegAvailable ? 'Server is running' : 'FFmpeg not available',
    timestamp: new Date().toISOString(),
    ffmpegAvailable,
    ffmpegVersion,
    ffmpegPath,
    error,
    environment: envInfo,
    activeStreams: 0,
    connectedClients: 0,
    serverVersion: '1.0.4' // Increment version for tracking
  });
});

// Add simple text response for tools that don't parse JSON
app.get('/health-plain', (req, res) => {
  try {
    // Use system-wide ffmpeg command
    const output = execSync('ffmpeg -version').toString();
    res.status(200).send('OK: FFmpeg available');
  } catch (err) {
    res.status(200).send('ERROR: FFmpeg not available');
  }
});

// Add FFmpeg-specific check endpoint
app.get('/ffmpeg-check', (req, res) => {
  try {
    // Use system ffmpeg in production
    const ffmpegPath = 'ffmpeg';
    const output = execSync(`${ffmpegPath} -version`).toString();
    
    res.status(200).json({
      ffmpegAvailable: true,
      version: output.split('\n')[0],
      path: ffmpegPath,
      environment: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        platform: process.platform,
        arch: process.arch,
        PORT: PORT
      }
    });
  } catch (err) {
    console.error('FFmpeg check failed:', err.message);
    res.status(200).json({
      ffmpegAvailable: false,
      error: err.message,
      environment: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        platform: process.platform,
        arch: process.arch,
        PORT: PORT
      }
    });
  }
});

// Add a root endpoint for basic connectivity testing
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Railway FFmpeg Server is running',
    endpoints: {
      health: '/health',
      healthPlain: '/health-plain',
      ffmpegCheck: '/ffmpeg-check',
      stream: '/stream'
    },
    timestamp: new Date().toISOString()
  });
});

// Add a ping endpoint that doesn't require JSON parsing
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// Handle WebSocket connections or redirects for /stream
app.get('/stream', (req, res) => {
  // If not WebSocket request, return helpful error
  res.status(400).json({
    error: "WebSocket connection required for this endpoint",
    message: "This endpoint requires a WebSocket connection, not HTTP"
  });
});

// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, 'dist')));

// For any request that doesn't match a static file, send the index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  
  // Test FFmpeg on startup and log the result
  try {
    // Use system ffmpeg command 
    const ffmpegPath = 'ffmpeg';
    const output = execSync(`${ffmpegPath} -version`).toString();
    console.log(`FFmpeg is available: ${output.split('\n')[0]}`);
  } catch (err) {
    console.error('FFmpeg is not available:', err.message);
  }
});

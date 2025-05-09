
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

// FFmpeg check function - returns promise for async usage
const checkFFmpeg = async () => {
  try {
    // Try multiple FFmpeg paths
    const ffmpegPath = 'ffmpeg';
    console.log(`Checking FFmpeg at system path: ${ffmpegPath}`);
    const output = execSync(`${ffmpegPath} -version`).toString();
    console.log(`FFmpeg check succeeded: ${output.split('\n')[0]}`);
    return {
      available: true,
      version: output.split('\n')[0],
      path: ffmpegPath,
      error: null
    };
  } catch (err) {
    console.error('FFmpeg check failed:', err.message);
    return {
      available: false,
      version: null,
      path: null,
      error: err.message
    };
  }
};

// Health check endpoint that always returns 200 with status in body
app.get('/health', async (req, res) => {
  const ffmpegStatus = await checkFFmpeg();
  
  // Always return 200 with health details in body
  // This helps with detection across different environments
  res.status(200).json({
    status: ffmpegStatus.available ? 'ok' : 'warning',
    message: ffmpegStatus.available ? 'Server is running with FFmpeg available' : 'Server is running but FFmpeg is not available',
    timestamp: new Date().toISOString(),
    ffmpegAvailable: ffmpegStatus.available,
    ffmpegVersion: ffmpegStatus.version,
    ffmpegPath: ffmpegStatus.path,
    error: ffmpegStatus.error,
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: PORT,
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version
    },
    activeStreams: 0,
    connectedClients: 0
  });
});

// Add plain text health check - very minimal response for basic checks
app.get('/health-plain', async (req, res) => {
  const ffmpegStatus = await checkFFmpeg();
  res.status(200).send(ffmpegStatus.available ? 'OK: FFmpeg available' : 'WARNING: FFmpeg not available');
});

// Add ping endpoint that doesn't require JSON parsing
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// FFmpeg specific check endpoint
app.get('/ffmpeg-check', async (req, res) => {
  const ffmpegStatus = await checkFFmpeg();
  
  res.status(200).json({
    ffmpegAvailable: ffmpegStatus.available,
    version: ffmpegStatus.version,
    path: ffmpegStatus.path,
    error: ffmpegStatus.error,
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'development',
      platform: process.platform,
      arch: process.arch,
      PORT: PORT
    }
  });
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
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Test FFmpeg on startup and log the result
  try {
    const ffmpegStatus = await checkFFmpeg();
    if (ffmpegStatus.available) {
      console.log(`FFmpeg is available: ${ffmpegStatus.version}`);
    } else {
      console.error('FFmpeg is not available:', ffmpegStatus.error);
    }
  } catch (err) {
    console.error('Error checking FFmpeg status:', err.message);
  }
});

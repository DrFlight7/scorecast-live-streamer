
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  // Check if FFmpeg is available
  let ffmpegAvailable = false;
  let ffmpegVersion = null;
  let ffmpegPath = null;
  let error = null;
  
  try {
    // Determine FFmpeg path based on environment
    ffmpegPath = process.env.NODE_ENV === 'production' ? 'ffmpeg' : './ffmpeg/ffmpeg';
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
    PATH: process.env.PATH,
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    workingDirectory: process.cwd()
  };
  
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ffmpegAvailable,
    ffmpegVersion,
    ffmpegPath,
    error,
    environment: envInfo,
    activeStreams: 0,
    connectedClients: 0
  });
});

// Add FFmpeg-specific check endpoint
app.get('/ffmpeg-check', (req, res) => {
  try {
    const ffmpegPath = process.env.NODE_ENV === 'production' ? 'ffmpeg' : './ffmpeg/ffmpeg';
    const output = execSync(`${ffmpegPath} -version`).toString();
    
    res.status(200).json({
      ffmpegAvailable: true,
      version: output.split('\n')[0],
      path: ffmpegPath,
      environment: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        platform: process.platform,
        arch: process.arch
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
        arch: process.arch
      }
    });
  }
});

// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, 'dist')));

// For any request that doesn't match a static file, send the index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Test FFmpeg on startup and log the result
  try {
    const ffmpegPath = process.env.NODE_ENV === 'production' ? 'ffmpeg' : './ffmpeg/ffmpeg';
    const output = execSync(`${ffmpegPath} -version`).toString();
    console.log(`FFmpeg is available: ${output.split('\n')[0]}`);
  } catch (err) {
    console.error('FFmpeg is not available:', err.message);
  }
});

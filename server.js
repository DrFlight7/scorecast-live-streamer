
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
  
  try {
    // Use installed FFmpeg in production or local path in development
    const ffmpegPath = process.env.NODE_ENV === 'production' ? 'ffmpeg' : './ffmpeg/ffmpeg';
    const output = execSync(`${ffmpegPath} -version`).toString();
    ffmpegAvailable = true;
    ffmpegVersion = output.split('\n')[0];
  } catch (err) {
    console.error('FFmpeg check failed:', err.message);
  }
  
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ffmpegAvailable,
    ffmpegVersion,
    environment: process.env.NODE_ENV || 'development',
    activeStreams: 0,
    connectedClients: 0
  });
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
});

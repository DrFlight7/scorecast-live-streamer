
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StreamProcess {
  process: Deno.Process | null;
  key: string;
  startTime: number;
}

// Store active streaming processes
const activeStreams = new Map<string, StreamProcess>();

// Function to clean up FFmpeg processes
const cleanupProcess = (socketId: string) => {
  const stream = activeStreams.get(socketId);
  if (stream?.process) {
    try {
      console.log(`Closing FFmpeg process for socket ${socketId}`);
      stream.process.kill("SIGTERM");
      stream.process.close();
    } catch (err) {
      console.error("Error closing FFmpeg process:", err);
    }
  }
  activeStreams.delete(socketId);
};

// Create a temp file for the given socket
const createTempFile = (socketId: string): string => {
  // In a production environment, this would create a real temp file
  // For this simulation, we'll just return a path
  return `/tmp/stream-${socketId}.webm`;
};

// Start FFmpeg process for a socket
const startFFmpegProcess = (socketId: string, streamKey: string, inputPath: string): boolean => {
  try {
    console.log(`Starting FFmpeg process for socket ${socketId} with stream key ${streamKey.substring(0, 5)}...`);
    
    // In a production environment, we would start a real FFmpeg process like this:
    /*
    const process = Deno.run({
      cmd: [
        "ffmpeg",
        "-re",
        "-i", inputPath,
        "-c:v", "libx264", 
        "-preset", "veryfast",
        "-maxrate", "3000k",
        "-bufsize", "6000k",
        "-c:a", "aac",
        "-b:a", "160k",
        "-ar", "44100",
        "-f", "flv",
        `rtmp://live-api-s.facebook.com:443/rtmp/${streamKey}`
      ],
      stdout: "piped",
      stderr: "piped"
    });
    */
    
    // For now, we'll simulate the process
    console.log(`FFmpeg would convert ${inputPath} and stream to Facebook with key ${streamKey.substring(0, 5)}...`);
    
    // Save the "process" in our active streams map
    activeStreams.set(socketId, {
      process: null, // would be the real process in production
      key: streamKey,
      startTime: Date.now()
    });
    
    return true;
  } catch (err) {
    console.error("Error starting FFmpeg process:", err);
    return false;
  }
};

// Track connected WebSockets
const sockets = new Map<string, WebSocket>();

// Get server stats for health checks
const getServerStats = () => {
  return {
    status: "ok",
    healthy: true,
    uptime: process.uptime ? process.uptime() : null,
    activeStreams: activeStreams.size,
    connectedClients: sockets.size,
    timestamp: new Date().toISOString()
  };
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Health check endpoint
  const url = new URL(req.url);
  if (url.pathname === '/health' || url.pathname === '/') {
    console.log('Health check request received');
    return new Response(
      JSON.stringify(getServerStats()),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }

  // Check for WebSocket upgrade request
  const upgradeHeader = req.headers.get("upgrade") || "";
  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response(JSON.stringify({ 
      error: "This endpoint requires a WebSocket connection or use /health for status checks" 
    }), { 
      status: 400, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  try {
    // Create a WebSocket connection
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    // Generate a unique socket ID
    const socketId = crypto.randomUUID();
    sockets.set(socketId, socket);
    
    console.log(`WebSocket connection established: ${socketId}`);
    
    // Handle WebSocket events
    socket.onopen = () => {
      console.log("WebSocket connection opened");
      socket.send(JSON.stringify({ 
        type: "connection", 
        status: "connected",
        message: "Connected to stream relay server" 
      }));
    };

    socket.onmessage = async (event) => {
      // Check if data is binary (Blob/ArrayBuffer)
      if (event.data instanceof Blob || event.data instanceof ArrayBuffer) {
        // Handle binary data (video/audio chunks)
        console.log(`Received binary data chunk: ${typeof event.data}, size: ${
          event.data instanceof Blob ? event.data.size : (event.data as ArrayBuffer).byteLength
        } bytes`);
        
        // Check if this socket has an active stream
        const activeStream = activeStreams.get(socketId);
        if (!activeStream) {
          console.warn(`Received binary data for socket ${socketId} but no active stream found`);
          return;
        }
        
        // In a production implementation, we would:
        // 1. Write the binary data to a stream or file
        // 2. Process with FFmpeg to convert to RTMP
        // For now we'll just simulate this
        
        // Return an acknowledgement
        socket.send(JSON.stringify({
          type: "chunk-received",
          timestamp: new Date().toISOString()
        }));
        
        return;
      }
      
      // Process text/JSON messages
      try {
        const message = JSON.parse(event.data);
        console.log("Received message type:", message.type);
        
        // Handle different message types
        switch (message.type) {
          case "stream-start":
            // Verify stream key exists
            if (!message.streamKey) {
              socket.send(JSON.stringify({
                type: "error",
                message: "No stream key provided"
              }));
              return;
            }
            
            console.log("Stream start requested with key:", message.streamKey.substring(0, 5) + "...");
            
            // Create temporary file path for this socket
            const tempFilePath = createTempFile(socketId);
            
            // Start FFmpeg process
            const started = startFFmpegProcess(socketId, message.streamKey, tempFilePath);
            
            if (started) {
              // Simulate successful stream start
              setTimeout(() => {
                socket.send(JSON.stringify({
                  type: "stream-status",
                  status: "live",
                  message: "Stream is now live on Facebook"
                }));
              }, 2000);
            } else {
              socket.send(JSON.stringify({
                type: "error",
                message: "Failed to start streaming process"
              }));
            }
            
            break;
            
          case "stream-stop":
            console.log("Stream stop requested");
            
            // Clean up FFmpeg process
            cleanupProcess(socketId);
            
            // Simulate stream stop
            setTimeout(() => {
              socket.send(JSON.stringify({
                type: "stream-status",
                status: "stopped",
                message: "Stream has been stopped"
              }));
            }, 1000);
            
            break;
            
          case "ping":
            // Keep-alive ping
            socket.send(JSON.stringify({
              type: "pong",
              timestamp: new Date().toISOString()
            }));
            break;
            
          default:
            console.log("Unknown message type:", message.type);
            socket.send(JSON.stringify({
              type: "error",
              message: "Unknown message type"
            }));
        }
      } catch (err) {
        console.error("Error processing message:", err);
        socket.send(JSON.stringify({
          type: "error",
          message: "Failed to process message"
        }));
      }
    };

    socket.onerror = (e) => {
      console.error("WebSocket error:", e);
      cleanupProcess(socketId);
      sockets.delete(socketId);
    };

    socket.onclose = () => {
      console.log(`WebSocket connection closed for socket ${socketId}`);
      cleanupProcess(socketId);
      sockets.delete(socketId);
    };

    return response;
  } catch (err) {
    console.error("Failed to upgrade connection:", err);
    return new Response(JSON.stringify({ error: "Failed to establish WebSocket connection" }), { 
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

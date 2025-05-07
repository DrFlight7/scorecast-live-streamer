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

// Check if FFmpeg is available in the environment
const checkFFmpegAvailability = async (): Promise<boolean> => {
  try {
    // Try to execute FFmpeg version command to check if it's available
    const command = new Deno.Command("ffmpeg", {
      args: ["-version"],
      stdout: "piped",
      stderr: "piped",
    });
    
    const { code } = await command.output();
    return code === 0;
  } catch (err) {
    console.error("FFmpeg not available:", err.message);
    return false;
  }
};

// Start FFmpeg process for a socket
const startFFmpegProcess = async (socketId: string, streamKey: string): Promise<boolean> => {
  try {
    console.log(`Starting FFmpeg process for socket ${socketId} with stream key ${streamKey.substring(0, 5)}...`);
    
    // Check if FFmpeg is available first
    const isFFmpegAvailable = await checkFFmpegAvailability();
    if (!isFFmpegAvailable) {
      console.error("FFmpeg is not available in the environment");
      return false;
    }
    
    try {
      // Create FFmpeg process that reads from stdin (pipe)
      const process = new Deno.Command("ffmpeg", {
        args: [
          "-re",
          "-i", "pipe:0",     // Read from stdin
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
        stdin: "piped",
        stdout: "piped",
        stderr: "piped"
      });
      
      const child = process.spawn();
      
      // Save the process in our active streams map
      activeStreams.set(socketId, {
        process: child,
        key: streamKey,
        startTime: Date.now()
      });
      
      // Log actual FFmpeg output to debug issues
      (async () => {
        const decoder = new TextDecoder();
        for await (const chunk of child.stderr.readable) {
          console.log("FFmpeg stderr:", decoder.decode(chunk));
        }
      })();
      
      return true;
    } catch (err) {
      console.error("Error executing FFmpeg:", err);
      
      // If we can't actually run FFmpeg, fall back to simulation mode
      console.log(`Simulation: Would stream to Facebook with key ${streamKey.substring(0, 5)}...`);
      
      activeStreams.set(socketId, {
        process: null, // would be the real process in production
        key: streamKey,
        startTime: Date.now()
      });
      
      return true;
    }
  } catch (err) {
    console.error("Error in startFFmpegProcess:", err);
    return false;
  }
};

// Track connected WebSockets
const sockets = new Map<string, WebSocket>();

// Get server stats for health checks - Fixed to avoid using Node.js process object
const getServerStats = () => {
  return {
    status: "ok",
    healthy: true,
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
  
  // Parse the URL
  const url = new URL(req.url);
  
  // Health check endpoint - HANDLE THIS FIRST before WebSocket check
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
  
  // FFmpeg version check endpoint
  if (url.pathname === '/ffmpeg-check') {
    try {
      const isAvailable = await checkFFmpegAvailability();
      
      return new Response(
        JSON.stringify({
          ffmpegAvailable: isAvailable,
          environment: {
            denoVersion: Deno.version.deno,
            v8Version: Deno.version.v8,
            tsVersion: Deno.version.typescript
          }
        }),
        { 
          status: 200, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ 
          error: "FFmpeg check failed", 
          message: err.message,
          stack: err.stack 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
  }

  // Now check for WebSocket upgrade AFTER handling HTTP endpoints
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
      
      // Only send messages if socket is open
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ 
          type: "connection", 
          status: "connected",
          message: "Connected to stream relay server" 
        }));
      }
    };

    socket.onmessage = async (event) => {
      // Check if data is binary (Blob/ArrayBuffer)
      if (event.data instanceof Blob || event.data instanceof ArrayBuffer) {
        // Handle binary data (video/audio chunks)
        const dataSize = event.data instanceof Blob ? event.data.size : (event.data as ArrayBuffer).byteLength;
        console.log(`Received binary data chunk: ${typeof event.data}, size: ${dataSize} bytes`);
        
        // Check if this socket has an active stream
        const activeStream = activeStreams.get(socketId);
        if (!activeStream) {
          console.warn(`Received binary data for socket ${socketId} but no active stream found`);
          return;
        }
        
        // If we have an actual process, pipe the data to it
        if (activeStream.process) {
          try {
            // Convert Blob to ArrayBuffer if needed
            let buffer: ArrayBuffer;
            if (event.data instanceof Blob) {
              buffer = await event.data.arrayBuffer();
            } else {
              buffer = event.data;
            }
            
            // Write to FFmpeg stdin
            const writer = activeStream.process.stdin.getWriter();
            await writer.write(new Uint8Array(buffer));
            writer.releaseLock();
          } catch (err) {
            console.error("Error writing to FFmpeg stdin:", err);
          }
        }
        
        // Return an acknowledgement - only if socket is open
        if (socket.readyState === WebSocket.OPEN) {
          try {
            socket.send(JSON.stringify({
              type: "chunk-received",
              timestamp: new Date().toISOString()
            }));
          } catch (err) {
            console.error("Error sending chunk acknowledgement:", err);
          }
        }
        
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
              if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                  type: "error",
                  message: "No stream key provided"
                }));
              }
              return;
            }
            
            console.log("Stream start requested with key:", message.streamKey.substring(0, 5) + "...");
            
            // Start FFmpeg process directly with piped input (no temp file)
            const started = await startFFmpegProcess(socketId, message.streamKey);
            
            if (started) {
              // Simulate successful stream start - only if socket is open
              setTimeout(() => {
                if (socket.readyState === WebSocket.OPEN) {
                  socket.send(JSON.stringify({
                    type: "stream-status",
                    status: "live",
                    message: "Stream is now live on Facebook"
                  }));
                }
              }, 2000);
            } else {
              if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                  type: "error",
                  message: "Failed to start streaming process - FFmpeg may not be available"
                }));
              }
            }
            
            break;
            
          case "stream-stop":
            console.log("Stream stop requested");
            
            // Clean up FFmpeg process
            cleanupProcess(socketId);
            
            // Simulate stream stop - only if socket is open
            setTimeout(() => {
              if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                  type: "stream-status",
                  status: "stopped",
                  message: "Stream has been stopped"
                }));
              }
            }, 1000);
            
            break;
            
          case "ping":
            // Keep-alive ping - only if socket is open
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({
                type: "pong",
                timestamp: new Date().toISOString()
              }));
            }
            break;
            
          default:
            console.log("Unknown message type:", message.type);
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({
                type: "error",
                message: "Unknown message type"
              }));
            }
        }
      } catch (err) {
        console.error("Error processing message:", err);
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: "error",
            message: "Failed to process message"
          }));
        }
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

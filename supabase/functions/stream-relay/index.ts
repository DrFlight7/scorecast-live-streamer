import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check for WebSocket upgrade request
  const upgradeHeader = req.headers.get("upgrade") || "";
  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response(JSON.stringify({ 
      error: "This endpoint requires a WebSocket connection" 
    }), { 
      status: 400, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  try {
    // Create a WebSocket connection
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    console.log("WebSocket connection established");
    
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
      try {
        // Parse the incoming message
        const message = JSON.parse(event.data);
        console.log("Received message type:", message.type);
        
        // Handle different message types
        switch (message.type) {
          case "stream-start":
            // In a full implementation, this would initialize an FFmpeg process
            // to start relaying the stream to Facebook
            console.log("Stream start requested with key:", message.streamKey.substring(0, 5) + "...");
            
            // Simulate stream start
            setTimeout(() => {
              socket.send(JSON.stringify({
                type: "stream-status",
                status: "live",
                message: "Stream is now live on Facebook"
              }));
            }, 2000);
            
            break;
            
          case "stream-stop":
            // In a full implementation, this would terminate the FFmpeg process
            console.log("Stream stop requested");
            
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
    };

    socket.onclose = () => {
      console.log("WebSocket connection closed");
      // In a full implementation, this would clean up any FFmpeg processes
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

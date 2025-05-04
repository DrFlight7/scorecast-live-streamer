
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

export interface StreamRelayOptions {
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  wsEndpoint?: string;
}

export interface StreamRelayState {
  isConnected: boolean;
  isStreaming: boolean;
  status: 'idle' | 'connecting' | 'connected' | 'streaming' | 'error' | 'disconnected';
  error: string | null;
  stats: {
    bytesSent: number;
    dataChunks: number;
    startTime: number | null;
    duration: number;
    ffmpegStatus?: string;
    streamHealth?: 'excellent' | 'good' | 'fair' | 'poor';
  };
}

export interface StreamRelayControls {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  startStream: (streamKey: string) => Promise<boolean>;
  stopStream: () => Promise<boolean>;
  sendBinaryData: (data: Blob) => void;
  checkServerStatus: () => Promise<boolean>;
}

// Endpoint for the Railway FFmpeg server
const DEFAULT_RELAY_ENDPOINT = 'wss://scorecast-live-streamer-production.up.railway.app/stream';

export const useStreamRelay = (options: StreamRelayOptions = {}): [StreamRelayState, StreamRelayControls] => {
  const {
    autoReconnect = true,
    maxReconnectAttempts = 5,
    reconnectInterval = 5000,
    wsEndpoint = DEFAULT_RELAY_ENDPOINT,
  } = options;

  const [state, setState] = useState<StreamRelayState>({
    isConnected: false,
    isStreaming: false,
    status: 'idle',
    error: null,
    stats: {
      bytesSent: 0,
      dataChunks: 0,
      startTime: null,
      duration: 0,
      ffmpegStatus: undefined,
      streamHealth: undefined
    }
  });

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const streamKeyRef = useRef<string | null>(null);
  const statsTimerRef = useRef<number | null>(null);
  const heartbeatTimerRef = useRef<number | null>(null);
  const lastPingTimeRef = useRef<number | null>(null);

  // CleanUp function to handle socket closing
  const cleanUp = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.onopen = null;
      socketRef.current.onclose = null;
      socketRef.current.onerror = null;
      socketRef.current.onmessage = null;

      if (socketRef.current.readyState === WebSocket.OPEN || 
          socketRef.current.readyState === WebSocket.CONNECTING) {
        socketRef.current.close();
      }
      
      socketRef.current = null;
    }
    
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (statsTimerRef.current) {
      clearInterval(statsTimerRef.current);
      statsTimerRef.current = null;
    }
    
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  // Function to update stats during streaming
  const updateStats = useCallback(() => {
    if (state.isStreaming && state.stats.startTime) {
      setState(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          duration: Math.floor((Date.now() - prev.stats.startTime!) / 1000)
        }
      }));
    }
  }, [state.isStreaming, state.stats.startTime]);

  // Function to send a ping and measure latency
  const sendHeartbeat = useCallback(() => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    
    try {
      lastPingTimeRef.current = Date.now();
      socketRef.current.send(JSON.stringify({
        type: 'ping',
        timestamp: lastPingTimeRef.current
      }));
    } catch (err) {
      console.error('Error sending heartbeat:', err);
    }
  }, []);

  // Function to stop streaming
  const stopStream = useCallback(async (): Promise<boolean> => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }

    return new Promise((resolve) => {
      try {
        if (!socketRef.current) {
          resolve(false);
          return;
        }
        
        socketRef.current.send(JSON.stringify({
          type: 'stream-stop',
        }));
        
        // In a real implementation, we would wait for confirmation
        // For now, we'll resolve immediately and let the message handler update the state
        streamKeyRef.current = null;
        resolve(true);
      } catch (err) {
        console.error('Error stopping stream:', err);
        resolve(false);
      }
    });
  }, []);

  // Function to check if the Railway FFmpeg server is available
  const checkServerStatus = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // Send a request to the health endpoint
      const response = await fetch('https://scorecast-live-streamer-production.up.railway.app/health', {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Server status check response:', data);
        return true;
      }
      
      // If /health fails, try the root path as fallback
      if (response.status === 404) {
        const rootResponse = await fetch('https://scorecast-live-streamer-production.up.railway.app/', {
          signal: controller.signal
        });
        
        if (rootResponse.ok) {
          return true;
        }
      }
      
      return false;
    } catch (err) {
      console.error('Error checking server status:', err);
      return false;
    }
  }, []);

  // Function to connect to the WebSocket server
  const connect = useCallback(async (): Promise<boolean> => {
    cleanUp();
    setState(prev => ({ ...prev, status: 'connecting', error: null }));

    try {
      console.log('Connecting to Railway WebSocket server:', wsEndpoint);
      const socket = new WebSocket(wsEndpoint);
      socketRef.current = socket;

      return new Promise((resolve) => {
        socket.onopen = () => {
          console.log('WebSocket connection to Railway server established');
          setState(prev => ({ 
            ...prev, 
            isConnected: true, 
            status: 'connected',
            error: null 
          }));
          reconnectAttemptsRef.current = 0;
          
          // Start heartbeat to keep connection alive and measure latency
          heartbeatTimerRef.current = setInterval(() => {
            sendHeartbeat();
          }, 15000) as unknown as number;
          
          resolve(true);
        };

        socket.onclose = (event) => {
          console.log('Railway WebSocket connection closed:', event);
          const wasConnected = state.isConnected;
          
          setState(prev => ({ 
            ...prev, 
            isConnected: false, 
            isStreaming: false,
            status: 'disconnected',
          }));

          if (statsTimerRef.current) {
            clearInterval(statsTimerRef.current);
            statsTimerRef.current = null;
          }
          
          if (heartbeatTimerRef.current) {
            clearInterval(heartbeatTimerRef.current);
            heartbeatTimerRef.current = null;
          }

          if (wasConnected) {
            toast.error("Stream connection lost", {
              description: "The connection to the streaming server was lost"
            });
          }

          // Attempt to reconnect if enabled
          if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current += 1;
            
            toast.info(`Reconnecting (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
            
            reconnectTimerRef.current = setTimeout(() => {
              connect();
            }, reconnectInterval) as unknown as number;
          } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
            setState(prev => ({ 
              ...prev, 
              error: `Failed to reconnect after ${maxReconnectAttempts} attempts` 
            }));
            
            toast.error("Reconnect failed", {
              description: `Could not reconnect to the streaming server after ${maxReconnectAttempts} attempts`
            });
            
            resolve(false);
          }
        };

        socket.onerror = (error) => {
          console.error('Railway WebSocket error:', error);
          setState(prev => ({ 
            ...prev, 
            error: 'Connection error with Railway streaming server' 
          }));
          resolve(false);
        };

        socket.onmessage = (event) => {
          try {
            // Handle text messages (control messages)
            if (typeof event.data === 'string') {
              const data = JSON.parse(event.data);
              console.log('Railway WebSocket message received:', data);
              
              // Handle different message types
              switch (data.type) {
                case 'connection':
                  if (data.status === 'connected') {
                    toast.success("Connected to Railway streaming server");
                  }
                  break;
                  
                case 'stream-status':
                  if (data.status === 'live') {
                    setState(prev => ({ 
                      ...prev, 
                      isStreaming: true, 
                      status: 'streaming',
                      stats: {
                        ...prev.stats,
                        startTime: Date.now(),
                        duration: 0,
                        ffmpegStatus: data.ffmpegStatus || 'active',
                        streamHealth: data.streamHealth || 'good'
                      }
                    }));
                    
                    // Start stats update timer
                    statsTimerRef.current = setInterval(updateStats, 1000) as unknown as number;
                    
                    toast.success("Stream started", { 
                      description: "Your Facebook stream is now live" 
                    });
                  } else if (data.status === 'stopped') {
                    setState(prev => ({ 
                      ...prev, 
                      isStreaming: false, 
                      status: 'connected',
                      stats: {
                        ...prev.stats,
                        startTime: null,
                        duration: 0,
                        ffmpegStatus: undefined,
                        streamHealth: undefined
                      }
                    }));
                    
                    if (statsTimerRef.current) {
                      clearInterval(statsTimerRef.current);
                      statsTimerRef.current = null;
                    }
                    
                    toast.info("Stream ended", { 
                      description: "Your Facebook stream has been stopped" 
                    });
                  }
                  break;
                  
                case 'ffmpeg-status':
                  // Update FFmpeg status from Railway server
                  setState(prev => ({
                    ...prev,
                    stats: {
                      ...prev.stats,
                      ffmpegStatus: data.status,
                      streamHealth: data.health
                    }
                  }));
                  break;
                  
                case 'pong':
                  if (lastPingTimeRef.current) {
                    const latency = Date.now() - lastPingTimeRef.current;
                    console.log(`Railway server latency: ${latency}ms`);
                    lastPingTimeRef.current = null;
                  }
                  break;
                  
                case 'error':
                  toast.error("Streaming error", { 
                    description: data.message || "An unknown error occurred with the Railway streaming server" 
                  });
                  break;
              }
            } 
            // Handle binary messages (acknowledgements or other binary data)
            else {
              console.log('Received binary data from Railway server');
            }
          } catch (err) {
            console.error('Error parsing Railway WebSocket message:', err);
          }
        };
      });
    } catch (err) {
      console.error('Failed to connect to Railway WebSocket server:', err);
      setState(prev => ({ 
        ...prev, 
        status: 'error',
        error: 'Failed to connect to Railway streaming server' 
      }));
      return false;
    }
  }, [cleanUp, autoReconnect, maxReconnectAttempts, reconnectInterval, state.isConnected, updateStats, wsEndpoint, sendHeartbeat]);

  // Function to disconnect from the WebSocket server
  const disconnect = useCallback(() => {
    if (state.isStreaming) {
      stopStream();
    }
    
    setState(prev => ({ ...prev, status: 'disconnected' }));
    cleanUp();
  }, [cleanUp, state.isStreaming, stopStream]);

  // Function to start streaming
  const startStream = useCallback(async (streamKey: string): Promise<boolean> => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      const connected = await connect();
      if (!connected) return false;
    }

    return new Promise((resolve) => {
      try {
        if (!socketRef.current) {
          toast.error("Connection error", { 
            description: "Not connected to Railway streaming server" 
          });
          resolve(false);
          return;
        }
        
        streamKeyRef.current = streamKey;
        
        socketRef.current.send(JSON.stringify({
          type: 'stream-start',
          streamKey: streamKey,
          platform: 'facebook',
          quality: 'high' // Can be configurable from UI later
        }));
        
        // Reset stats
        setState(prev => ({
          ...prev,
          stats: {
            bytesSent: 0,
            dataChunks: 0,
            startTime: null,
            duration: 0,
            ffmpegStatus: 'starting',
            streamHealth: undefined
          }
        }));
        
        toast.info("Starting Facebook Live stream via Railway...");
        resolve(true);
      } catch (err) {
        console.error('Error starting stream:', err);
        toast.error("Failed to start stream", {
          description: err instanceof Error ? err.message : "Unknown error with Railway server"
        });
        resolve(false);
      }
    });
  }, [connect]);

  // Function to send binary data through the WebSocket
  const sendBinaryData = useCallback((data: Blob) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN || !state.isStreaming) {
      console.warn('Cannot send data: Railway socket is not open or not streaming');
      return;
    }

    try {
      socketRef.current.send(data);
      
      // Update stats
      setState(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          bytesSent: prev.stats.bytesSent + data.size,
          dataChunks: prev.stats.dataChunks + 1
        }
      }));
    } catch (err) {
      console.error('Error sending binary data to Railway:', err);
    }
  }, [state.isStreaming]);

  // Clean up on unmount
  useEffect(() => {
    return cleanUp;
  }, [cleanUp]);

  // Automatic server status check on mount
  useEffect(() => {
    const checkStatus = async () => {
      const isAvailable = await checkServerStatus();
      if (!isAvailable) {
        console.warn('Railway streaming server appears to be offline');
        setState(prev => ({ 
          ...prev, 
          error: 'Railway streaming server appears to be offline' 
        }));
      }
    };
    
    checkStatus();
  }, [checkServerStatus]);

  return [
    state,
    { connect, disconnect, startStream, stopStream, sendBinaryData, checkServerStatus }
  ];
};

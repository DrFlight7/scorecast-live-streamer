import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { checkServerHealth } from '@/utils/serverHealthCheck';

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

// Expanded list of potential Railway WebSocket Endpoints
const RAILWAY_SERVER_ENDPOINTS = [
  'wss://scorecast-live-streamer-production.up.railway.app/stream',
  'wss://scorecast-live-streamer-production.railway.app/stream',
  'wss://scorecast-live-production.up.railway.app/stream',
  'wss://scorecast-live-production.railway.app/stream',
  'wss://scorecast-live-streamer.railway.app/stream'
];

export const useStreamRelay = (options: StreamRelayOptions = {}): [StreamRelayState, StreamRelayControls] => {
  const {
    autoReconnect = true,
    maxReconnectAttempts = 5,
    reconnectInterval = 5000,
    wsEndpoint = RAILWAY_SERVER_ENDPOINTS[0],
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
  const discoveredWsEndpointRef = useRef<string | null>(null);

  // Debug logging helper
  const logDebug = (message: string, ...args: any[]) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] StreamRelay: ${message}`, ...args);
  };

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

  // Function to check if the Railway FFmpeg server is available using the improved serverHealthCheck
  const checkServerStatus = useCallback(async (): Promise<boolean> => {
    try {
      logDebug('Checking Railway server status using serverHealthCheck');
      
      // Use the improved serverHealthCheck utility
      const healthResult = await checkServerHealth();
      
      // Update discovered WebSocket endpoint if we found a working server
      if (healthResult.status === 'online' && healthResult.serverUrl) {
        try {
          // Convert the HTTP URL to a WebSocket URL
          const serverUrl = new URL(healthResult.serverUrl);
          const wsProtocol = serverUrl.protocol === 'https:' ? 'wss:' : 'ws:';
          // Keep the same hostname and port, but use /stream path
          const wsUrl = `${wsProtocol}//${serverUrl.host}/stream`;
          
          logDebug(`Discovered WebSocket endpoint: ${wsUrl}`);
          discoveredWsEndpointRef.current = wsUrl;
        } catch (err) {
          logDebug('Error constructing WebSocket URL:', err);
        }
      }
      
      return healthResult.status === 'online' && healthResult.ffmpegStatus === 'available';
    } catch (err) {
      logDebug('Error checking server status:', err);
      return false;
    }
  }, []);

  // Function to connect to the WebSocket server
  const connect = useCallback(async (): Promise<boolean> => {
    cleanUp();
    setState(prev => ({ ...prev, status: 'connecting', error: null }));

    try {
      // First check if the server is available via HTTP
      const isAvailable = await checkServerStatus();
      
      if (!isAvailable) {
        console.error('Railway server is not available');
        setState(prev => ({ 
          ...prev, 
          status: 'error',
          error: 'Railway streaming server appears to be offline' 
        }));
        toast.error("Railway server offline", {
          description: "The Railway streaming server appears to be offline. Please check the deployment."
        });
        return false;
      }
      
      // Use discovered endpoint if available
      const endpointsToTry = discoveredWsEndpointRef.current ? 
        [discoveredWsEndpointRef.current, ...RAILWAY_SERVER_ENDPOINTS] : 
        RAILWAY_SERVER_ENDPOINTS;
      
      // Try all possible WebSocket endpoints in order
      for (const endpoint of endpointsToTry) {
        logDebug(`Attempting WebSocket connection to: ${endpoint}`);
        
        try {
          const socket = new WebSocket(endpoint);
          socketRef.current = socket;
          
          return await new Promise<boolean>((resolve) => {
            const timeoutId = setTimeout(() => {
              if (socketRef.current === socket) {
                socket.close();
                logDebug(`WebSocket connection to ${endpoint} timed out`);
                resolve(false);
              }
            }, 8000); // Increased timeout for slower connections
            
            socket.onopen = () => {
              clearTimeout(timeoutId);
              logDebug(`WebSocket connection to ${endpoint} established`);
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
            
            socket.onerror = (event) => {
              clearTimeout(timeoutId);
              logDebug(`WebSocket connection to ${endpoint} failed:`, event);
              if (socketRef.current === socket) {
                socketRef.current = null;
              }
              resolve(false);
            };
            
            // Rest of WebSocket event handlers
            socket.onclose = (event) => {
              logDebug(`Railway WebSocket connection to ${endpoint} closed:`, event);
              const wasConnected = state.isConnected;
              
              if (socketRef.current === socket) {
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
                }
                
                socketRef.current = null;
              }
            };
            
            socket.onmessage = (event) => {
              try {
                // Handle text messages (control messages)
                if (typeof event.data === 'string') {
                  const data = JSON.parse(event.data);
                  logDebug('Railway WebSocket message received:', data);
                  
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
                        logDebug(`Railway server latency: ${latency}ms`);
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
                  logDebug('Received binary data from Railway server');
                }
              } catch (err) {
                console.error('Error parsing Railway WebSocket message:', err);
              }
            };
          });
        } catch (err) {
          logDebug(`Failed to connect to WebSocket endpoint ${endpoint}:`, err);
        }
      }
      
      // If we reach here, all connection attempts failed
      setState(prev => ({ 
        ...prev, 
        status: 'error',
        error: 'Failed to connect to any Railway streaming server endpoint' 
      }));
      return false;
      
    } catch (err) {
      console.error('Failed to connect to Railway WebSocket server:', err);
      setState(prev => ({ 
        ...prev, 
        status: 'error',
        error: 'Failed to connect to Railway streaming server' 
      }));
      return false;
    }
  }, [cleanUp, autoReconnect, maxReconnectAttempts, reconnectInterval, state.isConnected, updateStats, sendHeartbeat, checkServerStatus]);

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
      logDebug('Performing initial server status check');
      const isAvailable = await checkServerStatus();
      if (!isAvailable) {
        logDebug('Railway streaming server appears to be offline');
        setState(prev => ({ 
          ...prev, 
          error: 'Railway streaming server appears to be offline' 
        }));
      } else {
        logDebug('Railway streaming server is available');
        setState(prev => ({
          ...prev,
          error: null
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

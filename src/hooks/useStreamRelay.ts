import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

export interface StreamRelayOptions {
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
}

export interface StreamRelayState {
  isConnected: boolean;
  isStreaming: boolean;
  status: 'idle' | 'connecting' | 'connected' | 'streaming' | 'error' | 'disconnected';
  error: string | null;
}

export interface StreamRelayControls {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  startStream: (streamKey: string) => Promise<boolean>;
  stopStream: () => Promise<boolean>;
}

export const useStreamRelay = (options: StreamRelayOptions = {}): [StreamRelayState, StreamRelayControls] => {
  const {
    autoReconnect = true,
    maxReconnectAttempts = 5,
    reconnectInterval = 5000,
  } = options;

  const [state, setState] = useState<StreamRelayState>({
    isConnected: false,
    isStreaming: false,
    status: 'idle',
    error: null,
  });

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const streamKeyRef = useRef<string | null>(null);

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
  }, []);

  // Function to connect to the WebSocket server
  const connect = useCallback(async (): Promise<boolean> => {
    cleanUp();
    setState(prev => ({ ...prev, status: 'connecting', error: null }));

    try {
      // In production, this would use the deployed Edge Function URL
      const wsUrl = `wss://owvyvalwbbyrbzxlwjeq.supabase.co/functions/v1/stream-relay`;
      
      console.log('Connecting to WebSocket server:', wsUrl);
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      return new Promise((resolve) => {
        socket.onopen = () => {
          console.log('WebSocket connection established');
          setState(prev => ({ 
            ...prev, 
            isConnected: true, 
            status: 'connected',
            error: null 
          }));
          reconnectAttemptsRef.current = 0;
          resolve(true);
        };

        socket.onclose = (event) => {
          console.log('WebSocket connection closed:', event);
          const wasConnected = state.isConnected;
          
          setState(prev => ({ 
            ...prev, 
            isConnected: false, 
            isStreaming: false,
            status: 'disconnected',
          }));

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
          console.error('WebSocket error:', error);
          setState(prev => ({ 
            ...prev, 
            error: 'Connection error' 
          }));
          resolve(false);
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message received:', data);
            
            // Handle different message types
            switch (data.type) {
              case 'connection':
                if (data.status === 'connected') {
                  // Send a ping every 30 seconds to keep the connection alive
                  setInterval(() => {
                    if (socketRef.current?.readyState === WebSocket.OPEN) {
                      socketRef.current.send(JSON.stringify({ type: 'ping' }));
                    }
                  }, 30000);
                }
                break;
                
              case 'stream-status':
                if (data.status === 'live') {
                  setState(prev => ({ ...prev, isStreaming: true, status: 'streaming' }));
                  toast.success("Stream started", { 
                    description: "Your Facebook stream is now live" 
                  });
                } else if (data.status === 'stopped') {
                  setState(prev => ({ ...prev, isStreaming: false, status: 'connected' }));
                  toast.info("Stream ended", { 
                    description: "Your Facebook stream has been stopped" 
                  });
                }
                break;
                
              case 'error':
                toast.error("Streaming error", { 
                  description: data.message || "An unknown error occurred" 
                });
                break;
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        };
      });
    } catch (err) {
      console.error('Failed to connect to WebSocket server:', err);
      setState(prev => ({ 
        ...prev, 
        status: 'error',
        error: 'Failed to connect to streaming server' 
      }));
      return false;
    }
  }, [cleanUp, autoReconnect, maxReconnectAttempts, reconnectInterval, state.isConnected]);

  // Function to disconnect from the WebSocket server
  const disconnect = useCallback(() => {
    if (state.isStreaming) {
      stopStream();
    }
    
    setState(prev => ({ ...prev, status: 'disconnected' }));
    cleanUp();
  }, [cleanUp, state.isStreaming]);

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
            description: "Not connected to streaming server" 
          });
          resolve(false);
          return;
        }
        
        streamKeyRef.current = streamKey;
        
        socketRef.current.send(JSON.stringify({
          type: 'stream-start',
          streamKey: streamKey,
        }));
        
        // In a real implementation, we would wait for confirmation
        // For now, we'll resolve immediately and let the message handler update the state
        resolve(true);
      } catch (err) {
        console.error('Error starting stream:', err);
        toast.error("Failed to start stream", {
          description: err instanceof Error ? err.message : "Unknown error"
        });
        resolve(false);
      }
    });
  }, [connect]);

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

  // Clean up on unmount
  useEffect(() => {
    return cleanUp;
  }, [cleanUp]);

  return [
    state,
    { connect, disconnect, startStream, stopStream }
  ];
};

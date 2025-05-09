
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Server, RefreshCw, Check, X, Activity } from 'lucide-react';

interface StreamingServerStatusProps {
  serverUrl: string;
}

const StreamingServerStatus = ({ serverUrl }: StreamingServerStatusProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'unknown'>('unknown');
  const [ffmpegStatus, setFfmpegStatus] = useState<'available' | 'unavailable' | 'unknown'>('unknown');
  const [stats, setStats] = useState<{
    activeStreams?: number;
    connectedClients?: number;
    timestamp?: string;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const [detailedInfo, setDetailedInfo] = useState<any>(null);

  // List of possible server endpoints (ordered by priority)
  const SERVER_ENDPOINTS = [
    'https://scorecast-live-streamer-production.up.railway.app',
    'wss://scorecast-live-streamer-production.up.railway.app/stream',
    'https://scorecast-live-streamer-production.railway.app',
    'wss://scorecast-live-streamer-production.railway.app/stream'
  ];

  // The actual Railway endpoint might have changed or might be using a different domain
  // Let's try to determine the correct endpoint
  const determineCorrectEndpoints = () => {
    const endpoints = [...SERVER_ENDPOINTS];
    
    // Add user-provided URL if it's not already in the list
    if (serverUrl && !endpoints.includes(serverUrl)) {
      if (serverUrl.startsWith('wss://')) {
        // Add both WebSocket and HTTP versions
        endpoints.unshift(serverUrl);
        endpoints.unshift(serverUrl.replace('wss://', 'https://').replace('/stream', ''));
      } else if (serverUrl.startsWith('https://')) {
        // Add both HTTP and WebSocket versions
        endpoints.unshift(serverUrl);
        if (!serverUrl.endsWith('/stream')) {
          endpoints.unshift(`${serverUrl}/stream`.replace('https://', 'wss://'));
        }
      }
    }
    
    return endpoints.map(endpoint => {
      if (endpoint.startsWith('wss://')) {
        return endpoint.replace('wss://', 'https://').replace('/stream', '/health');
      }
      return endpoint.endsWith('/') ? `${endpoint}health` : `${endpoint}/health`;
    });
  };

  const checkServerStatus = async () => {
    setIsLoading(true);
    setError(null);

    // Get all potential health check endpoints
    const healthEndpoints = determineCorrectEndpoints();

    console.log('Attempting to connect to Railway server using endpoints:', healthEndpoints);
    
    let connected = false;
    
    // Try each endpoint until one works
    for (const endpoint of healthEndpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(endpoint, {
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          // Add random parameter to bypass cache
          cache: 'no-cache'
        });
        
        clearTimeout(timeoutId);
        console.log(`Response from ${endpoint}:`, response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Server status check response:', data);
          
          setServerStatus('online');
          setStats({
            activeStreams: data.activeStreams,
            connectedClients: data.connectedClients,
            timestamp: data.timestamp
          });
          
          // Check FFmpeg availability from the response
          if (data.ffmpegAvailable !== undefined) {
            setFfmpegStatus(data.ffmpegAvailable ? 'available' : 'unavailable');
            setDetailedInfo(data);
            
            if (!data.ffmpegAvailable && data.error) {
              setError(`FFmpeg is not available: ${data.error}`);
            }
          }
          
          connected = true;
          break;
        } else if (response.status === 400) {
          // Try to parse response to see if it's the WebSocket error (which means server is up)
          try {
            const errorData = await response.json();
            if (errorData.error?.includes("WebSocket")) {
              console.log('Server is running but requires WebSocket connections');
              setServerStatus('online');
              
              // Try the ffmpeg-check endpoint separately
              await checkFFmpegStatus(endpoint.replace('/health', ''));
              
              connected = true;
              break;
            }
          } catch (e) {
            console.log('Error parsing 400 response:', e);
          }
        }
      } catch (err) {
        console.error(`Error checking endpoint ${endpoint}:`, err);
      }
    }
    
    if (!connected) {
      // Try one more time with just the root endpoint for each server
      const rootEndpoints = SERVER_ENDPOINTS.map(endpoint => {
        if (endpoint.startsWith('wss://')) {
          return endpoint.replace('wss://', 'https://').replace('/stream', '');
        }
        return endpoint;
      });
      
      for (const endpoint of rootEndpoints) {
        try {
          console.log(`Trying root endpoint: ${endpoint}`);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const response = await fetch(endpoint, {
            signal: controller.signal,
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
              'Accept': 'application/json'
            },
            cache: 'no-cache'
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            console.log(`Root endpoint ${endpoint} is responding`);
            setServerStatus('online');
            connected = true;
            
            // Try the ffmpeg-check endpoint separately
            await checkFFmpegStatus(endpoint);
            break;
          }
        } catch (err) {
          console.error(`Error checking root endpoint ${endpoint}:`, err);
        }
      }
    }
    
    if (!connected) {
      console.error('All connection attempts failed');
      setServerStatus('offline');
      setError('Could not connect to any Railway server endpoint. The server may be down or the URL may be incorrect.');
    }
    
    setIsLoading(false);
  };

  const checkFFmpegStatus = async (endpoint: string) => {
    try {
      // Normalize the endpoint
      let ffmpegCheckEndpoint = endpoint;
      if (ffmpegCheckEndpoint.endsWith('/health')) {
        ffmpegCheckEndpoint = ffmpegCheckEndpoint.replace('/health', '/ffmpeg-check');
      } else if (!ffmpegCheckEndpoint.endsWith('/')) {
        ffmpegCheckEndpoint = `${ffmpegCheckEndpoint}/ffmpeg-check`;
      } else {
        ffmpegCheckEndpoint = `${ffmpegCheckEndpoint}ffmpeg-check`;
      }
      
      console.log(`Checking FFmpeg at ${ffmpegCheckEndpoint}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(ffmpegCheckEndpoint, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Accept': 'application/json'
        },
        cache: 'no-cache'
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const ffmpegData = await response.json();
        console.log('FFmpeg check response:', ffmpegData);
        
        setFfmpegStatus(ffmpegData.ffmpegAvailable ? 'available' : 'unavailable');
        setDetailedInfo(ffmpegData);
        
        if (!ffmpegData.ffmpegAvailable) {
          setError('FFmpeg is not available on the server. Streaming may not work properly.');
        }
      } else {
        setFfmpegStatus('unknown');
      }
    } catch (err) {
      console.error('Error checking FFmpeg status:', err);
      setFfmpegStatus('unknown');
    }
  };

  useEffect(() => {
    checkServerStatus();
    
    // Add periodic check every 30 seconds
    const interval = setInterval(() => {
      checkServerStatus();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'Unknown';
    
    try {
      return new Date(timestamp).toLocaleString();
    } catch (err) {
      return timestamp;
    }
  };

  return (
    <div className="space-y-4 p-4 bg-black/20 rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Railway FFmpeg Server Status</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 rounded-full"
          onClick={checkServerStatus}
          disabled={isLoading}
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {error && (
        <Alert className="bg-red-900/50 border-red-500">
          <AlertDescription className="text-red-200">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-black/30 p-4 rounded-lg">
          <div className="flex items-center mb-2">
            <Server size={16} className="text-white/70 mr-2" />
            <span className="text-sm text-white font-medium">Server Status</span>
          </div>
          
          <div className="flex items-center">
            <div className={`h-2 w-2 rounded-full mr-2 ${
              serverStatus === 'online' ? 'bg-green-500' : 
              serverStatus === 'offline' ? 'bg-red-500' : 
              'bg-yellow-500'
            }`}></div>
            <span className="text-sm text-white">
              {isLoading ? 'Checking...' : 
               serverStatus === 'online' ? 'Online' : 
               serverStatus === 'offline' ? 'Offline' : 
               'Unknown'}
            </span>
          </div>
          
          {serverStatus === 'online' && (
            <div className="mt-2 text-xs text-white/60">
              <p>Last updated: {formatTimestamp(stats.timestamp)}</p>
              <p>Active streams: {stats.activeStreams || 0}</p>
              <p>Connected clients: {stats.connectedClients || 0}</p>
            </div>
          )}
        </div>
        
        <div className="bg-black/30 p-4 rounded-lg">
          <div className="flex items-center mb-2">
            <Activity size={16} className="text-white/70 mr-2" />
            <span className="text-sm text-white font-medium">FFmpeg Status</span>
          </div>
          
          <div className="flex items-center">
            {isLoading ? (
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
            ) : ffmpegStatus === 'available' ? (
              <Check size={16} className="text-green-500 mr-2" />
            ) : ffmpegStatus === 'unavailable' ? (
              <X size={16} className="text-red-500 mr-2" />
            ) : (
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
            )}
            
            <span className="text-sm text-white">
              {isLoading ? 'Checking...' : 
               ffmpegStatus === 'available' ? 'Available' : 
               ffmpegStatus === 'unavailable' ? 'Not Available' : 
               'Unknown'}
            </span>
          </div>
          
          <div className="mt-2 text-xs">
            {ffmpegStatus === 'available' ? (
              <span className="text-green-400">Ready for streaming</span>
            ) : ffmpegStatus === 'unavailable' ? (
              <span className="text-red-400">FFmpeg not available - streaming will not work</span>
            ) : (
              <span className="text-yellow-400">Could not determine FFmpeg status</span>
            )}
          </div>
        </div>
      </div>
      
      <div className="text-xs text-white/60 mt-2">
        {serverStatus === 'online' ? (
          <p>The Railway server is online and {ffmpegStatus === 'available' ? 'ready' : 'not ready'} to process streams.</p>
        ) : (
          <p>The Railway server appears to be offline. Please check your deployment.</p>
        )}
      </div>
      
      {detailedInfo && (
        <div className="mt-4 p-3 bg-black/40 rounded-md text-xs text-white/70 border border-white/10">
          <p className="font-semibold mb-1">Environment Info:</p>
          <pre className="overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(detailedInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default StreamingServerStatus;

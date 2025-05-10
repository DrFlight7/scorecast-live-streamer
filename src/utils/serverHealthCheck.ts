interface FFmpegStatus {
  available: boolean;
  version?: string | null;
  path?: string | null;
  error?: string | null;
}

interface ServerHealthStatus {
  status: 'online' | 'offline' | 'unknown';
  ffmpegStatus: 'available' | 'unavailable' | 'unknown';
  timestamp?: string;
  activeStreams?: number;
  connectedClients?: number;
  detailedInfo?: any;
  serverUrl?: string;
}

// Enhanced list of possible server endpoints (ordered by priority)
// Including Railway's dynamic domain patterns
export const SERVER_ENDPOINTS = [
  // Railway production URLs
  'https://scorecast-live-streamer-production.up.railway.app',
  'https://scorecast-live-streamer-production-production.up.railway.app',
  
  // Railway preview/staging URLs
  'https://scorecast-live-streamer-staging.up.railway.app',
  'https://scorecast-live-streamer-preview.up.railway.app',
  
  // Other known Railway URL patterns
  'https://scorecast-live-production.up.railway.app',
  'https://scorecast-live-production-production.up.railway.app',
  'https://scorecast-live-streamer.railway.app',
  'https://scorecast-live-streamer-production.railway.app',
  'https://scorecast-live.railway.app',
  
  // Railway domains (different format)
  'https://scorecast-live-streamer-production.railway.internal',
  'https://scorecast-live-streamer.railway.internal',
  
  // Development URLs
  'http://localhost:8080',
  'http://localhost:3000',
  
  // IPv4 localhost
  'http://127.0.0.1:8080',
  'http://127.0.0.1:3000'
];

// Helper function to log with timestamps for debugging
const logDebug = (message: string, ...args: any[]) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ServerHealth: ${message}`, ...args);
};

export async function checkServerHealth(serverUrl?: string): Promise<ServerHealthStatus> {
  // Start with unknown status
  const result: ServerHealthStatus = {
    status: 'unknown',
    ffmpegStatus: 'unknown',
  };

  // Log the start of the health check
  logDebug(`Starting server health check${serverUrl ? ` for ${serverUrl}` : ''}`);
  
  // Generate list of possible URLs to check
  const endpoints = generateEndpoints(serverUrl);
  
  // Try each endpoint until one works
  for (const endpoint of endpoints) {
    try {
      logDebug(`Trying endpoint: ${endpoint}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // Increased timeout
      
      const timestamp = new Date().getTime();
      const response = await fetch(`${endpoint}?nocache=${timestamp}`, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          // Accept multiple content types to be more flexible
          'Accept': 'application/json, text/plain, */*'
        },
        // Prevent browsers from caching the response
        cache: 'no-store',
        // Credentials: 'omit' to avoid CORS preflight
        credentials: 'omit',
        // Add mode: 'cors' to explicitly request CORS
        mode: 'cors'
      });
      
      clearTimeout(timeoutId);
      logDebug(`Response from ${endpoint}: ${response.status}`);
      
      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        
        // Check if the response is JSON
        if (contentType.includes('application/json')) {
          try {
            const data = await response.json();
            logDebug('Server health check JSON response:', data);
            
            // Save the working endpoint URL to result
            result.serverUrl = endpoint;
            
            // Update status based on the response
            result.status = 'online';
            result.timestamp = data.timestamp;
            result.activeStreams = data.activeStreams || 0;
            result.connectedClients = data.connectedClients || 0;
            
            // Check FFmpeg status from response
            if (data.ffmpegAvailable !== undefined) {
              result.ffmpegStatus = data.ffmpegAvailable ? 'available' : 'unavailable';
              result.detailedInfo = data;
            } else {
              // Default to available if server is up but no ffmpeg info
              result.ffmpegStatus = 'available';
            }
            
            return result;
          } catch (e) {
            // JSON parsing error - try as text
            logDebug(`JSON parsing error for ${endpoint}:`, e);
          }
        }
        
        // If not JSON or JSON parsing failed, try as text
        try {
          const text = await response.text();
          logDebug('Server health check text response:', text);
          
          // Save the working endpoint URL
          result.serverUrl = endpoint;
          
          // If text contains indicators of a healthy server
          if (text.includes('OK') || text.includes('online') || 
              text.includes('available') || text.includes('running')) {
            result.status = 'online';
            result.ffmpegStatus = 'available';
            return result;
          } else if (text.includes('pong')) {
            // Basic ping response
            result.status = 'online';
            result.ffmpegStatus = 'unknown'; // Need to check FFmpeg separately
            await checkFFmpegStatus(endpoint.replace('/ping', ''), result);
            return result;
          }
        } catch (e) {
          logDebug(`Text parsing error for ${endpoint}:`, e);
        }
        
        // If we got here with a 200 status, the server is at least online
        result.status = 'online';
        result.serverUrl = endpoint;
        await checkFFmpegStatus(endpoint, result);
        return result;
      } else if (response.status === 400 || response.status === 404) {
        // Try to check if this is the WebSocket endpoint error
        try {
          const errorData = await response.json();
          if (errorData.error?.includes("WebSocket")) {
            logDebug('Server is running but requires WebSocket connections');
            result.status = 'online';
            result.serverUrl = endpoint;
            await checkFFmpegStatus(endpoint.replace('/stream', ''), result);
            return result;
          }
        } catch (e) {
          logDebug('Error parsing response:', e);
        }
      }
    } catch (err) {
      // Log connection errors but continue trying other endpoints
      logDebug(`Error checking endpoint ${endpoint}:`, err);
    }
  }

  // If we get here, none of the endpoints worked
  logDebug('All endpoints failed, server appears to be offline');
  result.status = 'offline';
  return result;
}

async function checkFFmpegStatus(baseEndpoint: string, result: ServerHealthStatus): Promise<void> {
  try {
    // Normalize the endpoint
    let ffmpegCheckEndpoint = baseEndpoint;
    if (ffmpegCheckEndpoint.endsWith('/health')) {
      ffmpegCheckEndpoint = ffmpegCheckEndpoint.replace('/health', '/ffmpeg-check');
    } else if (ffmpegCheckEndpoint.endsWith('/ping')) {
      ffmpegCheckEndpoint = ffmpegCheckEndpoint.replace('/ping', '/ffmpeg-check');
    } else if (!ffmpegCheckEndpoint.endsWith('/')) {
      ffmpegCheckEndpoint = `${ffmpegCheckEndpoint}/ffmpeg-check`;
    } else {
      ffmpegCheckEndpoint = `${ffmpegCheckEndpoint}ffmpeg-check`;
    }
    
    logDebug(`Checking FFmpeg at ${ffmpegCheckEndpoint}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const timestamp = new Date().getTime();
    const response = await fetch(`${ffmpegCheckEndpoint}?nocache=${timestamp}`, {
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache',
        'Accept': 'application/json, text/plain, */*'
      },
      cache: 'no-store'
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      // Check content type
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        try {
          const ffmpegData = await response.json();
          logDebug('FFmpeg check JSON response:', ffmpegData);
          
          result.ffmpegStatus = ffmpegData.ffmpegAvailable ? 'available' : 'unavailable';
          result.detailedInfo = ffmpegData;
        } catch (e) {
          logDebug('FFmpeg check JSON parsing error:', e);
          // If response can't be parsed as JSON but status is OK, assume FFmpeg is available
          result.ffmpegStatus = 'available';
        }
      } else {
        // Try parsing as text
        try {
          const text = await response.text();
          logDebug('FFmpeg check text response:', text);
          
          // Check if the text contains indicators of FFmpeg availability
          if (text.includes('available') || text.includes('OK') || 
              text.includes('ffmpeg') || text.includes('version')) {
            result.ffmpegStatus = 'available';
          } else {
            result.ffmpegStatus = 'unavailable';
          }
        } catch (e) {
          logDebug('FFmpeg check text parsing error:', e);
          result.ffmpegStatus = 'unknown';
        }
      }
    } else {
      // Try root endpoint as fallback
      try {
        logDebug('Using root endpoint as fallback for FFmpeg check');
        const rootEndpoint = baseEndpoint.replace(/\/(health|ping|ffmpeg-check|stream).*$/, '/');
        const rootResponse = await fetch(rootEndpoint, {
          method: 'GET',
          headers: { 
            'Accept': 'application/json, text/plain, */*',
            'Cache-Control': 'no-cache'
          },
          cache: 'no-store'
        });
        
        if (rootResponse.ok) {
          try {
            const data = await rootResponse.json();
            if (data && data.status === 'ok') {
              logDebug('Root endpoint indicates server is healthy');
              result.ffmpegStatus = 'available';
            }
          } catch (e) {
            // If server is up, likely FFmpeg is available too
            if (rootResponse.status === 200) {
              result.ffmpegStatus = 'available';
            }
          }
        }
      } catch (err) {
        logDebug('Error checking server root:', err);
        result.ffmpegStatus = 'unknown';
      }
    }
  } catch (err) {
    logDebug('Error checking FFmpeg status:', err);
    result.ffmpegStatus = 'unknown';
  }
}

function generateEndpoints(userProvidedUrl?: string): string[] {
  const endpoints: string[] = [];
  
  // Add user-provided URL first with highest priority (if provided)
  if (userProvidedUrl) {
    // Normalize user URL - remove trailing slashes
    const normalizedUrl = userProvidedUrl.replace(/\/+$/, '');
    
    // Add with various endpoints
    endpoints.push(`${normalizedUrl}/health`);
    endpoints.push(normalizedUrl); // Root endpoint
    endpoints.push(`${normalizedUrl}/health-plain`);
    endpoints.push(`${normalizedUrl}/ping`);
    endpoints.push(`${normalizedUrl}/ffmpeg-check`);
  }
  
  // Add all possible server endpoints with health check variations
  SERVER_ENDPOINTS.forEach(endpoint => {
    // Normalize endpoint - remove trailing slashes
    const normalizedEndpoint = endpoint.replace(/\/+$/, '');
    
    // Skip if it's the same as user provided
    if (userProvidedUrl && normalizedEndpoint === userProvidedUrl.replace(/\/+$/, '')) {
      return;
    }
    
    // Add all variations of endpoints
    endpoints.push(`${normalizedEndpoint}/health`);
    endpoints.push(normalizedEndpoint); // Root endpoint
    endpoints.push(`${normalizedEndpoint}/health-plain`);
    endpoints.push(`${normalizedEndpoint}/ping`);
    endpoints.push(`${normalizedEndpoint}/ffmpeg-check`);
  });
  
  // Add dynamic discovery for Railway URLs
  // Try to find the current Railway domain by inspecting window.location
  if (typeof window !== 'undefined' && window.location) {
    try {
      const currentHost = window.location.host;
      // If we're on a Railway domain
      if (currentHost.includes('railway.app') || 
          currentHost.includes('railway.internal')) {
        // Add all variations for this domain
        const railwayBaseUrl = `${window.location.protocol}//${currentHost}`;
        
        // Add to the beginning of the list for highest priority
        endpoints.unshift(`${railwayBaseUrl}/health`);
        endpoints.unshift(railwayBaseUrl);
        endpoints.unshift(`${railwayBaseUrl}/health-plain`);
        endpoints.unshift(`${railwayBaseUrl}/ping`);
        
        logDebug(`Added current Railway domain to endpoints: ${railwayBaseUrl}`);
      }
    } catch (e) {
      logDebug('Error accessing window.location:', e);
    }
  }
  
  return endpoints;
}

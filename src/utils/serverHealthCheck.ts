
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
}

// List of possible server endpoints (ordered by priority)
export const SERVER_ENDPOINTS = [
  'https://scorecast-live-streamer-production.up.railway.app',
  'https://scorecast-live-streamer-production-production.up.railway.app',
  'https://scorecast-live-production.up.railway.app',
  'https://scorecast-live-production-production.up.railway.app',
  'https://scorecast-live-streamer.railway.app',
  'https://scorecast-live-streamer-production.railway.app',
  'https://scorecast-live.railway.app',
  // Add current Railway URL pattern - latest from deployment
  'https://scorecast-live-streamer-production.railway.app'
];

export async function checkServerHealth(serverUrl?: string): Promise<ServerHealthStatus> {
  // Start with unknown status
  const result: ServerHealthStatus = {
    status: 'unknown',
    ffmpegStatus: 'unknown',
  };

  // Generate list of possible URLs to check
  const endpoints = generateEndpoints(serverUrl);
  
  // Try each endpoint until one works
  for (const endpoint of endpoints) {
    try {
      console.log(`Trying endpoint: ${endpoint}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const timestamp = new Date().getTime();
      const response = await fetch(`${endpoint}?nocache=${timestamp}`, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      console.log(`Response from ${endpoint}:`, response.status);
      
      if (response.ok) {
        try {
          // Try to parse JSON response
          const data = await response.json();
          console.log('Server health check response:', data);
          
          // Update status
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
          // Non-JSON response but status is OK
          console.log('Server response is not JSON but status is OK');
          result.status = 'online';
          result.ffmpegStatus = 'available'; // Assume available
          return result;
        }
      } else if (response.status === 400 || response.status === 404) {
        // Try to check if this is the WebSocket endpoint error
        try {
          const errorData = await response.json();
          if (errorData.error?.includes("WebSocket")) {
            console.log('Server is running but requires WebSocket connections');
            result.status = 'online';
            await checkFFmpegStatus(endpoint.replace('/health', ''), result);
            return result;
          }
        } catch (e) {
          console.log('Error parsing response:', e);
        }
      }
    } catch (err) {
      console.error(`Error checking endpoint ${endpoint}:`, err);
    }
  }

  // If we get here, none of the endpoints worked
  result.status = 'offline';
  return result;
}

async function checkFFmpegStatus(baseEndpoint: string, result: ServerHealthStatus): Promise<void> {
  try {
    // Normalize the endpoint
    let ffmpegCheckEndpoint = baseEndpoint;
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
    
    const timestamp = new Date().getTime();
    const response = await fetch(`${ffmpegCheckEndpoint}?nocache=${timestamp}`, {
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache',
        'Accept': 'application/json'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      try {
        const ffmpegData = await response.json();
        console.log('FFmpeg check response:', ffmpegData);
        
        result.ffmpegStatus = ffmpegData.ffmpegAvailable ? 'available' : 'unavailable';
        result.detailedInfo = ffmpegData;
      } catch (e) {
        // If response is not JSON but status is OK, assume FFmpeg is available
        result.ffmpegStatus = 'available';
      }
    } else {
      // Try root endpoint as fallback
      try {
        const rootResponse = await fetch(baseEndpoint, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        
        if (rootResponse.ok) {
          // If server is up, likely FFmpeg is available too
          result.ffmpegStatus = 'available';
        }
      } catch (err) {
        console.error('Error checking server root:', err);
      }
    }
  } catch (err) {
    console.error('Error checking FFmpeg status:', err);
  }
}

function generateEndpoints(userProvidedUrl?: string): string[] {
  const endpoints: string[] = [];
  
  // Add plain endpoints first (highest priority)
  SERVER_ENDPOINTS.forEach(endpoint => {
    endpoints.push(endpoint.endsWith('/') ? `${endpoint}health` : `${endpoint}/health`);
    endpoints.push(endpoint.endsWith('/') ? endpoint : `${endpoint}/`);
    endpoints.push(endpoint.endsWith('/') ? `${endpoint}health-plain` : `${endpoint}/health-plain`);
    endpoints.push(endpoint.endsWith('/') ? `${endpoint}ping` : `${endpoint}/ping`);
  });
  
  // Add user-provided URL if it exists
  if (userProvidedUrl) {
    endpoints.unshift(userProvidedUrl.endsWith('/') ? `${userProvidedUrl}health` : `${userProvidedUrl}/health`);
    endpoints.unshift(userProvidedUrl);
  }
  
  return endpoints;
}

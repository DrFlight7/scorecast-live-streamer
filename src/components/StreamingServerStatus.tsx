
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Server, RefreshCw, Check, X, Activity, Globe, AlertTriangle } from 'lucide-react';
import { checkServerHealth, SERVER_ENDPOINTS } from '@/utils/serverHealthCheck';
import { toast } from 'sonner';

interface StreamingServerStatusProps {
  serverUrl?: string;
  onStatusChange?: (status: 'online' | 'offline' | 'unknown') => void;
}

const StreamingServerStatus = ({ serverUrl, onStatusChange }: StreamingServerStatusProps) => {
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
  const [effectiveServerUrl, setEffectiveServerUrl] = useState<string>('');
  const [checkCount, setCheckCount] = useState(0);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const [userMessage, setUserMessage] = useState<string | null>(null);
  
  const logDebug = (message: string, ...args: any[]) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ServerStatus: ${message}`, ...args);
  };

  const checkStatus = async () => {
    setIsLoading(true);
    setError(null);
    setUserMessage('Checking server status...');
    setLastCheckTime(new Date());
    setCheckCount(prev => prev + 1);

    // Log the check attempt with the server URL
    logDebug('Checking server status using serverUrl:', serverUrl || 'auto-discovery');
    
    try {
      const healthStatus = await checkServerHealth(serverUrl);
      
      // Update local state
      setServerStatus(healthStatus.status);
      setFfmpegStatus(healthStatus.ffmpegStatus);
      
      if (healthStatus.detailedInfo) {
        setDetailedInfo(healthStatus.detailedInfo);
      }
      
      setStats({
        activeStreams: healthStatus.activeStreams || 0,
        connectedClients: healthStatus.connectedClients || 0,
        timestamp: healthStatus.timestamp
      });
      
      // Update effective server URL if one was found
      if (healthStatus.serverUrl) {
        setEffectiveServerUrl(healthStatus.serverUrl);
        logDebug('Server found at:', healthStatus.serverUrl);
      }
      
      // Notify parent component if provided
      if (onStatusChange) {
        onStatusChange(healthStatus.status);
      }
      
      if (healthStatus.status === 'offline') {
        setError('Could not connect to any Railway server endpoint. The server may be down or the URL may be incorrect.');
        setUserMessage('Unable to connect to Railway server. Check your internet connection and try again.');
      } else if (healthStatus.ffmpegStatus === 'unavailable') {
        setError('FFmpeg is not available on the server. Streaming may not work properly.');
        setUserMessage('FFmpeg is not available on the server. Streaming will not work properly.');
      } else if (healthStatus.status === 'online') {
        setUserMessage(null);
        
        // Show success toast on first successful connection
        if (checkCount <= 1 || serverStatus !== 'online') {
          toast.success('Connected to Railway server', {
            description: 'Server is online and ready for streaming'
          });
        }
      }
      
    } catch (err) {
      console.error('Error checking server status:', err);
      setServerStatus('offline');
      setFfmpegStatus('unknown');
      setError('Failed to check server status. Please check your internet connection and try again.');
      setUserMessage('Connection error. Please check your internet connection.');
    }
    
    setIsLoading(false);
  };

  // Initial check on mount and when serverUrl changes
  useEffect(() => {
    checkStatus();
    
    // Check status every 30 seconds
    const interval = setInterval(() => {
      checkStatus();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [serverUrl]);

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'Unknown';
    
    try {
      return new Date(timestamp).toLocaleString();
    } catch (err) {
      return timestamp;
    }
  };

  const getStatusMessage = () => {
    if (serverStatus === 'online') {
      return ffmpegStatus === 'available' 
        ? 'Railway server is online and ready to process streams.' 
        : 'Railway server is online but FFmpeg is not available. Streaming will not work.';
    }
    if (serverStatus === 'offline') {
      return 'Railway server appears to be offline. Please check your deployment.';
    }
    return 'Checking Railway server status...';
  };
  
  // Handler for manual server refresh
  const handleManualRefresh = () => {
    toast.info('Refreshing server status...');
    checkStatus();
  };

  return (
    <div className="space-y-4 p-4 bg-black/20 rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Railway FFmpeg Server Status</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 rounded-full"
          onClick={handleManualRefresh}
          disabled={isLoading}
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {userMessage && (
        <Alert className="bg-blue-900/50 border-blue-500">
          <AlertDescription className="text-blue-200 flex items-center gap-2">
            <AlertTriangle size={16} />
            {userMessage}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="bg-red-900/50 border-red-500">
          <AlertDescription className="text-red-200 flex items-center gap-2">
            <AlertTriangle size={16} />
            {error}
          </AlertDescription>
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
              {effectiveServerUrl && (
                <p className="mt-1">
                  <span className="inline-flex items-center">
                    <Globe size={12} className="mr-1" />
                    {new URL(effectiveServerUrl).hostname}
                  </span>
                </p>
              )}
            </div>
          )}
          
          {!isLoading && serverStatus !== 'online' && lastCheckTime && (
            <div className="mt-2 text-xs text-white/60">
              <p>Last check: {lastCheckTime.toLocaleString()}</p>
              <p>Check attempts: {checkCount}</p>
              <p className="text-yellow-300 mt-1">
                {checkCount > 3 ? 
                  "Multiple connection attempts have failed. The server may be down or unreachable." : 
                  "Checking connection..."
                }
              </p>
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
        <p>{getStatusMessage()}</p>
      </div>
      
      {detailedInfo && (
        <div className="mt-4 p-3 bg-black/40 rounded-md text-xs text-white/70 border border-white/10">
          <p className="font-semibold mb-1">Environment Info:</p>
          <div className="overflow-x-auto max-h-40 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(detailedInfo, null, 2)}
            </pre>
          </div>
        </div>
      )}
      
      {serverStatus === 'offline' && checkCount > 2 && (
        <Alert className="bg-yellow-900/30 border-yellow-500/50 mt-4">
          <AlertDescription className="text-yellow-200 text-xs">
            <p>Troubleshooting tips:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Check if the Railway server is deployed and running</li>
              <li>Ensure there are no CORS restrictions in your Railway deployment</li>
              <li>Try accessing the server directly at: <span className="font-mono">{SERVER_ENDPOINTS[0]}/health</span></li>
              <li>Check Railway dashboard for any deployment issues</li>
              <li>Try redeploying the server with updated CORS settings</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default StreamingServerStatus;

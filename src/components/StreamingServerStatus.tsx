
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Server, RefreshCw, Check, X, Activity } from 'lucide-react';
import { checkServerHealth, SERVER_ENDPOINTS } from '@/utils/serverHealthCheck';

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
  const [effectiveServerUrl, setEffectiveServerUrl] = useState<string>('');

  const checkStatus = async () => {
    setIsLoading(true);
    setError(null);

    console.log('Checking server status using serverUrl:', serverUrl);
    
    try {
      const healthStatus = await checkServerHealth(serverUrl);
      
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
      
      if (healthStatus.status === 'offline') {
        setError('Could not connect to any Railway server endpoint. The server may be down or the URL may be incorrect.');
      } else if (healthStatus.ffmpegStatus === 'unavailable') {
        setError('FFmpeg is not available on the server. Streaming may not work properly.');
      }
      
    } catch (err) {
      console.error('Error checking server status:', err);
      setServerStatus('offline');
      setFfmpegStatus('unknown');
      setError('Failed to check server status. Please check your internet connection and try again.');
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    checkStatus();
    
    // Check status every 15 seconds
    const interval = setInterval(() => {
      checkStatus();
    }, 15000);
    
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
    return 'Railway server appears to be offline. Please check your deployment.';
  };

  return (
    <div className="space-y-4 p-4 bg-black/20 rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Railway FFmpeg Server Status</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 rounded-full"
          onClick={checkStatus}
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
        <p>{getStatusMessage()}</p>
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

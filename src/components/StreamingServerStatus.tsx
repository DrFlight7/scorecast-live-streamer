
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Server, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

interface StreamingServerStatusProps {
  serverUrl: string;
}

const StreamingServerStatus: React.FC<StreamingServerStatusProps> = ({ serverUrl }) => {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Parse domain from URL
  const getDomain = useCallback(() => {
    try {
      const url = new URL(serverUrl);
      return url.hostname;
    } catch (e) {
      return serverUrl;
    }
  }, [serverUrl]);

  // Check server status
  const checkStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    // Start timing for latency measurement
    const startTime = performance.now();
    
    try {
      // Extract the hostname to check health endpoint
      const domain = getDomain();
      // Use https for the health check
      const healthUrl = `https://${domain}/health`;
      
      console.log(`Checking server status at: ${healthUrl}`);
      toast.info(`Checking Railway server status...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Calculate latency
      const endTime = performance.now();
      const roundTripTime = Math.round(endTime - startTime);
      setLatency(roundTripTime);
      
      if (response.ok) {
        try {
          const data = await response.json();
          console.log('Server response:', data);
          
          if (data.status === 'ok' || data.healthy === true) {
            setStatus('online');
            toast.success(`Railway streaming server is online`, {
              description: `Latency: ${roundTripTime}ms`
            });
          } else {
            setStatus('offline');
            setError(`Server returned unhealthy status: ${data.message || 'Unknown error'}`);
            toast.error(`Railway streaming server is unhealthy`, {
              description: data.message || 'Server reported unhealthy status'
            });
          }
        } catch (e) {
          // If JSON parsing fails but response was OK, still consider online
          console.warn('Could not parse server response as JSON, but status was OK');
          setStatus('online');
          toast.success(`Railway streaming server is responding`);
        }
      } else {
        setStatus('offline');
        setError(`Server returned error status: ${response.status}`);
        toast.error(`Railway server error`, {
          description: `Server returned status code ${response.status}`
        });
      }
    } catch (err: any) {
      console.error('Error checking server status:', err);
      setStatus('offline');
      setError(err.name === 'AbortError' 
        ? 'Connection timed out' 
        : `Error connecting to server: ${err.message || 'Unknown error'}`);
      
      toast.error(`Could not connect to Railway server`, {
        description: err.name === 'AbortError' 
          ? 'Connection timed out' 
          : err.message || 'Unknown error'
      });
    } finally {
      setIsLoading(false);
      setLastChecked(new Date());
    }
  }, [serverUrl, getDomain]);
  
  // Check server status on mount
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);
  
  // Get formatted last checked time
  const getFormattedLastChecked = () => {
    if (!lastChecked) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - lastChecked.getTime();
    const diffSecs = Math.round(diffMs / 1000);
    
    if (diffSecs < 60) return `${diffSecs} seconds ago`;
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)} minutes ago`;
    return `${Math.floor(diffSecs / 3600)} hours ago`;
  };
  
  // Get latency rating
  const getLatencyRating = () => {
    if (!latency) return null;
    
    if (latency < 100) return { text: 'Excellent', color: 'green-500' };
    if (latency < 300) return { text: 'Good', color: 'green-400' };
    if (latency < 600) return { text: 'Fair', color: 'yellow-500' };
    return { text: 'Poor', color: 'red-500' };
  };
  
  const latencyRating = getLatencyRating();

  return (
    <div className="bg-black/20 border border-white/10 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white flex items-center">
          <Server className="mr-2 h-5 w-5 text-white/70" />
          Railway FFmpeg Server
        </h3>
        <Button 
          variant="ghost"
          size="sm"
          className="h-8 text-white/70 hover:text-white"
          onClick={checkStatus}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-black/30 p-2 rounded">
          <div className="text-xs text-white/60">Status</div>
          <div className="flex items-center">
            {status === 'checking' ? (
              <>
                <RefreshCw className="h-4 w-4 text-blue-400 animate-spin mr-1" />
                <span className="text-sm text-white">Checking...</span>
              </>
            ) : status === 'online' ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-white">Online</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-red-500 mr-1" />
                <span className="text-sm text-white">Offline</span>
              </>
            )}
          </div>
        </div>
        
        <div className="bg-black/30 p-2 rounded">
          <div className="text-xs text-white/60">Server URL</div>
          <div className="text-sm text-white truncate" title={getDomain()}>
            {getDomain()}
          </div>
        </div>
        
        <div className="bg-black/30 p-2 rounded">
          <div className="text-xs text-white/60">Last Checked</div>
          <div className="text-sm text-white">
            {getFormattedLastChecked()}
          </div>
        </div>
        
        {latency && (
          <div className="bg-black/30 p-2 rounded">
            <div className="text-xs text-white/60">Latency</div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white">{latency}ms</span>
              <span className={`text-xs text-${latencyRating?.color}`}>
                {latencyRating?.text}
              </span>
            </div>
            <Progress 
              value={latency < 600 ? 100 - ((latency / 600) * 100) : 0} 
              className="h-1 mt-1"
              indicatorClassName={`bg-${latencyRating?.color}`}
            />
          </div>
        )}
      </div>
      
      {error && (
        <Alert variant="destructive" className="bg-red-900/50 border-red-500 mt-2">
          <AlertDescription className="text-red-200 text-xs">{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="text-xs text-white/50 text-center pt-1">
        Integration with Railway FFmpeg server for production live streaming
      </div>
    </div>
  );
};

export default StreamingServerStatus;

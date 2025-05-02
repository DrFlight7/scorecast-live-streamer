
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, StopCircle, Facebook, LinkIcon, Video, Copy, Check, RefreshCw, Settings, Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/AuthProvider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStreamRelay } from '@/hooks/useStreamRelay';
import { Progress } from '@/components/ui/progress';
import { useMediaRecorder } from '@/hooks/useMediaRecorder';

interface FacebookStreamManagerProps {
  videoElement?: React.RefObject<HTMLVideoElement>;
  mediaStream?: MediaStream | null;
  onStreamStarted?: () => void;
  onStreamStopped?: () => void;
}

const FacebookStreamManager = ({
  videoElement,
  mediaStream,
  onStreamStarted,
  onStreamStopped
}: FacebookStreamManagerProps) => {
  const { session } = useAuth();
  const [streamKey, setStreamKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [quality, setQuality] = useState('720p');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [streamTimer, setStreamTimer] = useState(0);
  const timerRef = useRef<number | null>(null);

  const [relayState, relayControls] = useStreamRelay({
    autoReconnect: true,
    maxReconnectAttempts: 5
  });
  
  // Set up media recorder if we have a media stream
  const { 
    startRecording, 
    stopRecording, 
    isRecording,
  } = useMediaRecorder({
    stream: mediaStream,
    timeslice: 1000, // 1 second chunks
    onDataAvailable: (blob) => {
      // Send video data to WebSocket server
      if (relayState.isStreaming) {
        relayControls.sendBinaryData(blob);
      }
    },
    onError: (err) => {
      toast.error("Recording error", { description: err.message });
    }
  });
  
  const rtmpUrl = 'rtmps://live-api-s.facebook.com:443/rtmp/';
  const streamKeyHintUrl = 'https://www.facebook.com/live/producer';

  // Connect to relay server on mount
  useEffect(() => {
    relayControls.connect();
    
    return () => {
      relayControls.disconnect();
    };
  }, []);
  
  // Start/stop timer when streaming status changes
  useEffect(() => {
    if (relayState.isStreaming) {
      // Start timer
      setStreamTimer(0);
      timerRef.current = setInterval(() => {
        setStreamTimer(prev => prev + 1);
      }, 1000) as unknown as number;
    } else {
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setStreamTimer(0);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [relayState.isStreaming]);
  
  // Format time for display
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const startStreaming = async () => {
    if (!streamKey.trim()) {
      toast.error("Stream key required", { 
        description: "Please enter your Facebook stream key" 
      });
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      toast.info("Setting up Facebook live stream...");
      
      // Connect to WebSocket relay server if not already connected
      if (!relayState.isConnected) {
        const connected = await relayControls.connect();
        if (!connected) {
          throw new Error("Could not connect to streaming server");
        }
      }
      
      // Start streaming via the relay server
      const started = await relayControls.startStream(streamKey);
      
      if (started) {
        // Generate a unique stream ID
        const streamId = `facebook-stream-${Date.now()}`;
        setStreamId(streamId);
        
        // Start media recorder if we have a stream
        if (mediaStream) {
          startRecording();
        }
        
        if (onStreamStarted) {
          onStreamStarted();
        }
      } else {
        throw new Error("Failed to start streaming");
      }
      
      setIsLoading(false);
    } catch (err: any) {
      console.error("Error starting Facebook stream:", err);
      setError(err.message || "Couldn't connect to Facebook Live");
      setIsLoading(false);
      
      toast.error("Streaming error", {
        description: "Could not connect to Facebook Live. " + err.message
      });
    }
  };

  const stopStreaming = async () => {
    if (!streamId) return;
    
    setIsLoading(true);
    
    try {
      toast.info("Stopping Facebook stream...");
      
      // Stop media recorder
      if (isRecording) {
        stopRecording();
      }
      
      // Stop streaming via the relay server
      await relayControls.stopStream();
      
      setStreamId(null);
      
      if (onStreamStopped) {
        onStreamStopped();
      }
      
      toast.success("Stream ended", {
        description: "Your Facebook stream has been stopped"
      });
      
      setIsLoading(false);
    } catch (err) {
      console.error("Error stopping stream:", err);
      setIsLoading(false);
      toast.error("Error", {
        description: "Could not stop the stream properly"
      });
    }
  };

  const copyRtmpUrl = () => {
    navigator.clipboard.writeText(rtmpUrl);
    setCopied(true);
    toast.success("RTMP URL copied to clipboard");
    
    setTimeout(() => setCopied(false), 2000);
  };

  // Toggle audio
  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled);
    
    // If we have a media stream, toggle audio tracks
    if (mediaStream) {
      const audioTracks = mediaStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !audioEnabled;
      });
      
      toast.info(audioEnabled ? "Audio muted" : "Audio enabled");
    }
  };

  // Computed property to determine if we're streaming
  const isStreaming = relayState.isStreaming;
  
  // Connection status indicator
  const getConnectionStatusColor = () => {
    switch (relayState.status) {
      case 'connected': return 'bg-yellow-500';
      case 'streaming': return 'bg-green-500';
      case 'connecting': return 'bg-blue-500 animate-pulse';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };
  
  const getConnectionStatusText = () => {
    switch (relayState.status) {
      case 'idle': return 'Not Connected';
      case 'connecting': return 'Connecting...';
      case 'connected': return 'Connected to Server';
      case 'streaming': return 'Live on Facebook';
      case 'error': return 'Connection Error';
      case 'disconnected': return 'Disconnected';
      default: return 'Unknown';
    }
  };

  return (
    <div className="space-y-4 p-4 bg-black/20 rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Facebook Live Streaming</h3>
        <div className="flex items-center space-x-2">
          <div className={`h-2 w-2 rounded-full ${getConnectionStatusColor()}`}></div>
          <span className="text-xs text-white/70">{getConnectionStatusText()}</span>
        </div>
      </div>
      
      {relayState.error && (
        <Alert variant="destructive" className="bg-red-900/50 border-red-500">
          <AlertDescription className="text-red-200">{relayState.error}</AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert variant="destructive" className="bg-red-900/50 border-red-500">
          <AlertDescription className="text-red-200">{error}</AlertDescription>
        </Alert>
      )}
      
      {session?.provider_token ? (
        <>
          {!isStreaming ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="rtmpUrl" className="text-white">RTMP Server URL</Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-xs text-blue-300 hover:text-blue-100"
                    onClick={copyRtmpUrl}
                  >
                    {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <Input
                  id="rtmpUrl"
                  value={rtmpUrl}
                  readOnly
                  className="bg-black/30 text-white border-white/20"
                />
                <p className="text-xs text-white/60">This is the standard Facebook Live RTMP URL</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="streamKey" className="text-white">Stream Key</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-blue-300 hover:text-blue-100"
                    onClick={() => window.open(streamKeyHintUrl, '_blank')}
                  >
                    <LinkIcon className="h-3 w-3 mr-1" />
                    Get Key
                  </Button>
                </div>
                <Input
                  id="streamKey"
                  value={streamKey}
                  onChange={(e) => setStreamKey(e.target.value)}
                  className="bg-black/30 text-white border-white/20"
                  placeholder="Your Facebook stream key"
                  type="password"
                />
                <p className="text-xs text-white/60">
                  Find your stream key in Facebook Live Producer
                </p>
              </div>
              
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-xs text-white/70 border-white/20"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  <Settings className="h-3 w-3 mr-1" />
                  {showAdvanced ? 'Hide Advanced Settings' : 'Show Advanced Settings'}
                </Button>
              </div>
              
              {showAdvanced && (
                <div className="space-y-4 p-3 bg-black/30 rounded border border-white/10">
                  <div className="space-y-2">
                    <Label htmlFor="quality" className="text-white">Stream Quality</Label>
                    <Select value={quality} onValueChange={setQuality}>
                      <SelectTrigger className="bg-black/30 text-white border-white/20">
                        <SelectValue placeholder="Select quality" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="480p">480p (SD)</SelectItem>
                        <SelectItem value="720p">720p (HD)</SelectItem>
                        <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-white/60">
                      Higher quality requires more bandwidth
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="enableAudio" className="text-white">Enable Audio</Label>
                    <Switch 
                      id="enableAudio" 
                      checked={audioEnabled}
                      onCheckedChange={toggleAudio}
                    />
                  </div>
                </div>
              )}
              
              <div className="pt-2">
                {!relayState.isConnected ? (
                  <Button
                    onClick={() => relayControls.connect()}
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <RefreshCw className={`mr-2 h-5 w-5 ${relayState.status === 'connecting' ? 'animate-spin' : ''}`} />
                    Connect to Streaming Server
                  </Button>
                ) : (
                  <Button
                    onClick={startStreaming}
                    disabled={isLoading || !streamKey}
                    className="w-full bg-[#1877F2] hover:bg-[#1877F2]/80 text-white"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    {isLoading ? "Setting up..." : "Go Live on Facebook"}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="bg-blue-900/20 p-3 rounded-md border border-blue-500/50 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-white flex items-center">
                    <span className="h-2 w-2 bg-blue-500 rounded-full animate-pulse mr-2"></span>
                    Live on Facebook
                  </p>
                  <span className="text-xs text-white/60">
                    Duration: {formatTime(streamTimer)}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-white/70">
                    <span>Status:</span>
                    <span className="text-green-400">Excellent</span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-white/70">
                      <span>Signal Strength:</span>
                      <span>85%</span>
                    </div>
                    <Progress value={85} className="h-1" />
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-white/70 border-white/20"
                      onClick={toggleAudio}
                    >
                      {audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                      {audioEnabled ? "Mute" : "Unmute"}
                    </Button>
                    
                    <div className="flex items-center space-x-1">
                      <div className="w-1 h-4 bg-green-500 animate-pulse rounded-sm"></div>
                      <div className="w-1 h-6 bg-green-500 animate-pulse rounded-sm"></div>
                      <div className="w-1 h-5 bg-green-500 animate-pulse rounded-sm"></div>
                      <div className="w-1 h-3 bg-green-500 animate-pulse rounded-sm"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <Button
                onClick={stopStreaming}
                disabled={isLoading}
                variant="destructive"
                className="w-full"
              >
                <StopCircle className="mr-2 h-5 w-5" />
                {isLoading ? "Stopping..." : "End Facebook Stream"}
              </Button>
            </>
          )}
          
          <p className="text-xs text-gray-400 mt-2">
            Note: For production use, consider using a dedicated streaming solution like OBS Studio with a Facebook RTMP link.
          </p>
        </>
      ) : (
        <div className="text-center p-4">
          <p className="text-white mb-2">Sign in with Facebook to stream</p>
          <Button 
            onClick={() => window.location.href = '/auth'}
            className="bg-[#1877F2] hover:bg-[#1877F2]/80 text-white"
          >
            <Facebook className="mr-2 h-5 w-5" />
            Sign in with Facebook
          </Button>
        </div>
      )}
    </div>
  );
};

export default FacebookStreamManager;

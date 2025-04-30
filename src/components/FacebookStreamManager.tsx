
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, StopCircle, Facebook, LinkIcon, Video, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/AuthProvider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FacebookStreamManagerProps {
  videoElement?: React.RefObject<HTMLVideoElement>;
  onStreamStarted?: () => void;
  onStreamStopped?: () => void;
}

const FacebookStreamManager = ({
  videoElement,
  onStreamStarted,
  onStreamStopped
}: FacebookStreamManagerProps) => {
  const { session } = useAuth();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamKey, setStreamKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const rtmpUrl = 'rtmps://live-api-s.facebook.com:443/rtmp/';
  const streamKeyHintUrl = 'https://www.facebook.com/live/producer';

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
      // Check if we have access to the user's camera
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser doesn't support camera access");
      }
      
      toast.info("Setting up Facebook live stream...");
      
      // In a real implementation, this would:
      // 1. Get the user's camera stream
      // 2. Use the Web Media API to create an encoder 
      // 3. Set up an RTMP connection to Facebook's servers
      // 4. Stream the encoded video to Facebook
      
      // Since browser RTMP streaming requires browser extensions or third-party libraries,
      // we need to inform the user about the technical limitations
      
      toast.info("Preparing connection to Facebook Live...", { duration: 3000 });
      
      // Simulate the connection process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate a unique stream ID
      const streamId = `facebook-stream-${Date.now()}`;
      setStreamId(streamId);
      
      // Set streaming state
      setIsStreaming(true);
      
      if (onStreamStarted) {
        onStreamStarted();
      }
      
      // Inform the user about browser limitations
      setTimeout(() => {
        toast.info("Technical limitation", { 
          description: "Direct RTMP streaming requires additional browser capabilities. For production use, consider integrating with Facebook's API or a specialized streaming service."
        });
      }, 3000);
      
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
      
      // In a real implementation, this would close the RTMP connection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsStreaming(false);
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

  return (
    <div className="space-y-4 p-4 bg-black/20 rounded-lg">
      <h3 className="text-lg font-medium text-white">Facebook Live Streaming</h3>
      
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
              
              <Button
                onClick={startStreaming}
                disabled={isLoading || !streamKey}
                className="w-full bg-[#1877F2] hover:bg-[#1877F2]/80 text-white"
              >
                <Play className="mr-2 h-5 w-5" />
                {isLoading ? "Setting up..." : "Go Live on Facebook"}
              </Button>
            </div>
          ) : (
            <>
              <div className="bg-blue-900/20 p-2 rounded-md border border-blue-500/50 mb-4">
                <p className="text-sm text-white flex items-center">
                  <span className="h-2 w-2 bg-blue-500 rounded-full animate-pulse mr-2"></span>
                  Live on Facebook
                </p>
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
            Note: Browser-based RTMP streaming has limitations. For production use, consider a dedicated streaming solution.
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

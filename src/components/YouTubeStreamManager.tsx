
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, StopCircle, Youtube } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/components/AuthProvider';

interface YouTubeStreamManagerProps {
  videoElement?: React.RefObject<HTMLVideoElement>;
  onStreamStarted?: () => void;
  onStreamStopped?: () => void;
}

const YouTubeStreamManager = ({ 
  videoElement,
  onStreamStarted,
  onStreamStopped
}: YouTubeStreamManagerProps) => {
  const { session } = useAuth();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamKey, setStreamKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [broadcastId, setBroadcastId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showGoogleVerificationWarning, setShowGoogleVerificationWarning] = useState(true);

  // Check for existing live broadcasts when component mounts
  useEffect(() => {
    if (session?.provider_token) {
      checkExistingBroadcasts();
    }
  }, [session]);

  const checkExistingBroadcasts = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // For demo purposes - in a real app, you'd call your backend to check YouTube API
      toast.info("Checking for existing broadcasts...");
      // Simulating API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Demo logic - in production, this would be a real API call
      setIsLoading(false);
    } catch (err) {
      console.error("Error checking broadcasts:", err);
      setError("Couldn't check for existing broadcasts");
      setIsLoading(false);
    }
  };

  const startStreaming = async () => {
    if (!session) {
      toast.error("Not signed in", { description: "Please sign in with YouTube first" });
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // For demo purposes - in a real app, you'd:
      // 1. Create a broadcast via your backend API
      // 2. Get a stream key
      // 3. Set up the WebRTC connection to YouTube

      toast.info("Setting up YouTube live stream...");
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Demo broadcast ID and stream key
      const demoId = `broadcast-${Date.now()}`;
      setBroadcastId(demoId);
      setStreamKey("demo-stream-key-xxxx");
      
      // For demo, we're simulating a successful stream start
      setIsStreaming(true);
      
      if (onStreamStarted) {
        onStreamStarted();
      }
      
      toast.success("YouTube stream started!", {
        description: "Your stream is now live on YouTube (demo mode)"
      });
      
      setIsLoading(false);
    } catch (err: any) {
      console.error("Error starting stream:", err);
      setError(err.message || "Couldn't start YouTube stream");
      setIsLoading(false);
      toast.error("Streaming error", {
        description: "Could not start YouTube stream"
      });
    }
  };

  const stopStreaming = async () => {
    if (!broadcastId) return;
    
    setIsLoading(true);
    
    try {
      // For demo purposes - in production, you'd end the broadcast via API
      toast.info("Stopping YouTube stream...");
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsStreaming(false);
      setBroadcastId(null);
      
      if (onStreamStopped) {
        onStreamStopped();
      }
      
      toast.success("Stream ended", {
        description: "Your YouTube stream has been stopped"
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

  return (
    <div className="space-y-4 p-4 bg-black/20 rounded-lg">
      <h3 className="text-lg font-medium text-white">YouTube Live Streaming</h3>
      
      {error && (
        <Alert variant="destructive" className="bg-red-900/50 border-red-500">
          <AlertDescription className="text-red-200">{error}</AlertDescription>
        </Alert>
      )}
      
      {showGoogleVerificationWarning && (
        <Alert className="bg-yellow-900/50 border-yellow-500">
          <AlertDescription className="text-yellow-200">
            <p className="mb-2"><strong>App Verification Status</strong></p>
            <p>Your app is currently in testing mode with Google. Advanced YouTube features like live streaming require verification.</p>
            <p className="mt-2">For development, we're using a demo mode.</p>
            <Button 
              variant="outline"
              className="mt-2 border-yellow-500 hover:bg-yellow-500/20 text-yellow-200"
              onClick={() => setShowGoogleVerificationWarning(false)}
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {session?.provider_token ? (
        <>
          {!isStreaming ? (
            <Button
              onClick={startStreaming}
              disabled={isLoading}
              className="w-full bg-[#FF0000] hover:bg-[#FF0000]/80 text-white"
            >
              <Play className="mr-2 h-5 w-5" />
              {isLoading ? "Setting up..." : "Go Live on YouTube (Demo)"}
            </Button>
          ) : (
            <Button
              onClick={stopStreaming}
              disabled={isLoading}
              variant="destructive"
              className="w-full"
            >
              <StopCircle className="mr-2 h-5 w-5" />
              {isLoading ? "Stopping..." : "End YouTube Stream"}
            </Button>
          )}
          
          {isStreaming && (
            <div className="bg-red-900/20 p-2 rounded-md border border-red-500/50">
              <p className="text-sm text-white flex items-center">
                <span className="h-2 w-2 bg-red-500 rounded-full animate-pulse mr-2"></span>
                Live on YouTube (Demo Mode)
              </p>
            </div>
          )}
          
          <p className="text-xs text-gray-400 mt-2">
            Note: This is a demonstration. In a production app, this would connect to the YouTube API using your OAuth token.
          </p>
        </>
      ) : (
        <div className="text-center p-4">
          <p className="text-white mb-2">Sign in with YouTube to stream</p>
          <Button 
            onClick={() => window.location.href = '/auth'}
            className="bg-[#FF0000] hover:bg-[#FF0000]/80 text-white"
          >
            <Youtube className="mr-2 h-5 w-5" />
            Sign in with YouTube
          </Button>
        </div>
      )}
    </div>
  );
};

export default YouTubeStreamManager;

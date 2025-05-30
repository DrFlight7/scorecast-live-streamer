
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Camera, Pause, Play, Smartphone, RefreshCw, Youtube, Facebook, Server } from 'lucide-react';
import LivestreamView from '@/components/LivestreamView';
import ScoreControls from '@/components/ScoreControls';
import StreamingServerStatus from '@/components/StreamingServerStatus';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/components/AuthProvider';
import YouTubeStreamManager from '@/components/YouTubeStreamManager';
import FacebookStreamManager from '@/components/FacebookStreamManager';
import { useCamera } from '@/hooks/useCamera';

const LiveStream = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we have state from setup
  const initialState = location.state || {
    homeTeam: { name: 'Home', score: 0, color: '#1E88E5' },
    awayTeam: { name: 'Away', score: 0, color: '#E53935' },
    streamConfig: { platform: 'youtube' }
  };
  
  const [homeTeam, setHomeTeam] = useState(initialState.homeTeam);
  const [awayTeam, setAwayTeam] = useState(initialState.awayTeam);
  const [period, setPeriod] = useState(1);
  const [isStreaming, setIsStreaming] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [lastScored, setLastScored] = useState<'home' | 'away' | null>(null);
  const [remoteDialogOpen, setRemoteDialogOpen] = useState(false);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [showCameraTip, setShowCameraTip] = useState(false);
  const [youtubeDialogOpen, setYoutubeDialogOpen] = useState(false);
  const [facebookDialogOpen, setFacebookDialogOpen] = useState(false);
  const [serverStatusDialogOpen, setServerStatusDialogOpen] = useState(false);
  const [streamStats, setStreamStats] = useState<{health?: string; viewers?: number}>({});
  
  // Set up camera with audio enabled for streaming
  const {
    videoRef,
    isEnabled: isCameraEnabled,
    stream: mediaStream,
    startCamera,
    getMediaStream
  } = useCamera({
    audio: true,
    video: {
      width: 1280,
      height: 720,
      frameRate: 30,
      facingMode: 'user'
    }
  });
  
  const { user } = useAuth();
  
  // Check if user signed in with YouTube/Google or Facebook
  const isYouTubeUser = user?.app_metadata?.provider === 'google';
  const isFacebookUser = user?.app_metadata?.provider === 'facebook';

  // Clear last scored effect after a delay
  useEffect(() => {
    if (lastScored) {
      const timer = setTimeout(() => {
        setLastScored(null);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [lastScored]);

  // Show camera permission dialog on component mount
  useEffect(() => {
    const hasSeenPermission = localStorage.getItem('hasSeenCameraPermission');
    if (!hasSeenPermission) {
      setPermissionDialogOpen(true);
      localStorage.setItem('hasSeenCameraPermission', 'true');
    }
    
    // Show camera troubleshooting tip after a delay
    const tipTimer = setTimeout(() => {
      setShowCameraTip(true);
    }, 5000);
    
    // Check Railway server status on mount
    fetch('https://scorecast-live-streamer-production.up.railway.app/health')
      .then(response => {
        if (!response.ok) {
          toast.warning("Railway streaming server may be offline", {
            description: "This could affect Facebook streaming functionality",
            action: {
              label: "Check Status",
              onClick: () => setServerStatusDialogOpen(true)
            }
          });
        }
      })
      .catch(err => {
        console.error("Error checking Railway server:", err);
      });
    
    // For YouTube users, show the YouTube stream dialog
    if (isYouTubeUser) {
      const youtubeTimer = setTimeout(() => {
        setYoutubeDialogOpen(true);
      }, 2000);
      return () => {
        clearTimeout(tipTimer);
        clearTimeout(youtubeTimer);
      };
    }
    
    // For Facebook users, show the Facebook stream dialog
    if (isFacebookUser) {
      const facebookTimer = setTimeout(() => {
        setFacebookDialogOpen(true);
      }, 2000);
      return () => {
        clearTimeout(tipTimer);
        clearTimeout(facebookTimer);
      };
    }
    
    return () => clearTimeout(tipTimer);
  }, [isYouTubeUser, isFacebookUser]);
  
  const handleHomeScoreChange = (amount: number) => {
    const newScore = Math.max(0, homeTeam.score + amount);
    if (amount > 0) setLastScored('home');
    setHomeTeam({ ...homeTeam, score: newScore });
  };
  
  const handleAwayScoreChange = (amount: number) => {
    const newScore = Math.max(0, awayTeam.score + amount);
    if (amount > 0) setLastScored('away');
    setAwayTeam({ ...awayTeam, score: newScore });
  };
  
  const handlePeriodChange = (amount: number) => {
    const newPeriod = Math.max(1, period + amount);
    setPeriod(newPeriod);
    
    if (amount > 0) {
      toast.info(`Period ${newPeriod} started`);
    }
  };
  
  const handleReset = () => {
    setHomeTeam({ ...homeTeam, score: 0 });
    setAwayTeam({ ...awayTeam, score: 0 });
    setPeriod(1);
    toast.success("Scores and period reset");
  };
  
  const handleEndStream = () => {
    toast.info("Ending stream...");
    setIsStreaming(false);
    
    // Simulate delay before returning to home
    setTimeout(() => {
      navigate('/');
    }, 1500);
  };
  
  const handleTogglePause = () => {
    setIsPaused(!isPaused);
    toast(`Stream ${!isPaused ? "paused" : "resumed"}`);
  };
  
  const openRemoteControl = () => {
    setRemoteDialogOpen(true);
  };
  
  const handlePermissionCheck = async () => {
    try {
      toast.info("Requesting camera access...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        }, 
        audio: true
      });
      
      // Stop tracks right away as we just wanted to check permissions
      stream.getTracks().forEach(track => track.stop());
      
      toast.success("Camera permissions granted!");
      setPermissionDialogOpen(false);
      
      // Force page reload to reinitialize camera with new permissions
      toast.info("Refreshing page to apply camera permissions...", {
        duration: 3000,
        onDismiss: () => {
          window.location.reload();
        }
      });
      
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error) {
      console.error("Permission error:", error);
      toast.error("Couldn't access camera", {
        description: "Please check your browser settings and permissions."
      });
    }
  };
  
  const handleForceReload = () => {
    toast.info("Refreshing page...");
    window.location.reload();
  };
  
  const handleFacebookStreamStarted = () => {
    toast.success("Facebook Live stream started via Railway!");
    setFacebookDialogOpen(false);
    
    // Set some streaming stats for UI
    setStreamStats({
      health: 'good',
      viewers: 0
    });
  };
  
  const handleFacebookStreamStopped = () => {
    toast.info("Facebook Live stream ended");
    setStreamStats({});
  };
  
  const handleServerStatusCheck = () => {
    setServerStatusDialogOpen(true);
  };
  
  // Generate a fake remote control URL for demonstration purposes
  const remoteControlUrl = `https://sportcast.app/remote/${Math.random().toString(36).substring(2, 8)}`;
  
  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Stream view area */}
      <div className="flex-1 relative">
        <LivestreamView
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          period={period}
          isStreaming={isStreaming && !isPaused}
          lastScored={lastScored}
          streamStats={streamStats}
        />
        
        {/* Top controls bar */}
        <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-2 bg-black/40 z-10">
          <Button 
            variant="ghost" 
            size="sm"
            className="text-white hover:bg-black/30"
            onClick={() => {
              if (window.confirm("Are you sure you want to end the stream?")) {
                handleEndStream();
              }
            }}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            End
          </Button>
          
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              className="text-white hover:bg-black/30"
              onClick={handleForceReload}
            >
              <RefreshCw className="mr-1 h-4 w-4" />
              Reload
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm"
              className="text-white hover:bg-black/30"
              onClick={handleTogglePause}
            >
              {isPaused ? (
                <><Play className="mr-1 h-4 w-4" /> Resume</>
              ) : (
                <><Pause className="mr-1 h-4 w-4" /> Pause</>
              )}
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm"
              className="text-white hover:bg-black/30"
              onClick={openRemoteControl}
            >
              <Smartphone className="mr-1 h-4 w-4" />
              Remote
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm"
              className="text-white hover:bg-black/30"
              onClick={handleServerStatusCheck}
            >
              <Server className="mr-1 h-4 w-4" />
              Server
            </Button>
            
            {isYouTubeUser && (
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-black/30 bg-red-600/30"
                onClick={() => setYoutubeDialogOpen(true)}
              >
                <Youtube className="mr-1 h-4 w-4" />
                YouTube
              </Button>
            )}

            {isFacebookUser && (
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-black/30 bg-blue-600/30"
                onClick={() => setFacebookDialogOpen(true)}
              >
                <Facebook className="mr-1 h-4 w-4" />
                Facebook
              </Button>
            )}
          </div>
        </div>
        
        {/* Camera troubleshooting tip */}
        {showCameraTip && !isCameraEnabled && (
          <div className="absolute bottom-4 right-4 max-w-xs">
            <Alert variant="destructive" className="bg-white/90 border-sportRed">
              <AlertDescription className="text-black text-xs">
                <strong>Camera not showing?</strong> Try the "Reload" button above or check camera permissions in your browser settings.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
      
      {/* Bottom controls area */}
      <div className="bg-sportNavy p-4">
        <ScoreControls
          onHomeScoreChange={handleHomeScoreChange}
          onAwayScoreChange={handleAwayScoreChange}
          onPeriodChange={handlePeriodChange}
          onReset={handleReset}
        />
      </div>
      
      {/* Remote control dialog */}
      <Dialog open={remoteDialogOpen} onOpenChange={setRemoteDialogOpen}>
        <DialogContent className="bg-sportNavy text-white border-sportGray/20">
          <DialogHeader>
            <DialogTitle>Remote Control</DialogTitle>
            <DialogDescription className="text-sportGray/80">
              Scan this QR code with another device to remotely control the scoreboard.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center">
            <div className="bg-white p-4 rounded-lg">
              <QRCodeSVG 
                value={remoteControlUrl} 
                size={200}
                level="H"
              />
            </div>
            <p className="mt-4 text-center text-sm text-sportGray/60">
              Note: This is a demo feature. Remote control functionality would be implemented in a full version.
            </p>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* YouTube Live Stream Dialog */}
      <Dialog open={youtubeDialogOpen} onOpenChange={setYoutubeDialogOpen}>
        <DialogContent className="bg-sportNavy text-white border-sportGray/20 max-w-md">
          <DialogHeader>
            <DialogTitle>YouTube Live Stream</DialogTitle>
            <DialogDescription className="text-sportGray/80">
              Stream your game directly to your YouTube channel
            </DialogDescription>
          </DialogHeader>
          <YouTubeStreamManager 
            videoElement={videoRef}
            onStreamStarted={() => setYoutubeDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Facebook Live Stream Dialog */}
      <Dialog open={facebookDialogOpen} onOpenChange={setFacebookDialogOpen}>
        <DialogContent className="bg-sportNavy text-white border-sportGray/20 max-w-md">
          <DialogHeader>
            <DialogTitle>Facebook Live Stream</DialogTitle>
            <DialogDescription className="text-sportGray/80">
              Stream your game directly to your Facebook account via Railway
            </DialogDescription>
          </DialogHeader>
          <FacebookStreamManager 
            videoElement={videoRef}
            mediaStream={mediaStream}
            onStreamStarted={handleFacebookStreamStarted}
            onStreamStopped={handleFacebookStreamStopped}
          />
        </DialogContent>
      </Dialog>
      
      {/* Railway Server Status Dialog */}
      <Dialog open={serverStatusDialogOpen} onOpenChange={setServerStatusDialogOpen}>
        <DialogContent className="bg-sportNavy text-white border-sportGray/20 max-w-md">
          <DialogHeader>
            <DialogTitle>Railway Server Status</DialogTitle>
            <DialogDescription className="text-sportGray/80">
              Check the status of the Railway FFmpeg server for production streaming
            </DialogDescription>
          </DialogHeader>
          <StreamingServerStatus serverUrl="https://scorecast-live-streamer-production.up.railway.app" />
        </DialogContent>
      </Dialog>
      
      {/* Camera permissions dialog */}
      <Dialog open={permissionDialogOpen} onOpenChange={setPermissionDialogOpen}>
        <DialogContent className="bg-sportNavy text-white border-sportGray/20">
          <DialogHeader>
            <DialogTitle>Camera Access Required</DialogTitle>
            <DialogDescription className="text-sportGray/80">
              SportCast needs access to your camera and microphone to stream. Please allow camera and audio access when prompted.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center p-4">
            <Camera size={64} className="text-sportBlue mb-4" />
            <p className="mb-4 text-center">
              If you've previously denied camera access, you may need to update your browser settings.
            </p>
            <Button 
              onClick={handlePermissionCheck}
              className="bg-sportBlue hover:bg-sportBlue/80 w-full"
            >
              Check Camera Access
            </Button>
            <p className="mt-4 text-xs text-sportGray/60 text-center">
              Note: After granting permissions, the page will automatically refresh.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LiveStream;

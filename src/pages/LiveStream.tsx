
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Camera, Pause, Play, StopCircle, Smartphone, RefreshCw } from 'lucide-react';
import LivestreamView from '@/components/LivestreamView';
import ScoreControls from '@/components/ScoreControls';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRCodeSVG } from 'qrcode.react';

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
    
    return () => clearTimeout(tipTimer);
  }, []);
  
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
        audio: false 
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
        />
        
        {/* Top controls bar */}
        <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-2 bg-black/40 z-10">
          <Button 
            variant="ghost" 
            size="sm"
            className="text-white hover:bg-black/30"
            onClick={() => {
              if (confirm("Are you sure you want to end the stream?")) {
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
          </div>
        </div>
        
        {/* Camera troubleshooting tip */}
        {showCameraTip && (
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
      
      {/* Camera permissions dialog */}
      <Dialog open={permissionDialogOpen} onOpenChange={setPermissionDialogOpen}>
        <DialogContent className="bg-sportNavy text-white border-sportGray/20">
          <DialogHeader>
            <DialogTitle>Camera Access Required</DialogTitle>
            <DialogDescription className="text-sportGray/80">
              SportCast needs access to your camera to stream. Please allow camera access when prompted.
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

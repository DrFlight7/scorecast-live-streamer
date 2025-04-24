
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pause, Play, StopCircle, Smartphone } from 'lucide-react';
import LivestreamView from '@/components/LivestreamView';
import ScoreControls from '@/components/ScoreControls';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  
  // Clear last scored effect after a delay
  useEffect(() => {
    if (lastScored) {
      const timer = setTimeout(() => {
        setLastScored(null);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [lastScored]);
  
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
    toast.info("Remote control feature will be available in future updates");
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
          </DialogHeader>
          <div className="flex flex-col items-center">
            <div className="bg-white p-4 rounded-lg">
              <QRCodeSVG 
                value={remoteControlUrl} 
                size={200}
                level="H"
              />
            </div>
            <p className="mt-4 text-center text-sm">
              Scan this QR code with another device to remotely control the scoreboard.
              <br /><br />
              <span className="text-sportGray/60 text-xs">
                Note: This is a demo feature. Remote control functionality would be implemented in a full version.
              </span>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LiveStream;

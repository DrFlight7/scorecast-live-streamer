import React from 'react';
import { cn } from '@/lib/utils';
import { Camera, CameraOff, RefreshCw } from 'lucide-react';
import Scoreboard from './Scoreboard';
import { useCamera } from '@/hooks/useCamera';

interface LivestreamViewProps {
  homeTeam: {
    name: string;
    score: number;
    color: string;
  };
  awayTeam: {
    name: string;
    score: number;
    color: string;
  };
  period: number;
  isStreaming: boolean;
  lastScored?: 'home' | 'away' | null;
  className?: string;
}

const LivestreamView = ({
  homeTeam,
  awayTeam,
  period,
  isStreaming,
  lastScored,
  className
}: LivestreamViewProps) => {
  const { videoRef, isEnabled, error, isAttempting, retryCamera } = useCamera();
  const [streamIndicator, setStreamIndicator] = React.useState(0);

  React.useEffect(() => {
    if (isStreaming) {
      const interval = setInterval(() => {
        setStreamIndicator((prev) => (prev + 1) % 2);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isStreaming]);

  return (
    <div className={cn('relative w-full h-full', className)}>
      <video 
        ref={videoRef}
        autoPlay 
        playsInline
        muted
        className={cn(
          "w-full h-full object-cover rounded-lg",
          !isEnabled && "hidden"
        )}
      />
      
      {!isEnabled && (
        <div className="w-full h-full flex items-center justify-center bg-black rounded-lg">
          <div className="text-center text-white p-4">
            <CameraOff size={64} className="mx-auto mb-4" />
            <p className="text-xl font-bold">Camera not available</p>
            <p className="mb-4">{error || "Please enable camera permissions"}</p>
            <button 
              onClick={retryCamera}
              className="bg-sportRed hover:bg-sportRed/80 text-white py-2 px-4 rounded-full flex items-center justify-center gap-2"
              disabled={isAttempting}
            >
              {isAttempting ? (
                <>
                  <RefreshCw className="animate-spin" size={18} />
                  Connecting...
                </>
              ) : (
                <>
                  <Camera size={18} />
                  Try Again
                </>
              )}
            </button>
          </div>
        </div>
      )}
      
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-11/12">
        <Scoreboard
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          period={period}
          lastScored={lastScored}
        />
      </div>
      
      {isStreaming && (
        <div className="absolute top-20 left-4 flex items-center space-x-2 bg-black/40 py-1 px-3 rounded-full">
          <div className={cn(
            "h-3 w-3 rounded-full", 
            streamIndicator === 0 ? "bg-sportRed" : "bg-red-800"
          )} />
          <span className="text-white text-sm font-bold">LIVE</span>
        </div>
      )}
    </div>
  );
};

export default LivestreamView;

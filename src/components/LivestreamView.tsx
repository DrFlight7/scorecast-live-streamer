
import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Camera, CameraOff, Video } from 'lucide-react';
import { toast } from "sonner";
import Scoreboard from './Scoreboard';

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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [streamIndicator, setStreamIndicator] = useState(0);

  // Simulated streaming indicator that pulses
  useEffect(() => {
    if (isStreaming) {
      const interval = setInterval(() => {
        setStreamIndicator((prev) => (prev + 1) % 2);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isStreaming]);

  // Handle camera setup
  useEffect(() => {
    async function setupCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera access not supported in this browser");
        }

        const constraints = {
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: true
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraEnabled(true);
          setCameraError(null);
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setCameraError("Could not access camera. Please check permissions.");
        toast.error("Camera access error", {
          description: "Could not access your camera. Please check permissions."
        });
      }
    }

    if (!cameraEnabled) {
      setupCamera();
    }

    // Cleanup
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className={cn('relative w-full h-full', className)}>
      {/* Camera preview */}
      {cameraEnabled ? (
        <video 
          ref={videoRef}
          autoPlay 
          playsInline
          muted
          className="w-full h-full object-cover rounded-lg"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-black rounded-lg">
          <div className="text-center text-white p-4">
            <CameraOff size={64} className="mx-auto mb-4" />
            <p className="text-xl font-bold">Camera not available</p>
            <p>{cameraError || "Please enable camera permissions"}</p>
          </div>
        </div>
      )}
      
      {/* Scoreboard overlay */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-11/12">
        <Scoreboard
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          period={period}
          lastScored={lastScored}
        />
      </div>
      
      {/* Stream indicator */}
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


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
  const [attemptingCamera, setAttemptingCamera] = useState(false);

  // Simulated streaming indicator that pulses
  useEffect(() => {
    if (isStreaming) {
      const interval = setInterval(() => {
        setStreamIndicator((prev) => (prev + 1) % 2);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isStreaming]);

  // Handle camera setup with improved error handling
  const setupCamera = async () => {
    try {
      console.log("Setting up camera...");
      setAttemptingCamera(true);
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera access not supported in this browser");
      }

      // First try to stop any existing streams to reset
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => {
          console.log("Stopping existing track:", track.kind);
          track.stop();
        });
        videoRef.current.srcObject = null;
      }

      // Simpler constraints for better compatibility
      const constraints = {
        video: {
          facingMode: "user", // Default to front camera for better first experience
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: true
      };

      console.log("Requesting media access with constraints:", constraints);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("Camera access granted, setting up video stream");
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Add event listeners to track playback status
        videoRef.current.onloadedmetadata = () => {
          console.log("Video metadata loaded, playing video");
          videoRef.current?.play()
            .then(() => {
              console.log("Video playback started successfully");
              setCameraEnabled(true);
              setCameraError(null);
            })
            .catch(err => {
              console.error("Error playing video:", err);
              setCameraError("Error starting video playback. Try refreshing the page.");
              toast.error("Camera error", {
                description: "Could not start video playback."
              });
            });
        };
        
        videoRef.current.onplaying = () => {
          console.log("Video is now playing");
          setCameraEnabled(true);
        };
        
        videoRef.current.onerror = (event) => {
          console.error("Video element error:", event);
          setCameraError("Video element encountered an error.");
        };
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      let errorMessage = "Could not access camera. ";
      
      // More specific error messages based on error type
      if (err.name === "NotAllowedError") {
        errorMessage += "Camera permission was denied. Please check browser permissions.";
      } else if (err.name === "NotFoundError") {
        errorMessage += "No camera device found.";
      } else if (err.name === "NotReadableError") {
        errorMessage += "Camera may be in use by another application.";
      } else {
        errorMessage += "Please check permissions and refresh the page.";
      }
      
      setCameraError(errorMessage);
      toast.error("Camera access error", {
        description: errorMessage
      });
    } finally {
      setAttemptingCamera(false);
    }
  };

  // Initialize camera on component mount
  useEffect(() => {
    let mounted = true;
    
    if (!cameraEnabled && !attemptingCamera) {
      setupCamera();
    }

    // Cleanup
    return () => {
      mounted = false;
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => {
          console.log("Stopping track:", track.kind);
          track.stop();
        });
      }
    };
  }, [cameraEnabled, attemptingCamera]);

  const handleRetryCamera = () => {
    console.log("Retrying camera access...");
    setCameraEnabled(false);
    setCameraError(null);
    // setupCamera will be triggered by the useEffect
  };

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
            <p className="mb-4">{cameraError || "Please enable camera permissions"}</p>
            <button 
              onClick={handleRetryCamera}
              className="bg-sportRed hover:bg-sportRed/80 text-white py-2 px-4 rounded-full"
              disabled={attemptingCamera}
            >
              <Camera className="inline-block mr-2" size={18} /> 
              {attemptingCamera ? "Connecting..." : "Try Again"}
            </button>
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

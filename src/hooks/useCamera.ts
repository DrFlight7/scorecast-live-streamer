
import { useRef, useState, useEffect } from 'react';
import { toast } from "sonner";

export const useCamera = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAttempting, setIsAttempting] = useState(false);
  const setupAttempted = useRef(false);

  const initializeCamera = async () => {
    if (isAttempting) return;
    
    try {
      console.log("Starting camera initialization...");
      setIsAttempting(true);
      setError(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API not available");
      }

      // Simple constraints to start with
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });

      console.log("Camera permission granted, got stream");

      if (!videoRef.current) {
        throw new Error("Video element not ready");
      }

      // Stop any existing streams
      if (videoRef.current.srcObject) {
        const oldStream = videoRef.current.srcObject as MediaStream;
        oldStream.getTracks().forEach(track => track.stop());
      }

      // Set new stream
      videoRef.current.srcObject = stream;
      
      // Wait for metadata to load before playing
      await new Promise((resolve) => {
        if (!videoRef.current) return;
        videoRef.current.onloadedmetadata = resolve;
      });

      console.log("Video metadata loaded, attempting playback");
      await videoRef.current.play();
      
      console.log("Camera successfully initialized");
      setIsEnabled(true);
      setError(null);
      toast.success("Camera connected");
    } catch (err: any) {
      console.error("Camera initialization failed:", err);
      let message = "Could not access camera. ";
      
      if (err.name === "NotAllowedError") {
        message += "Please allow camera access in your browser settings.";
      } else if (err.name === "NotFoundError") {
        message += "No camera found.";
      } else {
        message += err.message || "Please check permissions and try again.";
      }
      
      setError(message);
      toast.error("Camera error", { description: message });
    } finally {
      setIsAttempting(false);
    }
  };

  const retryCamera = () => {
    console.log("Retrying camera initialization...");
    setIsEnabled(false);
    setError(null);
    initializeCamera();
  };

  // Initialize on mount
  useEffect(() => {
    if (!setupAttempted.current) {
      setupAttempted.current = true;
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        initializeCamera();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => {
          console.log("Stopping track:", track.kind);
          track.stop();
        });
      }
    };
  }, []);

  return {
    videoRef,
    isEnabled,
    error,
    isAttempting,
    retryCamera
  };
};

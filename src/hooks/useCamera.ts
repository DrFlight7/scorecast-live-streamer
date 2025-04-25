
import { useRef, useState, useEffect } from 'react';
import { toast } from "sonner";

export const useCamera = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAttempting, setIsAttempting] = useState(false);
  const setupAttempted = useRef(false);
  const retryCount = useRef(0);
  const maxRetries = 3;

  const initializeCamera = async () => {
    if (isAttempting || !videoRef.current) {
      console.log("Skipping initialization - already attempting or no video element");
      return;
    }
    
    try {
      console.log("Starting camera initialization, attempt:", retryCount.current + 1);
      setIsAttempting(true);
      setError(null);

      // Check if camera devices exist
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some(device => device.kind === 'videoinput');
      
      if (!hasCamera) {
        throw new Error("No camera detected on this device");
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API not available");
      }

      // Simple constraints to start with
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });

      console.log("Camera permission granted, got stream");

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
      retryCount.current = 0;
      toast.success("Camera connected");
    } catch (err: any) {
      console.error("Camera initialization failed:", err);
      let message = "Could not access camera. ";
      
      if (err.name === "NotAllowedError") {
        message += "Please allow camera access in your browser settings.";
      } else if (err.name === "NotFoundError") {
        message += "No camera found.";
      } else if (err.name === "NotReadableError") {
        message += "Camera may be in use by another application.";
      } else {
        message += err.message || "Please check permissions and try again.";
      }
      
      setError(message);
      toast.error("Camera error", { description: message });

      // Implement retry logic
      if (retryCount.current < maxRetries) {
        retryCount.current++;
        console.log(`Retrying camera initialization in 2 seconds (attempt ${retryCount.current})`);
        setTimeout(() => {
          setIsAttempting(false);
          initializeCamera();
        }, 2000);
      }
    } finally {
      if (retryCount.current >= maxRetries) {
        setIsAttempting(false);
      }
    }
  };

  const retryCamera = () => {
    console.log("Manual retry of camera initialization...");
    retryCount.current = 0;
    setIsEnabled(false);
    setError(null);
    setIsAttempting(false);
    initializeCamera();
  };

  // Initialize on mount with a delay to ensure DOM is ready
  useEffect(() => {
    if (!setupAttempted.current) {
      setupAttempted.current = true;
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

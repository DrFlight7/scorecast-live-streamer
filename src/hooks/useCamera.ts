
import { useRef, useState, useEffect } from 'react';
import { toast } from "sonner";

interface UseCameraOptions {
  audio?: boolean;
  video?: {
    width?: number;
    height?: number;
    frameRate?: number;
    facingMode?: 'user' | 'environment';
  };
  autostart?: boolean;
}

interface UseCameraState {
  isEnabled: boolean;
  isAttempting: boolean;
  error: string | null;
  stream: MediaStream | null;
}

interface UseCameraResult extends UseCameraState {
  videoRef: React.RefObject<HTMLVideoElement>;
  startCamera: () => Promise<boolean>;
  stopCamera: () => void;
  switchCamera: () => Promise<boolean>;
  takeSnapshot: () => string | null;
}

export const useCamera = (options: UseCameraOptions = {}): UseCameraResult => {
  const {
    audio = false,
    video = {
      width: 1280,
      height: 720,
      frameRate: 30,
      facingMode: 'user'
    },
    autostart = true
  } = options;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [state, setState] = useState<UseCameraState>({
    isEnabled: false,
    isAttempting: false,
    error: null,
    stream: null
  });

  const setupAttempted = useRef(false);
  const retryCount = useRef(0);
  const maxRetries = 3;

  // Function to start the camera
  const startCamera = async (): Promise<boolean> => {
    if (state.isAttempting) {
      console.log("Already attempting to start camera");
      return false;
    }
    
    setState(prev => ({ ...prev, isAttempting: true, error: null }));
    
    try {
      console.log("Starting camera with constraints:", { audio, video });

      // Check if camera devices exist
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some(device => device.kind === 'videoinput');
      
      if (!hasCamera) {
        throw new Error("No camera detected on this device");
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API not available");
      }

      // Get user media with the specified constraints
      const stream = await navigator.mediaDevices.getUserMedia({ audio, video });
      console.log("Camera permission granted, got stream");

      // Stop any existing streams
      if (videoRef.current?.srcObject) {
        const oldStream = videoRef.current.srcObject as MediaStream;
        oldStream.getTracks().forEach(track => track.stop());
      }

      // Set new stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      
        // Wait for metadata to load before playing
        await new Promise<void>((resolve) => {
          if (!videoRef.current) return resolve();
          videoRef.current.onloadedmetadata = () => resolve();
        });

        console.log("Video metadata loaded, attempting playback");
        await videoRef.current.play();
      }
      
      console.log("Camera successfully initialized");
      setState({
        isEnabled: true,
        isAttempting: false,
        error: null,
        stream
      });
      
      retryCount.current = 0;
      toast.success("Camera connected");
      return true;
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
      
      setState(prev => ({
        ...prev, 
        isEnabled: false,
        isAttempting: false,
        error: message
      }));
      
      toast.error("Camera error", { description: message });

      // Implement retry logic
      if (retryCount.current < maxRetries) {
        retryCount.current++;
        console.log(`Retrying camera initialization in 2 seconds (attempt ${retryCount.current})`);
        
        setTimeout(() => {
          startCamera();
        }, 2000);
        
        return false;
      }
      
      return false;
    }
  };

  // Function to stop the camera
  const stopCamera = (): void => {
    if (state.stream) {
      state.stream.getTracks().forEach(track => {
        console.log("Stopping track:", track.kind);
        track.stop();
      });
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setState({
      isEnabled: false,
      isAttempting: false,
      error: null,
      stream: null
    });
  };

  // Function to switch between front and back cameras
  const switchCamera = async (): Promise<boolean> => {
    const currentFacingMode = video.facingMode || 'user';
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    
    stopCamera();
    
    video.facingMode = newFacingMode;
    return startCamera();
  };

  // Function to take a snapshot from the current video feed
  const takeSnapshot = (): string | null => {
    if (!videoRef.current || !state.isEnabled) return null;
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg');
    } catch (err) {
      console.error("Error taking snapshot:", err);
      return null;
    }
  };

  // Initialize on mount with a delay to ensure DOM is ready
  useEffect(() => {
    if (autostart && !setupAttempted.current) {
      setupAttempted.current = true;
      const timer = setTimeout(() => {
        startCamera();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [autostart]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return {
    ...state,
    videoRef,
    startCamera,
    stopCamera,
    switchCamera,
    takeSnapshot
  };
};

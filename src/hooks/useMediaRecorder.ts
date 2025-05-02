
import { useState, useEffect, useRef, useCallback } from 'react';

interface MediaRecorderHookProps {
  stream: MediaStream | null;
  timeslice?: number;
  mimeType?: string;
  bitsPerSecond?: number;
  onDataAvailable?: (data: Blob) => void;
  onStart?: () => void;
  onStop?: () => void;
  onError?: (error: Error) => void;
  autoStart?: boolean;
}

interface MediaRecorderHookResult {
  isRecording: boolean;
  isPaused: boolean;
  recordedBlobs: Blob[];
  startRecording: () => void;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  clearRecording: () => void;
  getRecordedBlob: () => Blob | null;
  error: Error | null;
  recorderState: RecordingState;
}

type RecordingState = 'inactive' | 'recording' | 'paused';

export const useMediaRecorder = ({
  stream,
  timeslice = 1000, // 1 second by default
  mimeType = 'video/webm',
  bitsPerSecond = 2500000, // 2.5 Mbps by default
  onDataAvailable,
  onStart,
  onStop,
  onError,
  autoStart = false
}: MediaRecorderHookProps): MediaRecorderHookResult => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [recordedBlobs, setRecordedBlobs] = useState<Blob[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [recorderState, setRecorderState] = useState<RecordingState>('inactive');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const blobs = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Update streamRef when stream changes
  useEffect(() => {
    streamRef.current = stream;
    
    // Clean up previous recorder if stream changes
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, [stream]);

  // Get supported MIME types
  const getSupportedMimeType = useCallback((): string => {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
      'video/mp4'
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log('Media recorder supports:', type);
        return type;
      }
    }
    
    // Fallback to default
    console.warn('No supported MIME types found, using default');
    return mimeType;
  }, [mimeType]);

  const startRecording = useCallback(() => {
    if (!streamRef.current) {
      const startError = new Error('No media stream available');
      setError(startError);
      if (onError) onError(startError);
      return;
    }
    
    try {
      blobs.current = [];
      setRecordedBlobs([]);
      
      const options = {
        mimeType: getSupportedMimeType(),
        videoBitsPerSecond: bitsPerSecond
      };
      
      console.log('Starting media recorder with options:', options);
      mediaRecorderRef.current = new MediaRecorder(streamRef.current, options);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          blobs.current.push(event.data);
          setRecordedBlobs(prev => [...prev, event.data]);
          if (onDataAvailable) onDataAvailable(event.data);
        }
      };
      
      mediaRecorderRef.current.onstart = () => {
        console.log('MediaRecorder started');
        setRecorderState('recording');
        setIsRecording(true);
        setIsPaused(false);
        if (onStart) onStart();
      };
      
      mediaRecorderRef.current.onstop = () => {
        console.log('MediaRecorder stopped');
        setRecorderState('inactive');
        setIsRecording(false);
        setIsPaused(false);
        if (onStop) onStop();
      };
      
      mediaRecorderRef.current.onerror = (event) => {
        const recError = new Error(`MediaRecorder error: ${event}`);
        console.error(recError);
        setError(recError);
        if (onError) onError(recError);
      };
      
      mediaRecorderRef.current.start(timeslice);
    } catch (err: any) {
      const startError = new Error(`Failed to start recording: ${err.message}`);
      console.error(startError);
      setError(startError);
      if (onError) onError(startError);
    }
  }, [getSupportedMimeType, onDataAvailable, onError, onStart, onStop, timeslice, bitsPerSecond]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      console.log('Recording stopped');
    }
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      setRecorderState('paused');
      console.log('Recording paused');
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      setRecorderState('recording');
      console.log('Recording resumed');
    }
  }, []);

  const clearRecording = useCallback(() => {
    blobs.current = [];
    setRecordedBlobs([]);
  }, []);

  const getRecordedBlob = useCallback((): Blob | null => {
    if (blobs.current.length === 0) return null;
    
    return new Blob(blobs.current, { type: getSupportedMimeType() });
  }, [getSupportedMimeType]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Auto start if specified
  useEffect(() => {
    if (autoStart && stream && !isRecording) {
      startRecording();
    }
  }, [autoStart, stream, isRecording, startRecording]);

  return {
    isRecording,
    isPaused,
    recordedBlobs,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    getRecordedBlob,
    error,
    recorderState
  };
};

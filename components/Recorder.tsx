import React, { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';

interface RecorderProps {
  isRecording: boolean;
  onStop: () => void;
}

const Recorder: React.FC<RecorderProps> = ({ isRecording, onStop }) => {
  const { gl } = useThree();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (isRecording) {
      // Start Recording
      chunksRef.current = [];
      const canvas = gl.domElement;
      
      // Capture stream at 60 FPS
      const stream = canvas.captureStream(60);
      
      // Prioritize MP4 (H.264), fallback to WebM (VP9/VP8)
      const mimeTypes = [
        'video/mp4;codecs=h264',
        'video/mp4',
        'video/webm;codecs=vp9',
        'video/webm'
      ];
      
      let selectedMimeType = '';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          break;
        }
      }

      if (!selectedMimeType) {
        console.error("No supported mime type found for recording.");
        onStop();
        return;
      }

      try {
        // High bitrate for 1080p quality (12 Mbps)
        const options: MediaRecorderOptions = {
          mimeType: selectedMimeType,
          videoBitsPerSecond: 12000000 
        };

        const recorder = new MediaRecorder(stream, options);
        
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: selectedMimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          
          // Determine extension based on mime type
          const extension = selectedMimeType.includes('mp4') ? 'mp4' : 'webm';
          
          // Timestamp filename
          const now = new Date();
          const timestamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
          
          a.download = `Christmas_Tree_${timestamp}.${extension}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        };

        recorder.start();
        mediaRecorderRef.current = recorder;
      } catch (e) {
        console.error("Failed to start MediaRecorder:", e);
        onStop();
      }

    } else {
      // Stop Recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording, gl, onStop]);

  return null;
};

export default Recorder;
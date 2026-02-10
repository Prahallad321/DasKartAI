import React, { useState, useRef, useEffect } from 'react';
import { useLiveApi } from './hooks/use-live-api';
import { AudioVisualizer } from './components/AudioVisualizer';
import { ControlTray } from './components/ControlTray';
import { VideoGallery } from './components/VideoGallery';
import { Settings, Sparkles, AlertCircle, Film } from 'lucide-react';
import { VoiceId } from './types';
import { saveVideo } from './utils/video-storage';

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<VoiceId>('Puck');
  const [showSettings, setShowSettings] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const { 
    connect, 
    disconnect, 
    isConnected, 
    isError, 
    outputAnalyser, 
    inputAnalyser 
  } = useLiveApi({
    voiceName: selectedVoice,
    onConnectionChange: (connected) => {
      if (!connected) {
        setIsCamOn(false); // Reset cam on disconnect
        if (isRecording) {
            stopRecording();
        }
      }
    }
  });

  const handleConnect = async () => {
    // If cam is enabled, we need to start the video stream first
    if (isCamOn) {
        await startCamera();
    }
    await connect(videoRef.current || undefined);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e) {
      console.error("Camera failed", e);
      setIsCamOn(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const toggleCam = async () => {
    if (isCamOn) {
      if (isRecording) {
        stopRecording();
      }
      stopCamera();
      setIsCamOn(false);
    } else {
      setIsCamOn(true);
      await startCamera();
    }
  };

  const startRecording = () => {
    if (!videoRef.current || !videoRef.current.srcObject) return;
    
    const stream = videoRef.current.srcObject as MediaStream;
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      // Save to IndexedDB instead of auto-downloading
      try {
        await saveVideo(blob);
        console.log("Video saved to gallery");
      } catch (e) {
        console.error("Failed to save video", e);
      }
    };

    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecord = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
        stopCamera();
        if (isRecording) stopRecording();
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-black text-white overflow-hidden flex flex-col supports-[height:100dvh]:h-[100dvh]">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black z-0 pointer-events-none" />

      {/* Header - Safe Area for Status Bar */}
      <header className="absolute top-0 left-0 right-0 p-6 pt-safe-top flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
            <Sparkles className="text-nova-blue" />
            <span className="font-bold text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">NOVA</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowGallery(true)}
            className="p-2 rounded-full hover:bg-white/10 transition-colors relative group"
            title="Recordings"
          >
            <Film size={20} className="text-gray-400 group-hover:text-blue-400 transition-colors" />
          </button>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <Settings size={20} className="text-gray-400" />
          </button>
        </div>
      </header>

      {/* Gallery Modal */}
      {showGallery && (
        <VideoGallery onClose={() => setShowGallery(false)} />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute top-20 right-6 bg-gray-900/90 backdrop-blur-lg border border-white/10 p-6 rounded-2xl z-50 w-72 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <h3 className="text-lg font-semibold mb-4 text-white">Assistant Voice</h3>
          <div className="space-y-2">
            {['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'].map((voice) => (
              <button
                key={voice}
                onClick={() => {
                  setSelectedVoice(voice as VoiceId);
                  if (isConnected) {
                    disconnect();
                  }
                }}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                  selectedVoice === voice 
                    ? 'bg-nova-blue text-white shadow-lg shadow-blue-900/50' 
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {voice}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-4">Reconnect to apply voice changes.</p>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-0">
        
        {/* Error Message */}
        {isError && (
            <div className="absolute top-24 bg-red-500/10 border border-red-500/50 text-red-200 px-6 py-3 rounded-full flex items-center gap-3 backdrop-blur-md">
                <AlertCircle size={18} />
                <span>{isError}</span>
            </div>
        )}

        {/* Avatar / Visualizer Container */}
        <div className="relative w-full max-w-2xl aspect-square flex items-center justify-center">
            
            {/* Connection Status Text */}
            {!isConnected && !isError && (
                <div className="absolute text-center text-gray-400 animate-pulse">
                    <p className="text-2xl font-light">Ready to chat</p>
                    <p className="text-sm mt-2 opacity-50">Click connect to start</p>
                </div>
            )}

            {/* Video Preview */}
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-xl border border-white/10 overflow-hidden transition-opacity duration-500 ${isCamOn && isConnected ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                 <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover" 
                />
                {isRecording && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-500/80 px-2 py-0.5 rounded text-[10px] font-bold">
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        REC
                    </div>
                )}
            </div>

            {/* Main Audio Visualizer (Output - The Agent) */}
            <div className={`w-3/4 h-3/4 transition-opacity duration-700 ${isConnected ? 'opacity-100' : 'opacity-30'}`}>
                <AudioVisualizer 
                  analyser={outputAnalyser} 
                  barColor="#8b5cf6" // Purple for AI
                />
            </div>

            {/* User Audio Visualizer (Inner Ring) */}
            <div className={`absolute w-1/3 h-1/3 transition-opacity duration-500 ${isConnected && isMicOn ? 'opacity-100' : 'opacity-0'}`}>
                 <AudioVisualizer 
                  analyser={inputAnalyser} 
                  barColor="#3b82f6" // Blue for User
                />
            </div>
            
            {/* Central Orb */}
            {isConnected && (
                <div className="absolute w-4 h-4 bg-white rounded-full shadow-[0_0_30px_rgba(255,255,255,0.8)] animate-pulse-slow" />
            )}
        </div>

      </main>

      {/* Footer Controls - Safe Area for Home Bar */}
      <div className="pb-safe-bottom">
        <ControlTray 
          isConnected={isConnected}
          isMicOn={isMicOn}
          isCamOn={isCamOn}
          isRecording={isRecording}
          onToggleMic={() => setIsMicOn(!isMicOn)}
          onToggleCam={toggleCam}
          onToggleRecord={toggleRecord}
          onConnect={handleConnect}
          onDisconnect={disconnect}
        />
      </div>
    </div>
  );
};

export default App;


import React, { useEffect, useState, useRef } from 'react';
import { X, Play, Trash2, Download, Film, ChevronLeft, Edit2, Save, Type, Palette, Move, Loader2 } from 'lucide-react';
import { getVideos, deleteVideo, saveVideo, StoredVideo } from '../utils/video-storage';

interface VideoGalleryProps {
  onClose: () => void;
}

const Thumbnail: React.FC<{ video: StoredVideo }> = ({ video }) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!video.blob) return;
    const objectUrl = URL.createObjectURL(video.blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [video]);

  if (!url) {
    return (
        <div className="w-full h-full bg-slate-800 flex items-center justify-center">
            <Loader2 className="animate-spin text-slate-500" size={20} />
        </div>
    );
  }

  return (
    <div className="w-full h-full bg-black relative">
        <video
            src={url}
            className="w-full h-full object-cover"
            muted
            playsInline
            preload="metadata"
            onLoadedData={(e) => {
                // Seek slightly into the video to find a non-black keyframe
                const v = e.currentTarget;
                if (v.duration && v.duration > 0.5) {
                    v.currentTime = 0.5;
                } else {
                    v.currentTime = 0;
                }
            }}
            onError={(e) => console.warn("Thumbnail rendering failed", e)}
        />
    </div>
  );
};

interface TextOverlay {
  text: string;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  color: string;
  fontSize: number;
}

export const VideoGallery: React.FC<VideoGalleryProps> = ({ onClose }) => {
  const [videos, setVideos] = useState<StoredVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<StoredVideo | null>(null);
  
  // Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [overlay, setOverlay] = useState<TextOverlay>({
    text: 'Add Text',
    x: 50,
    y: 50,
    color: '#ffffff',
    fontSize: 48
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  // Refs for dragging
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const items = await getVideos();
      setVideos(items);
    } catch (e) {
      console.error("Failed to load videos", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this recording?")) {
      await deleteVideo(id);
      if (selectedVideo?.id === id) {
        setSelectedVideo(null);
        setIsEditing(false);
      }
      loadVideos();
    }
  };

  const handleDownload = (e: React.MouseEvent, video: StoredVideo) => {
    e.stopPropagation();
    const url = URL.createObjectURL(video.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Nova-${video.createdAt}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString();
  };

  // --- Editor Logic ---

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    isDraggingRef.current = true;
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDraggingRef.current || !editorContainerRef.current) return;

    const container = editorContainerRef.current.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    // Calculate position relative to container
    let x = ((clientX - container.left) / container.width) * 100;
    let y = ((clientY - container.top) / container.height) * 100;

    // Clamp
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    setOverlay(prev => ({ ...prev, x, y }));
  };

  const handleDragEnd = () => {
    isDraggingRef.current = false;
  };

  const saveEditedVideo = async () => {
    if (!selectedVideo) return;
    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const video = document.createElement('video');
      video.src = URL.createObjectURL(selectedVideo.blob);
      video.muted = true;
      video.crossOrigin = "anonymous";
      
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => resolve(true);
        video.onerror = reject;
      });

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      if (!ctx) throw new Error("Could not get canvas context");

      const stream = canvas.captureStream(30); // 30 FPS
      const recorder = new MediaRecorder(stream, { 
          mimeType: 'video/webm;codecs=vp8',
          videoBitsPerSecond: 2500000 // 2.5 Mbps
      });
      
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const newBlob = new Blob(chunks, { type: 'video/webm' });
        await saveVideo(newBlob, `${selectedVideo.name} (Edited)`);
        await loadVideos();
        setIsProcessing(false);
        setIsEditing(false);
        setSelectedVideo(null); // Return to list to see new video
      };

      recorder.start();
      
      let animationId: number;
      const draw = () => {
          if (video.paused || video.ended) return;
          
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Draw Text
          const fontSize = (overlay.fontSize / 100) * canvas.height; // Scale font relative to height roughly
          ctx.font = `bold ${fontSize}px Inter, sans-serif`;
          ctx.fillStyle = overlay.color;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;

          const x = (overlay.x / 100) * canvas.width;
          const y = (overlay.y / 100) * canvas.height;

          ctx.fillText(overlay.text, x, y);

          setProcessingProgress((video.currentTime / video.duration) * 100);
          animationId = requestAnimationFrame(draw);
      };

      video.onplay = () => {
          draw();
      };

      video.onended = () => {
        cancelAnimationFrame(animationId);
        recorder.stop();
      };

      await video.play();

    } catch (e) {
      console.error("Error saving video:", e);
      setIsProcessing(false);
      alert("Failed to save edited video.");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-200 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/5 bg-slate-900/50">
        <div className="flex items-center gap-3">
          {selectedVideo ? (
            <button 
              onClick={() => {
                  setSelectedVideo(null);
                  setIsEditing(false);
              }}
              className="p-2 hover:bg-slate-800 rounded-full transition-colors"
              disabled={isProcessing}
            >
              <ChevronLeft className="text-white" />
            </button>
          ) : (
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Film className="text-blue-500" size={24} />
            </div>
          )}
          <h2 className="text-xl font-bold text-white">
            {isEditing ? 'Edit Video' : selectedVideo ? 'Now Playing' : 'Recordings'}
          </h2>
        </div>
        {!isProcessing && (
            <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
            >
            <X size={24} />
            </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : selectedVideo ? (
          // Player / Editor View
          <div className="flex flex-col h-full items-center justify-center p-4">
            
            {/* Video Container */}
            <div 
                ref={editorContainerRef}
                className="w-full max-w-4xl bg-black rounded-2xl overflow-hidden border border-slate-700 shadow-2xl relative group aspect-video"
                onMouseMove={isEditing ? handleDragMove : undefined}
                onTouchMove={isEditing ? handleDragMove : undefined}
                onMouseUp={isEditing ? handleDragEnd : undefined}
                onTouchEnd={isEditing ? handleDragEnd : undefined}
                onMouseLeave={isEditing ? handleDragEnd : undefined}
            >
              <video 
                src={URL.createObjectURL(selectedVideo.blob)} 
                controls={!isEditing && !isProcessing}
                autoPlay={!isEditing && !isProcessing}
                loop={isEditing}
                muted={isEditing} // Mute while editing
                className={`w-full h-full bg-black object-contain ${isEditing ? 'opacity-80' : ''}`}
              />

              {/* Editor Overlay Layer */}
              {isEditing && (
                  <div className="absolute inset-0 pointer-events-none">
                      <div 
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move pointer-events-auto select-none"
                        style={{ left: `${overlay.x}%`, top: `${overlay.y}%` }}
                        onMouseDown={handleDragStart}
                        onTouchStart={handleDragStart}
                      >
                          <p 
                            style={{ 
                                color: overlay.color, 
                                fontSize: `${overlay.fontSize}px`, 
                                textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: 'bold'
                            }}
                          >
                              {overlay.text}
                          </p>
                          <div className="absolute inset-0 border-2 border-white/30 rounded-lg -m-2 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                             <Move size={16} className="text-white drop-shadow-md" />
                          </div>
                      </div>
                  </div>
              )}

              {/* Processing Overlay */}
              {isProcessing && (
                  <div className="absolute inset-0 bg-slate-900/90 z-50 flex flex-col items-center justify-center">
                      <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
                      <p className="text-white font-medium mb-2">Saving Video...</p>
                      <div className="w-64 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 transition-all duration-200" 
                            style={{ width: `${processingProgress}%` }}
                          />
                      </div>
                  </div>
              )}
            </div>

            {/* Controls */}
            <div className="mt-6 flex flex-col items-center gap-4 w-full max-w-4xl">
              
              {!isEditing ? (
                  // Normal Player Controls
                  <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-all font-medium shadow-lg shadow-blue-500/20"
                    >
                        <Edit2 size={18} />
                        Edit / Add Text
                    </button>
                    <button 
                        onClick={(e) => handleDownload(e, selectedVideo)}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full transition-all font-medium text-slate-200"
                    >
                        <Download size={18} />
                        Download
                    </button>
                    <button 
                        onClick={(e) => handleDelete(e, selectedVideo.id)}
                        className="flex items-center gap-2 px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-full transition-all font-medium"
                    >
                        <Trash2 size={18} />
                        Delete
                    </button>
                </div>
              ) : (
                  // Editor Toolbar
                  <div className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 animate-in slide-in-from-bottom-4 shadow-xl">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                          
                          {/* Text Input */}
                          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                              <Type size={18} className="text-slate-400" />
                              <input 
                                type="text" 
                                value={overlay.text}
                                onChange={(e) => setOverlay({...overlay, text: e.target.value})}
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                placeholder="Enter text..."
                              />
                          </div>

                          {/* Font Size */}
                          <div className="flex items-center gap-2">
                             <span className="text-xs text-slate-400 uppercase font-bold">Size</span>
                             <input 
                                type="range" 
                                min="20" 
                                max="100" 
                                value={overlay.fontSize}
                                onChange={(e) => setOverlay({...overlay, fontSize: parseInt(e.target.value)})}
                                className="w-24 accent-blue-500"
                             />
                          </div>

                          {/* Color Picker */}
                          <div className="flex items-center gap-2">
                              <Palette size={18} className="text-slate-400" />
                              <div className="flex gap-1">
                                  {['#ffffff', '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#000000'].map(c => (
                                      <button
                                        key={c}
                                        onClick={() => setOverlay({...overlay, color: c})}
                                        className={`w-6 h-6 rounded-full border-2 ${overlay.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                                        style={{ backgroundColor: c }}
                                      />
                                  ))}
                              </div>
                          </div>

                          <div className="w-px h-8 bg-slate-700 mx-2 hidden md:block" />

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2">
                              <button 
                                onClick={() => setIsEditing(false)}
                                disabled={isProcessing}
                                className="px-4 py-2 hover:bg-slate-700 rounded-lg text-sm text-slate-300"
                              >
                                  Cancel
                              </button>
                              <button 
                                onClick={saveEditedVideo}
                                disabled={isProcessing}
                                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-wait"
                              >
                                  {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                  Save Video
                              </button>
                          </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-2 text-center md:text-left">
                          Drag text on video to position. Saving re-renders the video.
                      </p>
                  </div>
              )}
            </div>
          </div>
        ) : videos.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
            <Film size={64} className="opacity-20" />
            <p>No recordings yet</p>
          </div>
        ) : (
          // List View
          <div className="h-full overflow-y-auto p-4 md:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 align-top content-start">
            {videos.map((video) => (
              <div 
                key={video.id}
                onClick={() => setSelectedVideo(video)}
                className="group relative bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-blue-500 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 flex flex-col shadow-sm hover:shadow-lg hover:shadow-blue-500/10"
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-slate-800 relative group-hover:bg-slate-700 transition-colors overflow-hidden">
                  <Thumbnail video={video} />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-black/40">
                    <div className="bg-blue-600 rounded-full p-3 shadow-lg scale-90 group-hover:scale-100 transition-transform">
                      <Play size={24} fill="white" className="text-white ml-1" />
                    </div>
                  </div>
                </div>
                
                {/* Info */}
                <div className="p-4">
                  <h3 className="font-medium text-white truncate pr-6">{video.name}</h3>
                  <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
                    <span>{formatDate(video.createdAt)}</span>
                    <span>{formatSize(video.size)}</span>
                  </div>
                </div>

                {/* Actions (Absolute) */}
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  <button 
                    onClick={(e) => handleDownload(e, video)}
                    className="p-2 bg-slate-900 hover:bg-blue-600 rounded-full text-slate-300 hover:text-white shadow-sm transition-colors"
                  >
                    <Download size={14} />
                  </button>
                  <button 
                    onClick={(e) => handleDelete(e, video.id)}
                    className="p-2 bg-slate-900 hover:bg-red-600 rounded-full text-slate-300 hover:text-white shadow-sm transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useEffect, useState, useRef } from 'react';
import { X, Play, Trash2, Download, Film, ChevronLeft } from 'lucide-react';
import { getVideos, deleteVideo, StoredVideo } from '../utils/video-storage';

interface VideoGalleryProps {
  onClose: () => void;
}

export const VideoGallery: React.FC<VideoGalleryProps> = ({ onClose }) => {
  const [videos, setVideos] = useState<StoredVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<StoredVideo | null>(null);

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

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl flex flex-col animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10 bg-black/50">
        <div className="flex items-center gap-3">
          {selectedVideo ? (
            <button 
              onClick={() => setSelectedVideo(null)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronLeft className="text-white" />
            </button>
          ) : (
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Film className="text-blue-400" size={24} />
            </div>
          )}
          <h2 className="text-xl font-bold text-white">
            {selectedVideo ? 'Now Playing' : 'Recordings'}
          </h2>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
        >
          <X size={24} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : selectedVideo ? (
          // Player View
          <div className="flex flex-col h-full items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative group">
              <video 
                src={URL.createObjectURL(selectedVideo.blob)} 
                controls 
                autoPlay 
                className="w-full max-h-[70vh] aspect-video bg-black"
              />
            </div>
            <div className="mt-6 flex items-center gap-4">
              <button 
                onClick={(e) => handleDownload(e, selectedVideo)}
                className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all font-medium"
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
          </div>
        ) : videos.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
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
                className="group relative bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/30 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 flex flex-col"
              >
                {/* Thumbnail Placeholder */}
                <div className="aspect-video bg-black/40 flex items-center justify-center group-hover:bg-black/60 transition-colors relative">
                  <Film size={32} className="text-gray-600 group-hover:text-blue-400 transition-colors" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity scale-90 group-hover:scale-100">
                    <div className="bg-blue-600 rounded-full p-3 shadow-lg shadow-blue-900/50">
                      <Play size={24} fill="white" className="text-white ml-1" />
                    </div>
                  </div>
                </div>
                
                {/* Info */}
                <div className="p-4">
                  <h3 className="font-medium text-white truncate pr-6">{video.name}</h3>
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                    <span>{formatDate(video.createdAt)}</span>
                    <span>{formatSize(video.size)}</span>
                  </div>
                </div>

                {/* Actions (Absolute) */}
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => handleDownload(e, video)}
                    className="p-2 bg-black/60 hover:bg-blue-600 rounded-full text-white backdrop-blur-sm transition-colors"
                  >
                    <Download size={14} />
                  </button>
                  <button 
                    onClick={(e) => handleDelete(e, video.id)}
                    className="p-2 bg-black/60 hover:bg-red-600 rounded-full text-white backdrop-blur-sm transition-colors"
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

"use client";

import { Download, Share2, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";

interface VideoResultProps {
  videoUrl: string;
  onReset: () => void;
}

export function VideoResult({ videoUrl, onReset }: VideoResultProps) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pageUrl, setPageUrl] = useState("https://dreamroom.app/result/123");

  useEffect(() => {
    setPageUrl(window.location.href);
  }, []);

  const handleShare = async () => {
    setShowShareModal(true);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Your viral room transformation is ready 🎬</h2>
        <p className="text-zinc-400 font-medium">Ready to post and rack up the views.</p>
      </div>

      <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl mb-6 relative group">
        {/* Using standard video tag instead of next/video to keep things simple and functional for standard URLs */}
        <video 
          src={videoUrl} 
          controls 
          autoPlay 
          loop 
          className="w-full h-full object-contain bg-black"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full">
        <button 
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-black px-6 py-4 rounded-xl font-bold text-lg transition-transform active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
        >
          <Share2 size={20} />
          Share to Social
        </button>
        <a 
          href={videoUrl} 
          download="transformation.mp4"
          target="_blank"
          className="flex-1 flex items-center justify-center gap-2 bg-surface hover:bg-surface-hover border border-surface-border text-foreground px-6 py-4 rounded-xl font-medium transition-transform active:scale-95"
        >
          <Download size={20} />
          Download .mp4
        </a>
      </div>

      <button 
        onClick={onReset}
        className="mt-8 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors p-2"
      >
        <RotateCcw size={16} />
        <span className="text-sm font-medium">Transform another room</span>
      </button>

      {/* Mini Share Modal Overlay */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowShareModal(false)}>
          <div className="bg-surface border border-surface-border p-6 rounded-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-2">Share your creation</h3>
            <p className="text-sm text-zinc-400 mb-6">Download the video and post it with your favorite trending audio.</p>
            
            <div className="flex bg-black rounded-lg p-2 mb-4 items-center gap-2 border border-surface-border">
              <input 
                type="text" 
                readOnly 
                value={pageUrl} 
                className="bg-transparent flex-1 text-sm outline-none text-zinc-300 px-2"
              />
              <button 
                onClick={copyLink}
                className="bg-accent text-black px-3 py-1.5 rounded-md text-sm font-bold"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            
            <p className="text-xs text-center text-zinc-500 mt-4">
              Best for Instagram Reels • TikTok • X
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { Share2, RotateCcw } from "lucide-react";

interface VideoResultProps {
  videoUrl: string;
  onReset: () => void;
  onShareClick: () => void;
}

export function VideoResult({ videoUrl, onReset, onShareClick }: VideoResultProps) {
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Your viral room transformation is ready 🎬</h2>
        <p className="text-zinc-400 font-medium">Ready to post and rack up the views.</p>
      </div>

      <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl mb-6 relative group">
        <video 
          src={videoUrl} 
          controls 
          autoPlay 
          muted
          loop 
          className="w-full h-full object-contain bg-black"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 w-full">
        <button
          onClick={onShareClick}
          className="group relative flex items-center justify-center gap-3 bg-accent hover:bg-black text-black hover:text-white border-2 border-accent px-8 py-6 rounded-2xl font-black text-xl transition-all shadow-[0_10px_30px_rgba(245,158,11,0.3)] hover:-translate-y-1 active:scale-95"
        >
          <Share2 size={24} />
          SHARE WITH FRIENDS ✨
        </button>
      </div>

      <button 
        onClick={onReset}
        className="mt-8 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors p-2"
      >
        <RotateCcw size={16} />
        <span className="text-sm font-medium">Transform another room</span>
      </button>
    </div>
  );
}

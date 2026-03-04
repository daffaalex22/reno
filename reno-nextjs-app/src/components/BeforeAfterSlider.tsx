"use client";

import { useState, useRef, useEffect } from "react";
import { MoveLeft, MoveRight } from "lucide-react";

interface BeforeAfterSliderProps {
  beforeUrl: string;
  afterUrl: string;
}

export function BeforeAfterSlider({ beforeUrl, afterUrl }: BeforeAfterSliderProps) {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderPos(Number(e.target.value));
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl bg-zinc-900 select-none group"
    >
      {/* After Image (Background) */}
      <img 
        src={afterUrl} 
        alt="Renovated room" 
        draggable="false"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />

      {/* Before Image (Foreground, clipped with clip-path) */}
      <div 
        className="absolute inset-0 w-full h-full border-r-2 border-white/50 z-10 pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
      >
        <img 
          src={beforeUrl} 
          alt="Original room" 
          draggable="false"
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Label for Before */}
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white text-[10px] uppercase tracking-widest px-2 py-1 rounded-md font-bold">
          Before
        </div>
      </div>

      {/* Label for After */}
      <div className="absolute top-4 right-4 bg-accent/90 text-black text-[10px] uppercase tracking-widest px-2 py-1 rounded-md font-bold pointer-events-none">
        After
      </div>

      {/* Custom Slider Handle */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize pointer-events-none z-30"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center text-zinc-800">
           <div className="flex gap-0.5">
             <MoveLeft size={14} strokeWidth={3} />
             <MoveRight size={14} strokeWidth={3} />
           </div>
        </div>
      </div>

      {/* Invisible Range Input Overlay */}
      <input 
        type="range"
        min="0"
        max="100"
        value={sliderPos}
        onChange={handleSliderChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-40"
      />
      
      {/* Interaction Hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-sm text-zinc-300 text-[11px] px-3 py-1.5 rounded-full pointer-events-none transition-opacity duration-300 group-hover:opacity-0 opacity-100 z-50">
        Drag to see transformation
      </div>
    </div>
  );
}

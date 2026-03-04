import { useState, useRef, useImperativeHandle, forwardRef } from "react";
import { MoveLeft, MoveRight } from "lucide-react";

interface BeforeAfterSliderProps {
  beforeUrl: string;
  afterUrl: string;
}

export interface BeforeAfterHandle {
  captureComparison: () => Promise<string>;
}

export const BeforeAfterSlider = forwardRef<BeforeAfterHandle, BeforeAfterSliderProps>(
  ({ beforeUrl, afterUrl }, ref) => {
    const [sliderPos, setSliderPos] = useState(50);
    const containerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      captureComparison: async () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not get canvas context");

        // Load both images
        const loadImage = (url: string) =>
          new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
          });

        const [imgBefore, imgAfter] = await Promise.all([
          loadImage(beforeUrl),
          loadImage(afterUrl),
        ]);

        // Use natural dimensions of the after image as base
        canvas.width = imgAfter.naturalWidth;
        canvas.height = imgAfter.naturalHeight;

        // 1. Draw After Image (Full background)
        ctx.drawImage(imgAfter, 0, 0);

        // 2. Draw Before Image (Clipped)
        const splitX = (sliderPos / 100) * canvas.width;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, splitX, canvas.height);
        ctx.clip();
        ctx.drawImage(imgBefore, 0, 0, imgBefore.naturalWidth, imgBefore.naturalHeight, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        // 3. Draw Divider Line
        ctx.strokeStyle = "white";
        ctx.lineWidth = canvas.width * 0.005; // Scaling width
        ctx.beginPath();
        ctx.moveTo(splitX, 0);
        ctx.lineTo(splitX, canvas.height);
        ctx.stroke();

        // 4. Draw Labels
        const fontSize = Math.round(canvas.height * 0.04);
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textBaseline = "top";

        // Before Label
        const padding = fontSize * 0.5;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        const beforeText = "BEFORE";
        const beforeWidth = ctx.measureText(beforeText).width;
        ctx.fillRect(20, 20, beforeWidth + padding * 2, fontSize + padding * 2);
        ctx.fillStyle = "white";
        ctx.fillText(beforeText, 20 + padding, 20 + padding);

        // After Label
        ctx.fillStyle = "rgba(245, 158, 11, 0.9)"; // Reno Accent
        const afterText = "AFTER";
        const afterWidth = ctx.measureText(afterText).width;
        ctx.fillRect(canvas.width - afterWidth - padding * 2 - 20, 20, afterWidth + padding * 2, fontSize + padding * 2);
        ctx.fillStyle = "black";
        ctx.fillText(afterText, canvas.width - afterWidth - padding - 20, 20 + padding);

        // 5. Reno Branding (Bottom Right)
        ctx.font = `bold ${fontSize * 1.2}px sans-serif`;
        ctx.fillStyle = "white";
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        // Subtle shadow for brand
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 10;
        ctx.fillText("Reno AI ✨", canvas.width - 20, canvas.height - 20);

        return canvas.toDataURL("image/jpeg", 0.95);
      },
    }));

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
);

BeforeAfterSlider.displayName = "BeforeAfterSlider";


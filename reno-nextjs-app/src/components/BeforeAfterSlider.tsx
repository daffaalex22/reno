import { useState, useRef, useImperativeHandle, forwardRef, useEffect } from "react";
import { MoveLeft, MoveRight } from "lucide-react";

interface BeforeAfterSliderProps {
  beforeUrl: string;
  afterUrl: string;
}

export interface BeforeAfterHandle {
  captureComparison: () => Promise<string>;
  captureStoryCard: () => Promise<string>;
}

export const BeforeAfterSlider = forwardRef<BeforeAfterHandle, BeforeAfterSliderProps>(
  ({ beforeUrl, afterUrl }, ref) => {
    const [sliderPos, setSliderPos] = useState(50);
    const [isAutoAnimating, setIsAutoAnimating] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const animationIdRef = useRef(0); // For cancellation

    // Auto-reveal logic
    const startIdleTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        runAutoReveal();
      }, 1000); // 1s of silence triggers the magic
    };

    const runAutoReveal = async () => {
      const currentAnimationId = ++animationIdRef.current;
      setIsAutoAnimating(true);

      const checkValid = () => currentAnimationId === animationIdRef.current;

      // Sequence: 0 -> 100 -> 50
      if (!checkValid()) return;
      setSliderPos(0);
      await new Promise(r => setTimeout(r, 1200));

      if (!checkValid()) return;
      setSliderPos(100);
      await new Promise(r => setTimeout(r, 1200));

      if (!checkValid()) return;
      setSliderPos(50);
      await new Promise(r => setTimeout(r, 1200));

      if (!checkValid()) return;
      setIsAutoAnimating(false);
      startIdleTimer(); // Re-queue next sweep
    };

    const stopAutoReveal = () => {
      animationIdRef.current++; // Kill ongoing sweep
      setIsAutoAnimating(false);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      startIdleTimer(); // Reset the 1s countdown
    };

    useEffect(() => {
      // Run immediately on first load
      runAutoReveal();
      return () => {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      };
    }, []);

    useImperativeHandle(ref, () => ({
      // ... (capture logic remains same)
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



        return canvas.toDataURL("image/jpeg", 0.95);
      },
      captureStoryCard: async () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not get canvas context");

        // Standard 9:16 Portrait (1080x1920)
        canvas.width = 1080;
        canvas.height = 1920;

        // Load images
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

        // 1. Draw Blurred Background (using the after image)
        ctx.filter = "blur(50px) brightness(0.6)";
        ctx.drawImage(imgAfter, -100, -100, canvas.width + 200, canvas.height + 200);
        ctx.filter = "none";

        // 2. Layout Constants
        const margin = 60;
        const cardWidth = canvas.width - margin * 2;
        const cardHeight = (canvas.height - margin * 4) / 2;

        // Helper to draw rounded image card
        const drawRoundedImage = (img: HTMLImageElement, y: number, label: string, accent = false) => {
          ctx.save();
          // Draw card shadow
          ctx.shadowColor = "rgba(0,0,0,0.4)";
          ctx.shadowBlur = 40;
          ctx.shadowOffsetY = 20;

          // Clip path for rounded corners
          const radius = 40;
          ctx.beginPath();
          ctx.moveTo(margin + radius, y);
          ctx.lineTo(margin + cardWidth - radius, y);
          ctx.quadraticCurveTo(margin + cardWidth, y, margin + cardWidth, y + radius);
          ctx.lineTo(margin + cardWidth, y + cardHeight - radius);
          ctx.quadraticCurveTo(margin + cardWidth, y + cardHeight, margin + cardWidth - radius, y + cardHeight);
          ctx.lineTo(margin + radius, y + cardHeight);
          ctx.quadraticCurveTo(margin, y + cardHeight, margin, y + cardHeight - radius);
          ctx.lineTo(margin, y + radius);
          ctx.quadraticCurveTo(margin, y, margin + radius, y);
          ctx.closePath();
          ctx.clip();

          // Draw Image (Object-fit: cover implementation)
          const imgRatio = img.width / img.height;
          const cardRatio = cardWidth / cardHeight;
          let sw, sh, sx, sy;
          if (imgRatio > cardRatio) {
            sh = img.height;
            sw = sh * cardRatio;
            sx = (img.width - sw) / 2;
            sy = 0;
          } else {
            sw = img.width;
            sh = sw / cardRatio;
            sx = 0;
            sy = (img.height - sh) / 2;
          }
          ctx.drawImage(img, sx, sy, sw, sh, margin, y, cardWidth, cardHeight);
          ctx.restore();

          // Draw Label Pill
          ctx.save();
          const fontSize = 48;
          ctx.font = `bold ${fontSize}px sans-serif`;
          const textWidth = ctx.measureText(label).width;
          const pillPadding = 24;
          const pillWidth = textWidth + pillPadding * 2;
          const pillHeight = fontSize + pillPadding;
          const pillX = margin + 30;
          const pillY = y + 30;

          ctx.fillStyle = accent ? "#f59e0b" : "rgba(0,0,0,0.7)";
          ctx.beginPath();
          ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 16);
          ctx.fill();

          ctx.fillStyle = accent ? "black" : "white";
          ctx.fillText(label, pillX + pillPadding, pillY + pillHeight - 14);
          ctx.restore();
        };

        // Draw the stacks
        drawRoundedImage(imgBefore, margin * 2, "BEFORE");
        drawRoundedImage(imgAfter, cardHeight + margin * 2.5, "AFTER", true);



        return canvas.toDataURL("image/jpeg", 0.9);
      },
    }));

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      animationIdRef.current++; // Ensure no sweep starts while dragging
      setIsAutoAnimating(false);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      setSliderPos(Number(e.target.value));
    };

    return (
      <div
        ref={containerRef}
        className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl bg-zinc-900 select-none group"
        onMouseEnter={stopAutoReveal}
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
          style={{
            clipPath: `inset(0 ${100 - sliderPos}% 0 0)`,
            transition: isAutoAnimating ? "clip-path 1.2s cubic-bezier(0.4, 0, 0.2, 1)" : "none"
          }}
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
          style={{
            left: `${sliderPos}%`,
            transition: isAutoAnimating ? "left 1.2s cubic-bezier(0.4, 0, 0.2, 1)" : "none"
          }}
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
          onMouseDown={() => {
            animationIdRef.current++; // Kill ongoing sweep
            setIsAutoAnimating(false);
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
          }}
          onMouseUp={startIdleTimer}
          onTouchStart={() => {
            animationIdRef.current++;
            setIsAutoAnimating(false);
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
          }}
          onTouchEnd={startIdleTimer}
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


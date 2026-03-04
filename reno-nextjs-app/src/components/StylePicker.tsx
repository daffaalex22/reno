"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { ImageUploader } from "./ImageUploader";

export type StyleOption =
  | "Modern Minimalist"
  | "Japandi"
  | "Industrial"
  | "Bohemian"
  | "Scandinavian"
  | "Mid-Century Modern"
  | "Coastal"
  | "Modern Farmhouse";

interface StylePickerProps {
  onStyleSelected: (style: StyleOption) => void;
}

const PRESETS = [
  { id: "Modern Minimalist", image: "/presets/modern-minimalist.png" },
  { id: "Japandi", image: "/presets/japandi.png" },
  { id: "Industrial", image: "/presets/industrial.png" },
  { id: "Bohemian", image: "/presets/bohemian.png" },
  { id: "Scandinavian", image: "/presets/scandinavian.png" },
  { id: "Mid-Century Modern", image: "/presets/mid-century-modern.png" },
  { id: "Coastal", image: "/presets/coastal.png" },
  { id: "Modern Farmhouse", image: "/presets/modern-farmhouse.png" },
];

export function StylePicker({ onStyleSelected }: StylePickerProps) {
  const [selected, setSelected] = useState<StyleOption | null>(null);

  const handleSelect = (style: StyleOption) => {
    setSelected(style);
    onStyleSelected(style);
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <span className="text-sm font-medium text-foreground">Pick a Style</span>
      <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {PRESETS.map((preset) => (
          <div
            key={preset.id}
            onClick={() => handleSelect(preset.id as StyleOption)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelect(preset.id as StyleOption); }}
            role="button"
            tabIndex={0}
            aria-pressed={selected === preset.id}
            className={`relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
              selected === preset.id ? "border-accent shadow-[0_0_15px_rgba(245,158,11,0.3)]" : "border-surface hover:border-surface-border relative bg-surface"
            }`}
          >
            <div className="absolute inset-0 bg-surface-hover/50 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preset.image} alt={preset.id} className="w-full h-24 object-cover" onError={(e) => { e.currentTarget.style.display='none'; }} />
            </div>
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/10 flex items-end p-2 pointer-events-none">
              <span className="text-[10px] font-medium text-white">{preset.id}</span>
            </div>
            {selected === preset.id && (
              <div className="absolute top-2 right-2 bg-accent text-black rounded-full p-0.5">
                <Check size={12} strokeWidth={3} />
              </div>
            )}
            <div className="w-full h-24"></div> {/* spacer */}
          </div>))}
      </div>
    </div>
  );
}

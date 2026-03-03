"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { ImageUploader } from "./ImageUploader";

export type StyleOption = "Modern Minimalist" | "Japandi" | "Industrial" | "Bohemian" | "Custom";

interface StylePickerProps {
  onStyleSelected: (style: StyleOption) => void;
  onCustomImageSelected: (file: File | null) => void;
}

const PRESETS = [
  { id: "Modern Minimalist", image: "/presets/modern-minimalist.png" },
  { id: "Japandi", image: "/presets/japandi.png" },
  { id: "Industrial", image: "/presets/industrial.png" },
  { id: "Bohemian", image: "/presets/bohemian.png" },
];

export function StylePicker({ onStyleSelected, onCustomImageSelected }: StylePickerProps) {
  const [selected, setSelected] = useState<StyleOption | null>(null);
  const [customFile, setCustomFile] = useState<File | null>(null);

  const handleSelect = (style: StyleOption) => {
    setSelected(style);
    onStyleSelected(style);
    if (style !== "Custom") {
      setCustomFile(null);
      onCustomImageSelected(null);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <span className="text-sm font-medium text-foreground">Pick a Style</span>
      <div className="grid grid-cols-2 gap-3">
        {PRESETS.map((preset) => (
          <div
            key={preset.id}
            onClick={() => handleSelect(preset.id as StyleOption)}
            className={`relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
              selected === preset.id ? "border-accent shadow-[0_0_15px_rgba(245,158,11,0.3)]" : "border-surface hover:border-surface-border relative bg-surface"
            }`}
          >
            {/* Placeholder for images while they don't exist */}
            <div className="absolute inset-0 bg-surface-hover/50 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preset.image} alt={preset.id} className="w-full h-24 object-cover" onError={(e) => { e.currentTarget.style.display='none'; }} />
            </div>
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/10 flex items-end p-2 pointer-events-none">
              <span className="text-xs font-medium text-white">{preset.id}</span>
            </div>
            {selected === preset.id && (
              <div className="absolute top-2 right-2 bg-accent text-black rounded-full p-0.5">
                <Check size={12} strokeWidth={3} />
              </div>
            )}
            <div className="w-full h-24"></div> {/* spacer */}
          </div>
        ))}
        
        {/* Custom Style Tile */}
        <div
            onClick={() => handleSelect("Custom")}
            className={`relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all flex items-center justify-center bg-surface h-24 ${
              selected === "Custom" ? "border-accent shadow-[0_0_15px_rgba(245,158,11,0.3)]" : "border-surface-border hover:bg-surface-hover"
            }`}
          >
            <span className="text-xs font-medium text-foreground">Custom Reference</span>
            {selected === "Custom" && (
              <div className="absolute top-2 right-2 text-accent">
                <Check size={12} strokeWidth={3} />
              </div>
            )}
        </div>
      </div>

      {selected === "Custom" && (
        <div className="mt-2 animate-in fade-in slide-in-from-top-2">
          <ImageUploader 
            label="Upload your style reference" 
            selectedFile={customFile}
            onImageSelected={(file) => {
              setCustomFile(file);
              onCustomImageSelected(file);
            }} 
          />
        </div>
      )}
    </div>
  );
}

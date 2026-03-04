"use client";

import { useState, useEffect } from "react";
import { Check, Loader2 } from "lucide-react";

interface Step {
  id: number;
  label: string;
}

const STEPS: Step[] = [
  { id: 0, label: "Generating renovated room" },
  { id: 1, label: "Creating AI narration" },
  { id: 2, label: "Rendering cinematic video" },
  { id: 3, label: "Finalizing and serving" },
];

const LOADING_MESSAGES = [
  "Hold tight! Our AI is reimagining your space...",
  "Did you know? Natural light makes a room look more spacious.",
  "Before & after videos are 80% more likely to go viral on social media.",
  "Almost there! Adding those final cinematic touches...",
  "Japandi style blends Japanese minimalism with Scandinavian functionality.",
  "Thank you for your patience! Good things take a little time.",
  "A pop of color can completely change the mood of a room.",
  "Generating high-quality video requires a little magic (and compute).",
  "Mixing textures creates visual interest without clutter.",
  "Fun fact: Plants not only look great but can also improve indoor air quality.",
  "Bohemian interiors are all about carefree layers and worldly collections.",
  "Lighting is everything. Try using warm bulbs for a cozier atmosphere.",
  "The 'Industrial' look often features exposed brick and raw metal accents.",
  "Rugs anchor a room and help define different living zones.",
  "Creating smooth video transitions takes millions of AI calculations.",
  "Modern minimalist rooms focus on 'less is more' with clean lines.",
  "A large statement piece of art can instantly elevate a basic wall.",
  "Mirrors are a designer's secret weapon to bouncing light around a room.",
  "Your video is being rendered pixel by pixel in the cloud...",
];

export function ProgressStepper({ currentStep }: { currentStep: number }) {
  const percentComplete = ((currentStep) / (STEPS.length - 1)) * 100;
  const [messageIndex, setMessageIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        setFade(true);
      }, 300); // Wait for fade out
    }, 6000); // Cycle every 6 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-surface border border-surface-border rounded-2xl shadow-xl">
      <h3 className="text-lg font-semibold mb-6">Working our AI magic...</h3>
      
      <div className="flex flex-col gap-6">
        {STEPS.map((step, index) => {
          const isCompleted = currentStep > index;
          const isActive = currentStep === index;
          
          return (
            <div key={step.id} className="flex items-center gap-4">
              <div className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                isCompleted ? "bg-accent text-black" : 
                isActive ? "bg-accent/20 text-accent border border-accent border-dashed" : 
                "bg-surface-border text-zinc-500"
              }`}>
                {isCompleted ? <Check size={16} strokeWidth={3} /> : 
                 isActive ? <Loader2 size={16} className="animate-spin" /> : 
                 <span className="text-xs font-bold">{index + 1}</span>}
              </div>
              <span className={`text-sm font-medium ${isActive || isCompleted ? "text-foreground" : "text-zinc-500"}`}>
                {step.label} {isActive && "..."}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <div className="h-2 w-full bg-surface-border rounded-full overflow-hidden relative">
          <div 
            className="absolute top-0 left-0 h-full bg-accent transition-all duration-500 ease-out" 
            style={{ width: `${Math.max(5, percentComplete)}%` }}
          />
        </div>
        <p className={`text-xs text-zinc-400 mt-3 text-center transition-opacity duration-300 ${fade ? "opacity-100" : "opacity-0"}`}>
          {LOADING_MESSAGES[messageIndex]}
        </p>
      </div>
    </div>
  );
}

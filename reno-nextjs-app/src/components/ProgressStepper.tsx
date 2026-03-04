"use client";

import { useState, useEffect } from "react";
import { Check, Loader2, HelpCircle, ChevronDown, Clock } from "lucide-react";

interface Step {
  id: number;
  label: string;
}

const STEPS: Step[] = [
  { id: 0, label: "AI Room Reimagination" },
  { id: 1, label: "AI Voiceover & Script" },
  { id: 2, label: "Cinematic AI Animation" },
  { id: 3, label: "Final Merging & Polish" },
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

export function ProgressStepper({
  currentStep,
  startedAt,
  finishedAt,
  onCancel
}: {
  currentStep: number;
  startedAt?: number | null;
  finishedAt?: number | null;
    onCancel?: () => void;
}) {
  const percentComplete = Math.min(100, (currentStep / STEPS.length) * 100);
  const [messageIndex, setMessageIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    // Sync timer with actual creation/finish time if available
    if (startedAt) {
      const endTime = finishedAt || Date.now();
      const diff = Math.floor((endTime - startedAt) / 1000);
      setElapsedSeconds(Math.max(0, diff));
    }

    // Only set up interval if we haven't finished yet
    if (finishedAt) return;

    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [startedAt, finishedAt]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Working our AI magic...</h3>
        <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 rounded-full border border-white/5 text-zinc-400 text-sm font-mono">
          {formatTime(elapsedSeconds)}
        </div>
      </div>
      
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

      <div className="mt-8 pt-6 border-t border-surface-border">
        <button
          onClick={() => setShowExplanation(!showExplanation)}
          className="w-full flex items-center justify-between text-zinc-500 hover:text-zinc-300 transition-colors text-xs font-bold uppercase tracking-widest"
        >
          <div className="flex items-center gap-2">
            <HelpCircle size={14} />
            <span>Why is this taking so long?</span>
          </div>
          <ChevronDown size={14} className={`transition-transform duration-300 ${showExplanation ? "rotate-180" : ""}`} />
        </button>

        <div
          className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-in-out ${showExplanation ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0 mt-0"
            }`}
        >
          <div className="overflow-hidden text-[11px] text-zinc-500 leading-relaxed">
            {currentStep === 0 ? (
              <div className="py-1">
                Generating high-quality AI renders requires complex model execution and prompt engineering.
                <div className="mt-2 text-accent font-medium">Estimated wait: ~30 seconds.</div>
              </div>
            ) : (
              <div className="py-1">
                Generating cinematic videos requires massive compute. Our AI renders thousands of frames and generates a personalized voiceover.
                <div className="mt-2 text-accent font-medium">Estimated wait: 10-15 minutes.</div>
              </div>
            )}

            {onCancel && (
              <div className="mt-4 pt-3 border-t border-zinc-800/50">
                <button
                  onClick={onCancel}
                  className="text-red-500 hover:text-red-400 font-bold transition-colors w-full text-center py-2"
                >
                  Cancel and start over
                </button>
              </div>
            )}
          </div>
        </div>

        {currentStep > 0 && (
          <div className="mt-4 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 flex items-center gap-3 animate-in fade-in duration-500">
            <Clock size={16} className="text-accent" />
            <p className="text-[10px] text-zinc-400">
              <span className="text-white">Progress is saved!</span> Feel free to close this tab. Come back later and your video will be waiting.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

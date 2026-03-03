"use client";

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

export function ProgressStepper({ currentStep }: { currentStep: number }) {
  const percentComplete = ((currentStep) / (STEPS.length - 1)) * 100;

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
        <p className="text-xs text-zinc-400 mt-3 text-center">This usually takes about 2–3 minutes.</p>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { ImageUploader } from "@/components/ImageUploader";
import { StylePicker, StyleOption } from "@/components/StylePicker";
import { ProgressStepper } from "@/components/ProgressStepper";
import { VideoResult } from "@/components/VideoResult";
import { Sparkles } from "lucide-react";

type AppState = "idle" | "loading" | "result";

export default function Home() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [roomFile, setRoomFile] = useState<File | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<StyleOption | null>(null);
  const [customStyleFile, setCustomStyleFile] = useState<File | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  
  // Loading state simulation
  const [currentStep, setCurrentStep] = useState(0);
  const [videoUrl, setVideoUrl] = useState("");

  const canGenerate = roomFile && selectedStyle !== null && (selectedStyle !== "Custom" || customStyleFile !== null);

  const handleGenerate = () => {
    if (!canGenerate) return;
    
    setAppState("loading");
    setCurrentStep(0);
    
    // Simulate generation pipeline 
    const timing = [2000, 3000, 3000, 2000];
    
    let step = 0;
    const nextStep = () => {
      if (step < timing.length) {
        setTimeout(() => {
          step++;
          setCurrentStep(step);
          nextStep();
        }, timing[step]);
      } else {
        // Set fake video URL and show result
        // Use a public URL for the video placeholder from an open source test video
        setVideoUrl("https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4");
        setAppState("result");
      }
    };
    
    nextStep();
  };

  const handleReset = () => {
    setAppState("idle");
    setRoomFile(null);
    setSelectedStyle(null);
    setCustomStyleFile(null);
    setCustomPrompt("");
    setCurrentStep(0);
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-start p-6 md:p-12 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-12 sm:mb-20">
        <div className="flex items-center gap-2 text-foreground font-bold tracking-tight">
          <div className="bg-accent text-black p-1.5 rounded-lg">
            <Sparkles size={16} />
          </div>
          <span>Dream Room Generator</span>
        </div>
        <div className="hidden sm:flex px-3 py-1 rounded-full border border-surface-border bg-surface text-xs font-medium text-zinc-400">
          ✨ Powered by AI · Made to share
        </div>
      </div>

      {appState === "idle" && (
        <div className="w-full flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 max-w-3xl leading-tight">
            Create your <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">viral before/after</span> room transformation.
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 mb-12 max-w-2xl">
            Upload a photo of your boring room, pick your dream aesthetic, and get a cinematic video your followers will actually share.
          </p>

          <div className="w-full bg-surface border border-surface-border rounded-3xl p-6 md:p-8 shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mb-8 text-left">
              <div className="flex flex-col gap-4">
                <ImageUploader 
                  label="1. Upload Room Photo" 
                  selectedFile={roomFile}
                  onImageSelected={setRoomFile}
                />
              </div>
              
              <div className="flex flex-col gap-4">
                <StylePicker 
                  onStyleSelected={setSelectedStyle} 
                  onCustomImageSelected={setCustomStyleFile} 
                />
              </div>
            </div>

            <div className="w-full border-t border-surface-border pt-6 mb-8 text-left">
              <label className="text-sm font-medium text-foreground block mb-2 cursor-pointer flex items-center justify-between group">
                2. Describe your vision (Optional)
              </label>
              <textarea 
                placeholder="e.g. Add more indoor plants and natural light..."
                className="w-full bg-black/50 border border-surface-border rounded-xl p-4 text-sm text-foreground focus:outline-none focus:border-accent transition-colors resize-none h-24"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className={`w-full py-5 rounded-2xl flex items-center justify-center gap-2 text-lg font-bold transition-all ${
                canGenerate 
                  ? "bg-accent hover:bg-black text-black hover:text-white border-2 border-accent shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:-translate-y-1" 
                  : "bg-surface-border text-zinc-500 cursor-not-allowed"
              }`}
            >
              <Sparkles size={20} />
              Generate My Dream Room
            </button>
          </div>
        </div>
      )}

      {appState === "loading" && (
        <div className="w-full flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
          <ProgressStepper currentStep={currentStep} />
        </div>
      )}

      {appState === "result" && (
        <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
          {/* We wait for the browser to naturally render this */}
          <VideoResult videoUrl={videoUrl} onReset={handleReset} />
        </div>
      )}
    </main>
  );
}

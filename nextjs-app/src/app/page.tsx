"use client";

import { useState, useRef, useCallback } from "react";
import { ImageUploader } from "@/components/ImageUploader";
import { StylePicker, StyleOption } from "@/components/StylePicker";
import { ProgressStepper } from "@/components/ProgressStepper";
import { VideoResult } from "@/components/VideoResult";
import { Sparkles } from "lucide-react";

type AppState = "idle" | "loading" | "result";

const PRESET_STYLE_URLS: Record<string, string> = {
  "Modern Minimalist": "/presets/modern-minimalist.png",
  "Japandi": "/presets/japandi.png",
  "Industrial": "/presets/industrial.png",
  "Bohemian": "/presets/bohemian.png",
};

export default function Home() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [roomFile, setRoomFile] = useState<File | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<StyleOption | null>(null);
  const [customStyleFile, setCustomStyleFile] = useState<File | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");

  const [currentStep, setCurrentStep] = useState(0);
  const [videoUrl, setVideoUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const canGenerate =
    roomFile &&
    selectedStyle !== null &&
    (selectedStyle !== "Custom" || customStyleFile !== null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const handleGenerate = async () => {
    if (!canGenerate || !roomFile) return;

    setAppState("loading");
    setCurrentStep(0);
    setErrorMsg("");

    try {
      // ── 1. Upload room photo ─────────────────────────────────────
      const roomForm = new FormData();
      roomForm.append("file", roomFile);
      const roomUpload = await fetch("/api/upload", { method: "POST", body: roomForm });
      if (!roomUpload.ok) throw new Error("Failed to upload room photo");
      const { publicPath: roomPublicPath } = await roomUpload.json();

      // ── 2. Resolve style image public path ────────────────────────
      let stylePublicPath: string;
      if (selectedStyle === "Custom" && customStyleFile) {
        const styleForm = new FormData();
        styleForm.append("file", customStyleFile);
        const styleUpload = await fetch("/api/upload", { method: "POST", body: styleForm });
        if (!styleUpload.ok) throw new Error("Failed to upload style image");
        const res = await styleUpload.json();
        stylePublicPath = res.publicPath;
      } else {
        // Preset images are already on disk at /public/presets/
        stylePublicPath = PRESET_STYLE_URLS[selectedStyle as string];
      }

      // ── 3. Start the generation pipeline ─────────────────────────
      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomImagePublicPath: roomPublicPath,
          styleImagePublicPath: stylePublicPath,
          style: selectedStyle,
          customPrompt: customPrompt.trim() || undefined,
        }),
      });
      if (!genRes.ok) throw new Error("Failed to start generation");
      const { jobId } = await genRes.json();

      // ── 4. Poll for status ────────────────────────────────────────
      const STEP_MAP: Record<string, number> = {
        step_image: 0,
        step_script: 1,
        step_tts: 1,
        step_video: 2,
        step_merge: 3,
        done: 3,
      };

      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/status/${jobId}`);
          const job = await statusRes.json();

          if (STEP_MAP[job.status] !== undefined) {
            setCurrentStep(STEP_MAP[job.status]);
          }

          if (job.status === "done" && job.videoUrl) {
            stopPolling();
            setVideoUrl(job.videoUrl);
            setAppState("result");
          } else if (job.status === "error") {
            stopPolling();
            setErrorMsg(job.error || "Something went wrong.");
            setAppState("idle");
          }
        } catch {
          // ignore transient poll errors
        }
      }, 5000);
    } catch (err) {
      stopPolling();
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setAppState("idle");
    }
  };

  const handleReset = () => {
    stopPolling();
    setAppState("idle");
    setRoomFile(null);
    setSelectedStyle(null);
    setCustomStyleFile(null);
    setCustomPrompt("");
    setCurrentStep(0);
    setVideoUrl("");
    setErrorMsg("");
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
            Create your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
              viral before/after
            </span>{" "}
            room transformation.
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 mb-12 max-w-2xl">
            Upload a photo of your boring room, pick your dream aesthetic, and
            get a cinematic video your followers will actually share.
          </p>

          {errorMsg && (
            <div className="w-full mb-6 p-4 bg-red-900/30 border border-red-700 rounded-xl text-left text-sm text-red-300">
              ⚠️ {errorMsg}
            </div>
          )}

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
              <label className="text-sm font-medium text-foreground block mb-2">
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
          <VideoResult videoUrl={videoUrl} onReset={handleReset} />
        </div>
      )}
    </main>
  );
}

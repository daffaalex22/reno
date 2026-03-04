"use client";

import { useState, useRef, useCallback } from "react";
import { ImageUploader } from "@/components/ImageUploader";
import { StylePicker, StyleOption } from "@/components/StylePicker";
import { ProgressStepper } from "@/components/ProgressStepper";
import { BeforeAfterSlider, BeforeAfterHandle } from "@/components/BeforeAfterSlider";
import { VideoResult } from "@/components/VideoResult";
import { Sparkles, Play, Share2, Download, RotateCcw, ImageIcon, Smartphone, X } from "lucide-react";

type AppState = "idle" | "loading" | "preview" | "result";

const PRESET_STYLE_URLS: Record<string, string> = {
  "Modern Minimalist": "/presets/modern-minimalist.png",
  "Japandi": "/presets/japandi.png",
  "Industrial": "/presets/industrial.png",
  "Bohemian": "/presets/bohemian.png",
  "Scandinavian": "/presets/scandinavian.png",
  "Mid-Century Modern": "/presets/mid-century-modern.png",
  "Coastal": "/presets/coastal.png",
  "Modern Farmhouse": "/presets/modern-farmhouse.png",
};

export default function Home() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [roomFile, setRoomFile] = useState<File | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<StyleOption | null>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [videoUrl, setVideoUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [jobId, setJobId] = useState("");
  const [previewImages, setPreviewImages] = useState<{ before: string; after: string } | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportPreviews, setExportPreviews] = useState<{ comparison?: string; story?: string }>({});

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sliderRef = useRef<BeforeAfterHandle>(null);

  const canGenerate = roomFile && selectedStyle !== null;

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
      const stylePublicPath = PRESET_STYLE_URLS[selectedStyle as string];

      // ── 3. Start the generation pipeline ─────────────────────────
      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomImagePublicPath: roomPublicPath,
          styleImagePublicPath: stylePublicPath,
          style: selectedStyle,
        }),
      });
      if (!genRes.ok) throw new Error("Failed to start generation");
      const { jobId: newJobId } = await genRes.json();
      setJobId(newJobId);

      startPolling(newJobId);
    } catch (err) {
      stopPolling();
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setAppState("idle");
    }
  };

  const startPolling = (targetJobId: string) => {
    stopPolling();
    const STEP_MAP: Record<string, number> = {
      step_image: 0,
      step_script: 1,
      step_tts: 1,
      step_video: 2,
      step_merge: 3,
      preview: 1,
      done: 4,
    };

    pollRef.current = setInterval(async () => {
      try {
        const statusRes = await fetch(`/api/status/${targetJobId}`);
        const job = await statusRes.json();

        if (STEP_MAP[job.status] !== undefined) {
          setCurrentStep(STEP_MAP[job.status]);
        }

        if (job.status === "preview" && job.renovatedImageUrl) {
          stopPolling();
          setPreviewImages({
            before: job.roomImageUrl,
            after: job.renovatedImageUrl
          });
          setAppState("preview");
        } else if (job.status === "done" && job.videoUrl) {
          stopPolling();
          setVideoUrl(job.videoUrl);
          setAppState("result");
        } else if (job.status === "error") {
          stopPolling();
          setErrorMsg(job.error || "Something went wrong.");
          setAppState("idle");
        }
      } catch {
        // ignore
      }
    }, 3000);
  };

  const handleProceedToVideo = async () => {
    if (!jobId) return;
    setAppState("loading");
    setCurrentStep(1); // Resume at script step

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      if (!res.ok) throw new Error("Failed to proceed to video");

      startPolling(jobId);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to generate video.");
      setAppState("preview");
    }
  };

  const handleReset = () => {
    stopPolling();
    setAppState("idle");
    setRoomFile(null);
    setSelectedStyle(null);
    setCurrentStep(0);
    setVideoUrl("");
    setErrorMsg("");
    setJobId("");
    setPreviewImages(null);
  };

  const handleDownloadComparison = async () => {
    if (!sliderRef.current) return;
    try {
      const dataUrl = await sliderRef.current.captureComparison();
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `reno-comparison-${Date.now()}.jpg`;
      link.click();
    } catch (err) {
      console.error("Capture failed", err);
    }
  };

  const handleShareComparison = async () => {
    if (!sliderRef.current) return;
    try {
      const dataUrl = await sliderRef.current.captureComparison();
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "reno-transformation.jpg", { type: "image/jpeg" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Check out my room transformation!",
          text: "I used Reno AI to redesign my room. What do you think?",
        });
      } else {
        // Fallback: Copy to clipboard or just download
        handleDownloadComparison();
      }
    } catch (err) {
      console.error("Share failed", err);
      handleDownloadComparison();
    }
  };

  const handleDownloadStoryCard = async () => {
    if (!sliderRef.current) return;
    try {
      const dataUrl = await sliderRef.current.captureStoryCard();
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `reno-story-${Date.now()}.jpg`;
      link.click();
    } catch (err) {
      console.error("Story capture failed", err);
    }
  };

  const handleShareStoryCard = async () => {
    if (!sliderRef.current) return;
    try {
      const dataUrl = await sliderRef.current.captureStoryCard();
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "reno-story.jpg", { type: "image/jpeg" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Check out my room transformation story!",
          text: "Redesigned my room with Reno AI. It looks incredible!",
        });
      } else {
        handleDownloadStoryCard();
      }
    } catch (err) {
      console.error("Story share failed", err);
      handleDownloadStoryCard();
    }
  };

  const openExportHub = async () => {
    setIsExportModalOpen(true);
    // Generate previews after opening to keep it snappy
    if (sliderRef.current) {
      try {
        const [comp, story] = await Promise.all([
          sliderRef.current.captureComparison(),
          sliderRef.current.captureStoryCard(),
        ]);
        setExportPreviews({ comparison: comp, story: story });
      } catch (err) {
        console.error("Preview generation failed", err);
      }
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-start p-6 md:p-12 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-12 sm:mb-20">
        <div
          className="flex items-center gap-2 text-foreground font-bold tracking-tight cursor-pointer"
          onClick={handleReset}
        >
          <div className="bg-accent text-black p-1.5 rounded-lg">
            <Sparkles size={16} />
          </div>
          <span>Reno</span>
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
                />
              </div>
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

      {appState === "preview" && previewImages && (
        <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-6">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Step 1 Complete: AI Room Transformation
            </div>
            <h2 className="text-3xl md:text-5xl font-black mb-3 italic tracking-tight uppercase leading-none">
              How does it <span className="text-accent">Look?</span>
            </h2>
            <p className="text-zinc-400 font-medium">Use the slider to compare with the original boring room.</p>
          </div>

          <BeforeAfterSlider
            ref={sliderRef}
            beforeUrl={previewImages.before}
            afterUrl={previewImages.after}
          />

          <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 mt-10">
            <button
              onClick={handleProceedToVideo}
              className="group relative flex items-center justify-center gap-3 bg-accent hover:bg-black text-black hover:text-white border-2 border-accent px-8 py-6 rounded-2xl font-black text-xl transition-all shadow-[0_10px_30px_rgba(245,158,11,0.3)] hover:-translate-y-1 active:scale-95"
            >
              <Play size={24} fill="currentColor" />
              CREATE AI VIDEO
              <div className="absolute -top-3 -right-3 bg-white text-black text-[10px] px-2 py-1 rounded-lg font-bold shadow-lg border border-zinc-200">
                RECOMMENDED
              </div>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <button
              onClick={openExportHub}
              className="flex items-center justify-center gap-2 bg-white text-black hover:bg-zinc-100 border border-zinc-200 px-4 py-4 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-white/5"
            >
              <Share2 size={20} />
              Export Image ✨
            </button>
            <button
              onClick={handleReset}
              className="flex items-center justify-center gap-2 bg-surface hover:bg-surface-hover border border-surface-border text-zinc-300 px-4 py-4 rounded-2xl font-bold transition-all hover:text-white active:scale-95"
            >
              <RotateCcw size={20} />
              Start Over
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-surface-border flex justify-center">
            <a
              href={previewImages.after}
              download="renovated-room.jpg"
              className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors text-sm font-medium"
            >
              <ImageIcon size={16} />
              Download result only (.jpg)
            </a>
          </div>

          <button
            onClick={handleReset}
            className="w-full mt-8 flex items-center justify-center gap-2 text-zinc-500 hover:text-white transition-colors"
          >
            <RotateCcw size={16} />
            <span className="text-sm font-medium">Clear and start over</span>
          </button>
        </div>
      )}

      {appState === "result" && (
        <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
          <VideoResult videoUrl={videoUrl} onReset={handleReset} />
        </div>
      )}

      {/* Export Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300" onClick={() => setIsExportModalOpen(false)}>
          <div
            className="bg-surface border border-surface-border rounded-3xl p-6 md:p-8 w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black italic uppercase tracking-tight">Export <span className="text-accent">Hub</span></h3>
              <button onClick={() => setIsExportModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex flex-col gap-6">
              {/* Story Card - HIGHLIGHTED */}
              <div className="relative group bg-gradient-to-br from-zinc-800 to-zinc-900 border-2 border-accent p-6 rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.1)]">
                <div className="absolute -top-3 right-6 bg-accent text-black text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-tighter shadow-lg">
                  Best for Social
                </div>
                <div className="flex items-start gap-4">
                  {/* Preview Thumbnail */}
                  <div className="w-24 h-40 bg-zinc-800 rounded-lg overflow-hidden border border-accent/20 flex-shrink-0 flex items-center justify-center">
                    {exportPreviews.story ? (
                      <img src={exportPreviews.story} alt="Story Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                    )}
                  </div>

                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-white mb-1">Social Story Card (9:16)</h4>
                    <p className="text-sm text-zinc-400 mb-4 tracking-tight">Optimized for Instagram, WhatsApp, TikTok & Snapchat Stories.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          handleDownloadStoryCard();
                          setIsExportModalOpen(false);
                        }}
                        className="flex-1 bg-accent hover:bg-black text-black hover:text-white border-2 border-accent py-2.5 rounded-xl font-bold transition-all text-sm"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => {
                          handleShareStoryCard();
                          setIsExportModalOpen(false);
                        }}
                        className="bg-accent/20 hover:bg-accent text-accent hover:text-black border border-accent/30 p-2.5 rounded-xl transition-all"
                        title="Share"
                      >
                        <Share2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comparison Split */}
              <div className="bg-zinc-900/50 border border-surface-border p-6 rounded-2xl hover:border-zinc-700 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Preview Thumbnail */}
                  <div className="w-24 h-18 bg-zinc-800 rounded-lg overflow-hidden border border-surface-border flex-shrink-0 flex items-center justify-center">
                    {exportPreviews.comparison ? (
                      <img src={exportPreviews.comparison} alt="Split Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-zinc-600 border-t-transparent animate-spin" />
                    )}
                  </div>

                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-white mb-1 tracking-tight">Comparison Split (16:9)</h4>
                    <p className="text-sm text-zinc-400 mb-4 tracking-tight">Perfect for X (Twitter), Facebook or Pinterest posts.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          handleDownloadComparison();
                          setIsExportModalOpen(false);
                        }}
                        className="flex-1 bg-surface hover:bg-surface-hover border border-surface-border text-white py-2.5 rounded-xl font-bold transition-all text-sm whitespace-nowrap"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => {
                          handleShareComparison();
                          setIsExportModalOpen(false);
                        }}
                        className="bg-surface hover:bg-surface-hover border border-surface-border text-white p-2.5 rounded-xl font-bold transition-all"
                        title="Share"
                      >
                        <Share2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-center text-[10px] text-zinc-600 mt-8 uppercase tracking-[0.2em] font-black italic">
              Select your style to continue
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

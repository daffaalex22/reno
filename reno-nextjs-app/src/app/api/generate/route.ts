import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";
import {
  createJob,
  updateJob,
  getJob,
  toAbsoluteUrl,
  downloadToFile,
  saveBuffer,
} from "@/lib/storage";
import {
  submitImageEdit,
  pollTask,
  generateVoiceoverScript,
  generateTTS,
  submitVideoGeneration,
} from "@/lib/dashscope";
import { mergeVideoAndAudio } from "@/lib/ffmpeg";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min max for Next.js route (SAS has no limit)

/**
 * Read a file from disk and return base64 string.
 * Handles both absolute paths (uploads) and paths relative to public/ (presets).
 */
function fileToBase64(filePathOrPublicPath: string): string {
  let absPath: string;
  if (filePathOrPublicPath.startsWith("/")) {
    // It's a public path like "/uploads/room-xxx.jpg" or "/presets/japandi.png"
    absPath = path.join(process.cwd(), "public", filePathOrPublicPath);
  } else {
    absPath = filePathOrPublicPath;
  }
  const buffer = fs.readFileSync(absPath);
  return buffer.toString("base64");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      roomImagePublicPath,
      styleImagePublicPath,
      style,
      customPrompt,
      jobId: existingJobId,
    } = body as {
      roomImagePublicPath?: string; 
      styleImagePublicPath?: string; 
      style?: string;
      customPrompt?: string;
      jobId?: string;
    };

    if (existingJobId) {
      // ── Proceed with Video Generation (Part 2) ──────────────────
      const job = getJob(existingJobId);
      if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
      
      // Fire and forget - resume pipeline from video step
      runPart2(existingJobId);
      return NextResponse.json({ jobId: existingJobId });
    }

    if (!roomImagePublicPath || !styleImagePublicPath) {
      return NextResponse.json(
        { error: "roomImagePublicPath and styleImagePublicPath are required" },
        { status: 400 }
      );
    }

    // ── Initial Request (Part 1): Image Only ──────────────────────
    const job = createJob();
    const roomImageUrl = toAbsoluteUrl(roomImagePublicPath);
    updateJob(job.id, { 
      roomImageUrl, 
      style: style!, 
      customPrompt,
      message: `Preparing transformation...` 
    });

    // Fire and forget - run only Part 1 (Image Generation)
    runPart1(job.id, {
      roomImagePublicPath,
      style: style!,
      customPrompt,
    });

    return NextResponse.json({ jobId: job.id });
  } catch (err) {
    console.error("[generate]", err);
    return NextResponse.json({ error: "Failed to start job" }, { status: 500 });
  }
}

async function runPart1(
  jobId: string,
  params: {
    roomImagePublicPath: string;
    style: string;
    customPrompt?: string;
  }
) {
  try {
    updateJob(jobId, {
      status: "step_image",
      step: 0,
      message: "Generating renovated room...",
    });

    const roomBase64 = fileToBase64(params.roomImagePublicPath);
    const renovatedImageUrl = await submitImageEdit({
      roomImageBase64: roomBase64,
      style: params.style,
      customPrompt: params.customPrompt,
    });

    if (!renovatedImageUrl) throw new Error("No renovated image URL from Qwen Image Edit");

    const { publicPath: renovatedPublicPath } = await downloadToFile(renovatedImageUrl, "jpg", "renovated");
    const renovatedAbsoluteUrl = toAbsoluteUrl(renovatedPublicPath);

    updateJob(jobId, { 
      renovatedImageUrl: renovatedAbsoluteUrl,
      status: "preview", 
      message: "Image ready for preview",
    });
  } catch (err) {
    console.error(`[pipeline:p1][${jobId}]`, err);
    updateJob(jobId, {
      status: "error",
      error: err instanceof Error ? err.message : "Image generation failed",
    });
  }
}

async function runPart2(
  jobId: string
) {
  try {
    const job = getJob(jobId);
    if (!job || !job.renovatedImageUrl || !job.roomImageUrl) {
      throw new Error("Missing job data to proceed with video generation");
    }

    // ── Step 2: TTS Script + Audio ───────────────────────────────
    updateJob(jobId, {
      status: "step_script",
      step: 1,
      message: "Writing AI voiceover script...",
    });

    const style = job.style || "Modern Minimalist";
    const script = await generateVoiceoverScript(style);
    
    updateJob(jobId, {
      status: "step_tts",
      message: "Synthesizing narration...",
    });

    const audioBuffer = await generateTTS(script);
    const { filePath: audioFilePath } = saveBuffer(Buffer.from(audioBuffer), "wav", "audio");

    // ── Step 3: Video Generation ───────────────────────────────
    updateJob(jobId, {
      status: "step_video",
      step: 2,
      message: "Rendering transformation video...",
    });

    // Resolve local file paths from public URLs
    const getLocalPath = (url: string) => {
      const urlObj = new URL(url);
      return path.join(process.cwd(), "public", urlObj.pathname);
    };

    const roomFilePath = getLocalPath(job.roomImageUrl);
    const roomBuffer = fs.readFileSync(roomFilePath);
    const roomJpegBase64 = (await sharp(roomBuffer).flatten({ background: { r: 255, g: 255, b: 255 } }).jpeg({ quality: 95 }).toBuffer()).toString("base64");

    const renovatedFilePath = getLocalPath(job.renovatedImageUrl);
    const renovatedBuffer = fs.readFileSync(renovatedFilePath);
    const renovatedJpegBase64 = (await sharp(renovatedBuffer).flatten({ background: { r: 255, g: 255, b: 255 } }).jpeg({ quality: 95 }).toBuffer()).toString("base64");

    const videoTaskId = await submitVideoGeneration({
      firstFrameBase64: roomJpegBase64,
      lastFrameBase64: renovatedJpegBase64,
    });

    const videoResult = await pollTask(videoTaskId);
    const rawVideoUrl = (videoResult.output_video || videoResult.video_url || videoResult.url) as string;
    if (!rawVideoUrl) throw new Error("No video URL from API");

    const { filePath: videoFilePath } = await downloadToFile(rawVideoUrl, "mp4", "video");

    // ── Step 4: Merge ───────────────────────────────────────────
    updateJob(jobId, {
      status: "step_merge",
      step: 3,
      message: "Merging video and audio...",
    });

    const { publicPath: finalPublicPath } = await mergeVideoAndAudio(videoFilePath, audioFilePath);
    const finalVideoUrl = toAbsoluteUrl(finalPublicPath);

    updateJob(jobId, {
      status: "done",
      step: 3,
      message: "Finish!",
      videoUrl: finalVideoUrl,
    });
  } catch (err) {
    console.error(`[pipeline:p2][${jobId}]`, err);
    updateJob(jobId, {
      status: "error",
      error: err instanceof Error ? err.message : "Video generation failed",
    });
  }
}



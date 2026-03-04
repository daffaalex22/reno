import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";
import {
  createJob,
  updateJob,
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
    } = body as {
      roomImagePublicPath: string; // e.g. "/uploads/room-xxx.jpg"
      styleImagePublicPath: string; // e.g. "/presets/japandi.png" or "/uploads/style-xxx.png"
      style: string;
      customPrompt?: string;
    };

    if (!roomImagePublicPath || !styleImagePublicPath) {
      return NextResponse.json(
        { error: "roomImagePublicPath and styleImagePublicPath are required" },
        { status: 400 }
      );
    }

    // Create a job and kick off the pipeline in the background
    const job = createJob();

    // Fire and forget — run the pipeline without awaiting
    runPipeline(job.id, {
      roomImagePublicPath,
      style,
      customPrompt,
    });

    return NextResponse.json({ jobId: job.id });
  } catch (err) {
    console.error("[generate]", err);
    return NextResponse.json({ error: "Failed to start job" }, { status: 500 });
  }
}

async function runPipeline(
  jobId: string,
  params: {
    roomImagePublicPath: string;
    style: string;
    customPrompt?: string;
  }
) {
  try {
    // ── Step 1: Image Edit (qwen-image-edit) ─────────────────────
    updateJob(jobId, {
      status: "step_image",
      step: 0,
      message: "Generating renovated room...",
    });

    // Read only the room image — style is conveyed via text prompt
    const roomBase64 = fileToBase64(params.roomImagePublicPath);

    // submitImageEdit is SYNCHRONOUS — returns the output image URL directly
    // (no task polling needed; uses qwen-image-edit via multimodal-generation endpoint)
    const renovatedImageUrl = await submitImageEdit({
      roomImageBase64: roomBase64,
      style: params.style,
      customPrompt: params.customPrompt,
    });

    if (!renovatedImageUrl) {
      throw new Error("No renovated image URL from Qwen Image Edit");
    }

    // Download renovated image to server so it's stable
    const { filePath: renovatedFilePath, publicPath: renovatedPublicPath } =
      await downloadToFile(renovatedImageUrl, "jpg", "renovated");
    const renovatedAbsoluteUrl = toAbsoluteUrl(renovatedPublicPath);

    updateJob(jobId, { renovatedImageUrl: renovatedAbsoluteUrl });

    // ── Step 2: TTS Script + Audio (Qwen + qwen3-tts-flash) ─────────
    updateJob(jobId, {
      status: "step_script",
      step: 1,
      message: "Writing AI voiceover script...",
    });

    const script = await generateVoiceoverScript(params.style);
    console.log(`[${jobId}] Voiceover script: "${script}"`);

    updateJob(jobId, {
      status: "step_tts",
      message: "Synthesizing narration...",
    });

    const audioBuffer = await generateTTS(script);
    const { filePath: audioFilePath } = saveBuffer(
      Buffer.from(audioBuffer),
      "wav",
      "audio"
    );

    // ── Step 3: Video Generation (wan2.1-kf2v-plus) ─────────────────
    updateJob(jobId, {
      status: "step_video",
      step: 2,
      message: "Rendering transformation video...",
    });

    // The API accepts base64 data URIs directly — no upload needed.
    // Convert both images to JPEG (strips alpha, ensures compatibility).
    const roomJpegBase64 = (
      await sharp(Buffer.from(roomBase64, "base64"))
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .jpeg({ quality: 95 })
        .toBuffer()
    ).toString("base64");

    const renovatedRaw = fs.readFileSync(renovatedFilePath);
    const renovatedJpegBase64 = (
      await sharp(renovatedRaw)
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .jpeg({ quality: 95 })
        .toBuffer()
    ).toString("base64");

    const videoTaskId = await submitVideoGeneration({
      firstFrameBase64: roomJpegBase64,
      lastFrameBase64: renovatedJpegBase64,
    });

    const videoResult = await pollTask(videoTaskId);
    const rawVideoUrl =
      (videoResult.output_video as string) ||
      (videoResult.video_url as string) ||
      (videoResult.url as string);

    if (!rawVideoUrl) throw new Error("No video URL from wan2.1-kf2v-plus");

    // Download video to server before URL expires
    const { filePath: videoFilePath } = await downloadToFile(
      rawVideoUrl,
      "mp4",
      "video"
    );

    // ── Step 4: ffmpeg Merge ─────────────────────────────────────────
    updateJob(jobId, {
      status: "step_merge",
      step: 3,
      message: "Merging video and audio...",
    });

    const { publicPath: finalPublicPath } = await mergeVideoAndAudio(
      videoFilePath,
      audioFilePath
    );

    const finalVideoUrl = toAbsoluteUrl(finalPublicPath);

    // ── Done ─────────────────────────────────────────────────────────
    updateJob(jobId, {
      status: "done",
      step: 3,
      message: "Done!",
      videoUrl: finalVideoUrl,
    });
  } catch (err) {
    console.error(`[pipeline][${jobId}]`, err);
    updateJob(jobId, {
      status: "error",
      error: err instanceof Error ? err.message : "Unknown error",
      message: "Something went wrong",
    });
  }
}

/**
 * ffmpeg helper — merges a silent video with a short audio track.
 * The audio plays from the start; if it's shorter than the video,
 * the rest of the video stays silent. If longer, audio is truncated.
 */

import Ffmpeg from "fluent-ffmpeg";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { UPLOADS_DIR, ensureUploadsDir } from "./storage";

export async function mergeVideoAndAudio(
  videoPath: string,
  audioPath: string
): Promise<{ filePath: string; publicPath: string }> {
  ensureUploadsDir();
  const filename = `final-${uuidv4()}.mp4`;
  const outputPath = path.join(UPLOADS_DIR, filename);

  return new Promise((resolve, reject) => {
    Ffmpeg()
      .input(videoPath)
      .input(audioPath)
      .complexFilter([
        "[1:a]apad[A]"       // Pad the audio track with infinite silence
      ])
      .outputOptions([
        "-c:v copy",         // Copy video stream as-is (no re-encode)
        "-c:a aac",          // Encode audio to AAC
        "-b:a 128k",         // Audio bitrate
        "-shortest",         // End when the shortest stream ends (which will be the video, since audio is infinite)
        "-map 0:v:0",        // Video from first input
        "-map [A]",          // Audio from complex filter
      ])
      .output(outputPath)
      .on("end", () => {
        resolve({
          filePath: outputPath,
          publicPath: `/uploads/${filename}`,
        });
      })
      .on("error", (err) => {
        reject(new Error(`ffmpeg merge failed: ${err.message}`));
      })
      .run();
  });
}

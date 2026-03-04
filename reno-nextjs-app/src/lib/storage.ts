/**
 * Storage utilities for temp file management.
 * Files are saved to /public/uploads/ so they can be served as public URLs.
 */

import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

// Where uploaded & generated files land
export const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

// Ensure uploads dir exists
export function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

/**
 * Save a File (from FormData) to disk, return its public URL path
 */
export async function saveUploadedFile(
  file: File,
  prefix = "upload"
): Promise<{ filePath: string; publicPath: string }> {
  ensureUploadsDir();
  const ext = file.name.split(".").pop() || "jpg";
  const filename = `${prefix}-${uuidv4()}.${ext}`;
  const filePath = path.join(UPLOADS_DIR, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filePath, buffer);
  return {
    filePath,
    publicPath: `/uploads/${filename}`,
  };
}

/**
 * Save a buffer to disk, return its public URL path
 */
export function saveBuffer(
  buffer: Buffer,
  ext: string,
  prefix = "file"
): { filePath: string; publicPath: string } {
  ensureUploadsDir();
  const filename = `${prefix}-${uuidv4()}.${ext}`;
  const filePath = path.join(UPLOADS_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  return { filePath, publicPath: `/uploads/${filename}` };
}

/**
 * Download a remote URL and save to disk. Returns local file path + public path.
 */
export async function downloadToFile(
  url: string,
  ext: string,
  prefix = "dl"
): Promise<{ filePath: string; publicPath: string }> {
  ensureUploadsDir();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${url} → HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  return saveBuffer(buffer, ext, prefix);
}

/**
 * Given a public path like /uploads/foo.jpg, return the absolute server URL.
 * Uses NEXT_PUBLIC_BASE_URL env var if set, otherwise falls back to localhost:3000.
 */
export function toAbsoluteUrl(publicPath: string): string {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  return `${base}${publicPath}`;
}

/**
 * In-memory job store (fine for single-process hackathon use)
 * In production you'd use Redis or a database.
 */
export type JobStatus =
  | "queued"
  | "step_image"
  | "step_script"
  | "step_tts"
  | "step_video"
  | "step_merge"
  | "preview"
  | "done"
  | "error";

export interface Job {
  id: string;
  status: JobStatus;
  step: number; // 0-3 matching the UI stepper
  message: string;
  roomImageUrl?: string; // Original photo
  videoUrl?: string;
  renovatedImageUrl?: string;
  style?: string;
  customPrompt?: string;
  error?: string;
  createdAt: number;
}

// Use globalThis so the job map survives module reloads in Next.js dev mode
const globalStore = globalThis as unknown as { __dreamRoomJobs?: Map<string, Job> };
if (!globalStore.__dreamRoomJobs) globalStore.__dreamRoomJobs = new Map();
const jobs = globalStore.__dreamRoomJobs;

export function createJob(): Job {
  const job: Job = {
    id: uuidv4(),
    status: "queued",
    step: 0,
    message: "Job queued",
    createdAt: Date.now(),
  };
  jobs.set(job.id, job);
  return job;
}

export function updateJob(id: string, update: Partial<Job>) {
  const job = jobs.get(id);
  if (job) jobs.set(id, { ...job, ...update });
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

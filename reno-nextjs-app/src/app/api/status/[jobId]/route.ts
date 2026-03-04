import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = getJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    step: job.step,
    message: job.message,
    videoUrl: job.videoUrl,
    renovatedImageUrl: job.renovatedImageUrl,
    error: job.error,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { UPLOADS_DIR } from "@/lib/storage";
import fs from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  
  // Construct the absolute path
  const filePath = path.join(UPLOADS_DIR, filename);

  // Security check: Prevent directory traversal attacks
  if (!filePath.startsWith(UPLOADS_DIR)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Read file from disk
  const fileBuffer = fs.readFileSync(filePath);
  
  // Determine Content-Type based on file extension
  const ext = path.extname(filename).toLowerCase();
  let contentType = "application/octet-stream";
  if (ext === ".png") contentType = "image/png";
  if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
  if (ext === ".mp4") contentType = "video/mp4";
  if (ext === ".wav") contentType = "audio/wav";
  if (ext === ".mp3") contentType = "audio/mpeg";

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}

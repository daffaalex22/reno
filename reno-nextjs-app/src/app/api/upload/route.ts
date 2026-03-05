import { NextRequest, NextResponse } from "next/server";
import { saveUploadedFile, toAbsoluteUrl } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 10;

// Allow up to 15MB uploads (mobile photos can be large)
export const maxRequestBodySize = 15 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate type — include HEIC/HEIF for iPhones
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
    ];
    if (!allowed.includes(file.type)) {
      console.error(`[upload] Rejected file type: "${file.type}", name: "${file.name}", size: ${file.size}`);
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: JPG, PNG, WebP, HEIC` },
        { status: 400 }
      );
    }

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      console.error(`[upload] Rejected file size: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const { publicPath } = await saveUploadedFile(file, "room");
    const absoluteUrl = toAbsoluteUrl(publicPath);

    console.log(`[upload] OK: ${file.name} (${file.type}, ${(file.size / 1024).toFixed(0)}KB) → ${publicPath}`);
    return NextResponse.json({ url: absoluteUrl, publicPath });
  } catch (err) {
    console.error("[upload] Unhandled error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}


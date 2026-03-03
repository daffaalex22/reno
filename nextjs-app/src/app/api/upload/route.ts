import { NextRequest, NextResponse } from "next/server";
import { saveUploadedFile, toAbsoluteUrl } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate type
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const { publicPath } = await saveUploadedFile(file, "room");
    const absoluteUrl = toAbsoluteUrl(publicPath);

    return NextResponse.json({ url: absoluteUrl, publicPath });
  } catch (err) {
    console.error("[upload]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

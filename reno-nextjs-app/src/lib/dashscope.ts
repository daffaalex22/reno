/**
 * Alibaba Cloud DashScope (Singapore) API wrapper
 * Covers: qwen-image-2.0-pro (image edit), wan2.1-kf2v-plus, qwen-max, qwen3-tts-flash
 */
import sharp from "sharp";

const BASE_URL = "https://dashscope-intl.aliyuncs.com/api/v1";

function getHeaders(async = false): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
  };
  if (async) headers["X-DashScope-Async"] = "enable";
  return headers;
}

/** Sleep helper */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));




/** Poll a task until SUCCEEDED or FAILED */
export async function pollTask(taskId: string): Promise<Record<string, unknown>> {
  const url = `${BASE_URL}/tasks/${taskId}`;
  for (let i = 0; i < 720; i++) {
    // max ~60min
    await sleep(5000);
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error(`Poll failed: HTTP ${res.status}`);
    const data = await res.json();
    const status = data.output?.task_status;
    if (status === "SUCCEEDED") return data.output;
    if (status === "FAILED")
      throw new Error(`Task failed: ${data.output?.message || "unknown"}`);
  }
  throw new Error("Polling timeout");
}

// ─────────────────────────────────────────────
// Step 1: qwen-image-2.0-pro (Qwen Image Edit)
// Docs: https://www.alibabacloud.com/help/en/model-studio/qwen-image-edit-guide
// Uses the multimodal-generation endpoint with chat-style messages input.
// The call is SYNCHRONOUS — no async task polling needed.
// Single image + descriptive text prompt (no style reference image).
// Returns the output image URL directly.
// ─────────────────────────────────────────────

/** Build a rich renovation prompt from a style name. */
function buildRenovationPrompt(style: string): string {
  return (
    `Renovate this room into a ${style} interior design style. ` +
    `Transform the furniture, colors, textures, lighting, and decor to match ${style} aesthetics. ` +
    `Keep the original room's architecture, layout, doors, and windows completely identical. ` +
    `Do not add or remove any walls, windows, or structural elements.`
  );
}

export async function submitImageEdit(params: {
  roomImageBase64: string; // base64 string (no data: prefix)
  style: string;           // e.g. "industrial", "japandi", "modern minimalist"
  customPrompt?: string;   // overrides the auto-generated prompt if provided
}): Promise<string> {
  const IMAGE_EDIT_URL = `${BASE_URL}/services/aigc/multimodal-generation/generation`;

  const prompt = params.customPrompt || buildRenovationPrompt(params.style);

  const res = await fetch(IMAGE_EDIT_URL, {
    method: "POST",
    // Note: no X-DashScope-Async header — this endpoint is synchronous
    headers: getHeaders(false),
    body: JSON.stringify({
      model: "qwen-image-edit",
      input: {
        messages: [
          {
            role: "user",
            content: [
              // Single room image only — style is conveyed via the text prompt
              { image: `data:image/png;base64,${params.roomImageBase64}` },
              { text: prompt },
            ],
          },
        ],
      },
      parameters: {
        n: 1,
        watermark: false,
        negative_prompt: "blur, low quality, people, extra rooms, cartoonish",
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Image edit failed: ${JSON.stringify(err)}`);
  }

  const data = await res.json();

  // Response: output.choices[0].message.content[] where items with .image are the outputs
  const contentItems: Array<{ image?: string; text?: string }> =
    data.output?.choices?.[0]?.message?.content ?? [];
  const outputImage = contentItems.find((item) => !!item.image)?.image;

  if (!outputImage) {
    throw new Error(
      `Qwen Image Edit: no output image in response. Full response: ${JSON.stringify(data)}`
    );
  }

  // Return the output image URL (valid for 24 hours)
  return outputImage;
}

// ─────────────────────────────────────────────
// Step 2a: Use Qwen to generate punchy TTS script
// ─────────────────────────────────────────────
export async function generateVoiceoverScript(style: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/services/aigc/text-generation/generation`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      model: "qwen-max",
      input: {
        messages: [
          {
            role: "system",
            content:
              "You write ultra-short, punchy, social-media voiceover scripts for room transformation videos. Maximum 2 sentences. No hashtags. Trendy, first-person, conversational tone.",
          },
          {
            role: "user",
            content: `Write a voiceover for a before-and-after room transformation video. The new style is: ${style}.`,
          },
        ],
      },
      parameters: { max_tokens: 60 },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Qwen script gen failed: ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  return (data.output?.choices?.[0]?.message?.content as string) || `I transformed my room into a stunning ${style} space. This is what AI can do.`;
}

// ─────────────────────────────────────────────
// Step 2b: qwen3-tts-flash (Text to Speech)
// Uses the DashScope multimodal-generation endpoint
// Returns audio binary as ArrayBuffer
// ─────────────────────────────────────────────
export async function generateTTS(text: string): Promise<ArrayBuffer> {
  const TTS_URL = `${BASE_URL}/services/aigc/multimodal-generation/generation`;

  const res = await fetch(TTS_URL, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      model: "qwen3-tts-flash",
      input: {
        text: text,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error(`[TTS] HTTP ${res.status}: ${errText}`);
    throw new Error(`TTS failed (HTTP ${res.status}): ${errText}`);
  }

  const data = await res.json();

  // The audio URL is typically in the assistant's response
  const audioContent = data.output?.choices?.[0]?.message?.content;
  let audioUrl: string | undefined;

  if (Array.isArray(audioContent)) {
    const audioItem = audioContent.find((c: { type?: string }) => c.type === "audio");
    audioUrl = audioItem?.audio?.url || audioItem?.url || audioItem?.audio;
  } else if (typeof audioContent === "string") {
    audioUrl = audioContent;
  }

  // Also check common fallback locations
  if (!audioUrl) {
    audioUrl = data.output?.audio?.url || data.output?.audio_url || data.output?.url;
  }

  if (!audioUrl) {
    console.error("[TTS] Unexpected response structure:", JSON.stringify(data, null, 2));
    throw new Error("TTS: no audio URL found in response");
  }

  // Download the audio file
  const audioRes = await fetch(audioUrl);
  if (!audioRes.ok) throw new Error(`Failed to download TTS audio: HTTP ${audioRes.status}`);
  return await audioRes.arrayBuffer();
}

// ─────────────────────────────────────────────
// Step 3: wan2.1-kf2v-plus (Keyframe to Video)
// Accepts base64 JPEG strings — passed as data URIs, no upload needed.
// Returns task_id
// ─────────────────────────────────────────────
export async function submitVideoGeneration(params: {
  firstFrameBase64: string; // raw base64 string (no data: prefix)
  lastFrameBase64: string;  // raw base64 string (no data: prefix)
  prompt?: string;
}): Promise<string> {
  const res = await fetch(
    `${BASE_URL}/services/aigc/image2video/video-synthesis`,
    {
      method: "POST",
      headers: getHeaders(true),
      body: JSON.stringify({
        model: "wan2.1-kf2v-plus",
        input: {
          first_frame_url: `data:image/jpeg;base64,${params.firstFrameBase64}`,
          last_frame_url: `data:image/jpeg;base64,${params.lastFrameBase64}`,
          prompt:
            params.prompt ||
            "A smooth cinematic transformation of a room interior, before and after renovation, seamless transition, high quality",
        },
        parameters: { prompt_extend: true, watermark: false },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Video submit failed: ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  return data.output.task_id as string;
}

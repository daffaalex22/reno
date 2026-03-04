/**
 * Test script for Qwen Image Edit model (qwen-image-edit)
 *
 * Docs: https://www.alibabacloud.com/help/en/model-studio/qwen-image-edit-guide
 *
 * Key differences vs. wan2.5-i2i (image2image):
 *  - Endpoint: /multimodal-generation/generation  (NOT /image2image/image-synthesis)
 *  - Input format: messages[] with single image + text content (chat-style)
 *  - Response is SYNCHRONOUS — no async task polling needed
 *  - Returns image URL(s) in output.choices[0].message.content
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── Model options ────────────────────────────────────────────────────────────
// qwen-image-2.0-pro   → highest quality, supports 1–6 output images
// qwen-image-edit-max  → high quality, 1–6 output images
// qwen-image-edit-plus → balanced, 1–6 output images
// qwen-image-edit      → fastest/cheapest, single output image only
// ─────────────────────────────────────────────────────────────────────────────

interface QwenImageEditRequest {
  /** First input image: public URL OR data:<mime>;base64,<data> */
  image1: string;
  /** Second input image (optional) */
  image2?: string;
  /** Third input image (optional) */
  image3?: string;
  /**
   * Natural-language editing instruction.
   * Reference images by their position, e.g. "Image 1", "Image 2".
   */
  prompt: string;
  /** Model to use (default: qwen-image-2.0-pro) */
  model?: string;
  /** Number of output images to generate (1–6, default 1) */
  n?: number;
  /** Things to exclude from the output */
  negative_prompt?: string;
  /** Output resolution as "width*height", e.g. "1024*1024" */
  size?: string;
  /** Enable prompt rewriting for better results (default: true) */
  prompt_extend?: boolean;
  /** Add watermark (default: false) */
  watermark?: boolean;
  /** Reproducibility seed (0–2147483647) */
  seed?: number;
}

interface QwenImageEditResponse {
  /** URLs of the generated output image(s) – valid for 24 hours */
  output_images: string[];
  request_id: string;
}

// ─── Config ──────────────────────────────────────────────────────────────────
const CONFIG = {
  // Singapore region endpoint (multimodal-generation, NOT image2image)
  API_URL:
    'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
  API_KEY: process.env.API_KEY || 'your_api_key_here',
};

// ─── Core API call ────────────────────────────────────────────────────────────
/**
 * Call Qwen Image Edit and return the URLs of the generated image(s).
 * The call is SYNCHRONOUS – the model returns the result in the HTTP response
 * body, so no task-ID polling is required.
 */
async function editImage(
  request: QwenImageEditRequest
): Promise<QwenImageEditResponse> {
  const model = request.model ?? 'qwen-image-edit';

  // Build the content array: images first, then the text instruction
  const content: Array<{ image?: string; text?: string }> = [];
  content.push({ image: request.image1 });
  if (request.image2) content.push({ image: request.image2 });
  if (request.image3) content.push({ image: request.image3 });
  content.push({ text: request.prompt });

  const body = {
    model,
    input: {
      messages: [
        {
          role: 'user',
          content,
        },
      ],
    },
    parameters: {
      n: request.n ?? 1,
      negative_prompt: request.negative_prompt,
      size: request.size,
      // prompt_extend & watermark only supported on non-qwen-image-edit models
      ...(model !== 'qwen-image-edit' && {
        prompt_extend: request.prompt_extend ?? true,
        watermark: request.watermark ?? false,
      }),
      seed: request.seed,
    },
  };

  console.log('──────────────────────────────────────────');
  console.log('Sending request to Qwen Image Edit...');
  console.log('Model:', model);
  console.log('Image 1:', request.image1.slice(0, 80) + '...');
  if (request.image2) console.log('Image 2:', request.image2.slice(0, 80) + '...');
  if (request.image3) console.log('Image 3:', request.image3.slice(0, 80) + '...');
  console.log('Prompt:', request.prompt);
  console.log('──────────────────────────────────────────');

  const response = await fetch(CONFIG.API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CONFIG.API_KEY}`,
      // NOTE: No X-DashScope-Async header — this API is synchronous
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `HTTP ${response.status}: ${JSON.stringify(errorData)}`
    );
  }

  const result = await response.json();
  console.log('\nRaw response:', JSON.stringify(result, null, 2));

  // Extract image URLs from output.choices[0].message.content[]
  const contentItems: Array<{ image?: string; text?: string }> =
    result.output?.choices?.[0]?.message?.content ?? [];

  const outputImages = contentItems
    .filter((item) => !!item.image)
    .map((item) => item.image as string);

  if (outputImages.length === 0) {
    throw new Error(
      `No output images found in response. Full response:\n${JSON.stringify(result, null, 2)}`
    );
  }

  return {
    output_images: outputImages,
    request_id: result.request_id,
  };
}

// ─── Main test ────────────────────────────────────────────────────────────────
async function main() {
  /**
   * Room renovation use-case (single image + prompt):
   *   image1  = original room photo (the only input image)
   *   prompt  = rich description of the desired renovation style
   *
   * No style reference image is passed — the model is guided entirely
   * by the text prompt, which avoids the model copying the reference
   * image too literally or ignoring the room layout.
   */
  // Read room image from disk and encode as base64
  // (avoids ngrok browser-warning interception on free tunnels)
  const NEXTJS_PUBLIC = path.resolve(
    __dirname,
    'nextjs-app/public'
  );
  const roomImageBase64 = fs
    .readFileSync(path.join(NEXTJS_PUBLIC, 'uploads/room-204c29ce-f61c-42cc-b2ae-6dd2e84f41cd.png'))
    .toString('base64');

  const testRequest: QwenImageEditRequest = {
    // Room image as base64 data URI
    image1: `data:image/png;base64,${roomImageBase64}`,
    // No image2 — style is described purely through the prompt
    prompt:
      'Renovate this room into an industrial interior design style. ' +
      'Apply the following: exposed brick or raw concrete walls, dark metal and steel fixtures, ' +
      'Edison bulb pendant lighting, reclaimed wood shelving or accents, ' +
      'matte black or dark charcoal color palette, distressed leather furniture, ' +
      'and polished concrete or dark hardwood floors. ' +
      'Keep the original room\'s architecture, layout, doors, and windows identical. ' +
      'Do not add or remove any walls, windows, or structural elements.',
    model: 'qwen-image-edit',
    n: 1,
    negative_prompt: 'blur, low quality, people, extra rooms, cartoonish',
    watermark: false,
  };

  try {
    const result = await editImage(testRequest);

    console.log('\n✅ Success!');
    console.log('Request ID:', result.request_id);
    console.log(`Generated ${result.output_images.length} image(s):`);
    result.output_images.forEach((url, idx) => {
      console.log(`  [${idx + 1}] ${url}`);
    });
    console.log('\n⚠️  Note: Image URLs are valid for only 24 hours. Download promptly!');

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the test
main();

// Export for use as a module
export { editImage, QwenImageEditRequest, QwenImageEditResponse };

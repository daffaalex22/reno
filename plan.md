# Dream Room Generator — Hackathon Plan
### Alibaba Cloud AI Creativity Hackathon (Deadline: March 5th)

---

## Project Overview

**"Dream Room Generator"** — Upload a photo of your room, pick a style reference, and get back:
1. A renovated room image (AI-generated)
2. A cinematic before→after transformation video with narration audio

Tagline: *"Dream it. Generate it. Go viral."*

This is a **Next.js** web app hosted on **Alibaba Cloud Simple Application Server (SAS)**, using only Alibaba Cloud AI models via the Model Studio API (Singapore region).

---

## Hackathon Requirements (Must Follow)

- ✅ Build using **Alibaba Cloud only** (Model Studio + Simple Application Server)
- ✅ Code via **Qoder platform**
- ✅ Submit a **webpage link** as final result
- ✅ Limited to 100 teams — already registered as "Room Renovation AI"

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend + Backend | Next.js (TypeScript) |
| Hosting | Alibaba Cloud Simple Application Server (Ubuntu) |
| Image Editing | `wan2.5-i2i-preview` via Model Studio API |
| Video Generation | `wan2.1-kf2v-plus` via Model Studio API |
| Text-to-Speech | `qwen3-tts-flash` via Model Studio API |
| Video + Audio Merge | `ffmpeg` (on the SAS server) |
| API Region | Singapore (`dashscope-intl.aliyuncs.com`) |

---

## AI Pipeline (In Order)

```
User uploads room photo (Image 1)
User picks style reference (Image 2) — optional, or use preset styles
User enters renovation prompt (or use default)
        ↓
Step 1: wan2.5-i2i-preview
  → Input: room photo + style reference + text prompt
  → Output: renovated room image
        ↓
Step 2: qwen3-tts-flash
  → Input: narration script (e.g. "Here's your room today... and here's your dream renovation.")
  → Output: narration audio (.wav)
        ↓
Step 3: wan2.1-kf2v-plus
  → Input: first_frame_url (original room) + last_frame_url (renovated room) + prompt
  → Output: transformation video (silent .mp4)
        ↓
Step 4: ffmpeg (server-side)
  → Input: silent video + narration audio
  → Output: final video with audio (.mp4)
        ↓
User watches & downloads/shares the final video
```

---

## API Details

### Base URL (Singapore)
```
https://dashscope-intl.aliyuncs.com/api/v1
```

### Authentication
```
Authorization: Bearer <DASHSCOPE_API_KEY>
```
Store the key in `.env.local` as `DASHSCOPE_API_KEY`.

---

### Step 1 — Image Editing: `wan2.5-i2i-preview`

```http
POST /services/aigc/image2image/image-synthesis
```

```json
{
  "model": "wan2.5-i2i-preview",
  "input": {
    "image_list": [
      { "image": "<room_photo_url>" },
      { "image": "<style_reference_url>" }
    ],
    "prompt": "Renovate the room in image 1 to match the interior style of image 2. Keep the room layout and structure the same."
  },
  "parameters": {
    "prompt_extend": true
  }
}
```

- Supports **1–3 input images**
- **Asynchronous** — returns `task_id`, must poll for result

---

### Step 2 — Text to Speech: `qwen3-tts-flash`

```http
POST /services/aigc/text-to-speech/synthesis
```

```json
{
  "model": "qwen3-tts-flash",
  "input": {
    "text": "Here's your room today... and here's your dream renovation, powered by AI."
  },
  "parameters": {
    "voice": "default"
  }
}
```

- Returns audio file URL or base64
- **Synchronous or async** — check response format

---

### Step 3 — Keyframe to Video: `wan2.1-kf2v-plus`

```http
POST /services/aigc/image2video/video-synthesis
Header: X-DashScope-Async: enable
```

```json
{
  "model": "wan2.1-kf2v-plus",
  "input": {
    "first_frame_url": "<original_room_url>",
    "last_frame_url": "<renovated_room_url>",
    "prompt": "A smooth cinematic transformation of a room interior, before and after renovation, seamless transition, high quality"
  },
  "parameters": {
    "prompt_extend": true
  }
}
```

- **Asynchronous** — returns `task_id`
- Poll endpoint: `GET /tasks/<task_id>`
- Task takes **1–5 minutes**
- ⚠️ Video URL **expires in 24 hours** — download immediately after generation

---

### Polling Pattern (for all async tasks)

```typescript
async function pollTask(taskId: string): Promise<any> {
  while (true) {
    await sleep(5000);
    const res = await fetch(`${BASE_URL}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}` },
    });
    const data = await res.json();
    const status = data.output?.task_status;

    if (status === "SUCCEEDED") return data.output;
    if (status === "FAILED") throw new Error("Task failed");
  }
}
```

---

### Step 4 — Merge Video + Audio (ffmpeg on server)

```bash
ffmpeg -i transformation.mp4 -i narration.wav -c:v copy -c:a aac output_final.mp4
```

Run this server-side via Node.js `child_process.exec` or a library like `fluent-ffmpeg`.

---

## Next.js App Structure

```
/
├── app/
│   ├── page.tsx                  # Main UI — upload form + result display
│   ├── api/
│   │   ├── generate/route.ts     # Main pipeline endpoint
│   │   ├── poll/[taskId]/route.ts # Poll task status
│   │   └── tts/route.ts          # TTS generation
├── lib/
│   ├── dashscope.ts              # API wrapper (image edit, kf2v, tts)
│   ├── ffmpeg.ts                 # ffmpeg merge helper
│   └── storage.ts                # Temp file management
├── public/
│   └── presets/                  # Preset style reference images
│       ├── modern-minimalist.jpg
│       ├── japandi.jpg
│       ├── industrial.jpg
│       └── bohemian.jpg
├── .env.local                    # DASHSCOPE_API_KEY
└── package.json
```

---

## UI Flow

1. **Landing page** — headline "Transform Your Room with AI"
2. **Upload section**
   - Upload your room photo
   - Pick a style (preset tiles: Modern, Japandi, Industrial, Bohemian) OR upload custom style reference
   - Optional: custom prompt text box
3. **Generate button** → triggers the full pipeline
4. **Loading state** — progress indicator with steps:
   - "Generating renovated room..." (Step 1)
   - "Creating narration..." (Step 2)
   - "Rendering transformation video..." (Step 3)
   - "Finalizing video..." (Step 4)
5. **Result page**
   - Video player (before→after with audio)
   - Download button
   - Share button (copy link / share to social)
   - "Try another room" button

---

## Deployment on Simple Application Server (SAS)

1. Create Ubuntu instance on Alibaba Cloud SAS (Singapore region)
2. SSH into the server
3. Install Node.js, npm, ffmpeg:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs ffmpeg
   ```
4. Clone/upload your Next.js project
5. Build and run:
   ```bash
   npm install
   npm run build
   npm start
   ```
6. Configure SAS firewall to open port 3000 (or use nginx on port 80)
7. Submit the public IP URL as final result

---

## Important Notes for the Agent

- Always use **Singapore region** endpoint — never Beijing
- API key goes in `.env.local` as `DASHSCOPE_API_KEY` — never hardcode it
- All AI tasks are **async** — always implement polling with `task_id`
- Video URLs from Wan expire in **24 hours** — download to server immediately
- Images passed to the API must be **publicly accessible URLs** — upload to SAS first or use a temp storage solution
- ffmpeg must be installed on the SAS server for audio merging
- The app must work end-to-end as a **single webpage** — this is the submission format

---

## Judging Criteria (from hackathon brief)

- **Creativity** — unique, viral-worthy concept ✅
- **Use of Alibaba Cloud** — Model Studio + SAS only ✅
- **Technical execution** — working webpage with AI generation ✅
- **Viral potential** — shareable before/after video with audio ✅

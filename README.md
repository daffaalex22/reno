<div align="center">
  <img src="reno-nextjs-app/src/app/icon.svg" width="80" alt="Reno Logo" />
  <h1>Reno — Dream Room Generator 🏠✨</h1>

  [![Build Status](https://img.shields.io/badge/BUILD-PASSING-70AD47?style=for-the-badge)](https://github.com/daffaalex22/reno)
  [![License](https://img.shields.io/badge/LICENSE-MIT-0070C0?style=for-the-badge)](LICENSE)

<p align="center">
    <i>"Dream it. Generate it. Go viral."</i> 🚀
  </p>

  <p align="center">
    <a href="https://reno-ai.duckdns.org/"><strong>🌐 Live Demo (HTTPS)</strong></a> | 
    <a href="http://47.236.135.31/"><strong>🔗 Mirror (HTTP)</strong></a> | 
    <a href="http://47.236.135.31:3000/"><strong>⚙️ Direct (Port 3000)</strong></a>
  </p>
</div>

**Reno** is an AI-powered interior design assistant that transforms your living space in seconds. Upload a photo of your room, pick a style, and watch as our AI pipeline creates a cinematic before-and-after renovation video with custom narration. 🎨🎬

## Table of Contents 📖

- [Overview 🌟](#overview)
- [Project Overview 🏠](#project-overview)
- [Tech Stack 🛠️](#tech-stack)
- [AI Pipeline ⚙️](#ai-pipeline)
- [Getting Started 🚀](#getting-started)
- [Project Structure 📁](#project-structure)
- [Available Scripts 📜](#available-scripts)
- [Environment Variables 🔑](#environment-variables)
- [Development 💻](#development)
- [Deployment 🚢](#deployment)
- [Troubleshooting 🛠️](#troubleshooting)

## Project Overview 🏠

**Reno** is a Next.js web application built for the **Alibaba Cloud AI Creativity Hackathon**. It leverages high-end Alibaba Cloud AI models via the Model Studio API to automate the room renovation design and visualization process. 🤖💡

### Key Features:

- 🖼️ **AI Image Renovation**: Transform room photos using style references.
- 🎙️ **Custom Narration**: Generate AI audio scripts for your renovation.
- 🎬 **Cinematic Video**: Create smooth before-and-after transformation videos.
- 🛠️ **Seamless Integration**: Fully hosted on Alibaba Cloud SAS.
- ✨ **Instant Preview**: Interactive slider to see the magic happen.

## Tech Stack 🛠️

| Layer                        | Technology                                            |
| ---------------------------- | ----------------------------------------------------- |
| **Frontend + Backend** | Next.js 15+ (TypeScript) ⚛️                         |
| **Hosting**            | Alibaba Cloud Simple Application Server (Ubuntu) ☁️ |
| **Image Editing**      | `qwen-image-edit` (Model Studio) 🖼️               |
| **Video Generation**   | `wan2.2-kf2v-flash` (Model Studio) 📹                |
| **Script Generation**   | `qwen-max` (Model Studio) 📝                        |
| **Text-to-Speech**     | `qwen3-tts-flash` (Model Studio) 🗣️               |
| **Video Processing**   | `ffmpeg` (Server-side) 🎞️                         |

## AI Pipeline ⚙️

1. **Image Synthesis** 🖼️: `qwen-image-edit` takes the room photo and transforms it based on the chosen style.
2. **Script Generation** 📝: `qwen-max` writes a short, punchy voiceover script.
3. **TTS Generation** 🎙️: `qwen3-tts-flash` creates the narration audio from the script.
4. **Video Synthesis** 🎬: `wan2.2-kf2v-flash` renders a cinematic transition between the original and renovated rooms.
5. **Final Assembly** 🛠️: `ffmpeg` merges the silent video with the generated narration.

## Getting Started 🚀

### Prerequisites 📋

- **Node.js**: v20 or v22 🟢
- **ffmpeg**: Installed on your system/server for video merging. 🎞️
- **Alibaba Cloud DashScope API Key**: Obtain from Model Studio (Singapore region). 🔑

### Installation 🛠️

1. Clone the repository. 📥
2. Navigate to the app directory:
   ```bash
   cd reno-nextjs-app
   ```
3. Install dependencies: 📦
   ```bash
   npm install
   ```

### Running Locally 💻

1. Configure your environment variables (see below). 🔑
2. Start the development server: ⚡
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser. 🌐

## Project Structure 📁

```text
.
├── .github/workflows/      # CI/CD deployment pipelines 🚀
├── testing/          # Standalone scripts for testing APIs 🧪
├── reno-nextjs-app/        # Core Next.js Application ⚛️
│   ├── public/             # Static assets (presets, images) 🖼️
│   └── src/
│       ├── app/            # Next.js App Router (Pages, APIs) 🛣️
│       ├── components/     # React Components 🧩
│       └── lib/            # Shared utilities (DashScope, storage, ffmpeg) 📚
├── plan.md                 # Detailed project hackathon plan 📝
└── README.md               # Main documentation 📖
```

## Available Scripts 📜

All scripts should be run from within the `reno-nextjs-app` directory.

| Script         | Command        | Directory           | Description                   |
| -------------- | -------------- | ------------------- | ----------------------------- |
| `dev` ⚡     | `next dev`   | `reno-nextjs-app` | Starts the development server |
| `build` 🏗️ | `next build` | `reno-nextjs-app` | Builds the production bundle  |
| `start` ▶️ | `next start` | `reno-nextjs-app` | Starts the production server  |

## Environment Variables 🔑

Create a `.env.local` file in the `reno-nextjs-app` directory based on `.env.example`:

| Variable                    | Required      | Description                                        |
| --------------------------- | ------------- | -------------------------------------------------- |
| `DASHSCOPE_API_KEY` 🔑    | **Yes** | Alibaba Cloud DashScope API Key (Singapore region) |
| `NEXT_PUBLIC_BASE_URL` 🌐 | No            | Public base URL (e.g., http://your-vps-ip:3000)    |

## Development 💻

- **Branching**: Use feature branches and target `main` for pull requests. 🌿
- **Linting**: Run `next lint` (if configured) or rely on editor integration. 🧹
- **Testing**: Standalone API tests can be found in `testing/`. 🧪

## Deployment 🚢

The project is configured for automated deployment to an **Alibaba Cloud VPS** via GitHub Actions.

1. Ensure the following secrets are set in GitHub: 🔐
   - `SSH_HOST`: Your VPS IP
   - `SSH_USERNAME`: Your VPS username
   - `SSH_PASSWORD`: Your VPS password
2. Push to the `main` branch to trigger the [deploy.yml](.github/workflows/deploy.yml) workflow. 🚀
3. The workflow will:
   - Build the Next.js app in standalone mode. 🏗️
   - Transfer files to the VPS. 📦
   - Restart the application using **PM2**. 🔄
   - Ensure `ffmpeg` is installed on the target machine. 🎞️

## Troubleshooting 🛠️

| Issue                                  | Potential Fix                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------- |
| `InvalidParameter.DataInspection` ❌ | Ensure images are JPEG/PNG without alpha channels and are publicly accessible.  |
| Video generation timeout ⏳            | Increase polling interval or timeout; video synthesis can take up to 5 minutes. |
| ffmpeg not found 🚫                    | Run `sudo apt-get install -y ffmpeg` on your server.                          |
| DashScope Regional Error 🌏            | Ensure you are using the Singapore endpoint (`dashscope-intl.aliyuncs.com`).  |

---

*Built with ❤️ for the Alibaba Cloud AI Creativity Hackathon 2026.* 🌟

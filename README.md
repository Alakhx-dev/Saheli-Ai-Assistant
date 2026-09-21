# 🌸 Saheli AI (सहेली) — Your Personal AI Bestie & Companion

<div align="center">

![Saheli AI Banner](/public/logo.png)

**An emotionally intelligent, voice-first AI companion with long-term memory, real-time ambient awareness, visual studio lighting, and integrated music streaming.**

[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore_%26_Auth-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Groq](https://img.shields.io/badge/Groq-Ultra--Fast_LLM-F05A28?style=for-the-badge)](https://groq.com/)
[![AWS Polly](https://img.shields.io/badge/AWS_Polly-Swara_Voice-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white)](https://aws.amazon.com/polly/)

[Features](#-key-features) • [Architecture](#-system-architecture) • [Getting Started](#-getting-started) • [Environment Variables](#-environment-configuration) • [Project Structure](#-project-structure)

</div>

---

## 📖 Overview

**Saheli (सहेली)** is not just another utility chatbot — she is an expressive, empathetic, and attentive personal companion designed to converse naturally in **Hinglish, Hindi, and English**. 

Unlike standard conversational agents that forget your context after each session, Saheli is powered by an adaptive **Long-Term Memory Engine**, **Real-Time Contextual Awareness** (knowing your local time, live weather, and previous conversations), **Cinematic Visual Avatars with Studio Lighting**, and **Voice-First Interaction** powered by AWS Polly and Groq.

Whether you need emotional support, a late-night chat, friendly banter, music playback, reminders, or deep conceptual problem-solving, Saheli adapts seamlessly to your mood.

---

## ✨ Key Features

### 🎙️ 1. Voice-First Conversational Intelligence
- **Natural Voice Synthesis**: High-fidelity Indian voice synthesis powered by **AWS Polly (Swara voice)**, with automated fallbacks to Edge TTS and browser SpeechSynthesis.
- **Ultra-Fast Speech Recognition**: Real-time voice transcription powered by **Groq Whisper** for near-instant responsiveness.
- **Dual Personality Modes**:
  - **Bestie Mode**: Warm, playful, caring Hinglish replies with emotional micro-chats and empathetic support.
  - **Mentor Mode**: Detailed, structured, analytical reasoning for coding, academics, and productivity.
- **Multi-LLM Fallback Engine**: Primary streaming via Groq Cloud (Llama models), with dynamic failover to Google Gemini and OpenRouter.

### 🧠 2. Intelligent Long-Term Memory
- **Autonomous Fact Extraction**: Automatically detects personal preferences, relationship context, habits, and user identity while ignoring ephemeral pleasantries.
- **Explicit Memory Controls**: Commands like *"yaad rakhna"* (remember this) or *"bhool jao"* (forget this) trigger instant updates.
- **Dual Memory Banks**:
  - **Chat Memory**: Structured knowledge base of personal preferences and extracted facts.
  - **Image Memory**: Visual album tracking uploaded and AI-generated companion images.
- **Hybrid Storage**: Local offline storage via **IndexedDB** synchronized seamlessly with **Firebase Firestore**.

### 🌤️ 3. Real-Time Ambient Awareness
- **Live Environmental Sense**: Automatically synchronizes with the user’s local clock, timezone, geographical coordinates, and live weather conditions.
- **Weather-Aware Dialogue**: Intelligently comments on rain, heat, cold, or late-night hours (e.g., *"Raat ke 2 baj gaye hain, abhi tak soye nahi?"*).
- **Session Continuity**: Remembers elapsed time since your previous conversation to greet you accordingly.

### 🎭 4. Visual Companion & Cinematic Studio Lighting
- **Interactive Companion Mascots**: Multiple companion models (including Swara) with support for custom user-uploaded character avatars.
- **Real-Time Positioning Suite**: Interactive D-pad joystick control for precise scale, horizontal/vertical translation, brightness, contrast, and saturation tuning.
- **Cinematic Studio Light Engine**:
  - Soft directional spotlight cone with custom clip paths.
  - Ambient glow with adjustable flare scaling.
  - Feet shadow and ground light illumination for realistic depth.
  - Transparent floating adjustment panel on mobile for real-time visual feedback.

### 🎵 5. Integrated Music & Entertainment Hub
- **Streaming Music Player**: Built-in music search and streaming engine for seamless background music while chatting.
- **Visualizer & Fullscreen Player**: Beautiful glowing waveform visualizer, playlist queuing, progress scrubber, and mini-player dock.

### ⏰ 6. Smart Reminders & Task Management
- **Natural Language Reminder Setting**: Create alarms and tasks through natural chat or dedicated voice prompts.
- **Cinematic Overlay Alerts**: High-visibility glowing alert overlays when a reminder triggers, accompanied by audible voice announcements.

### 🎨 7. Aesthetic Glassmorphism & Adaptive Theming
- **Curated Color Themes**: Dynamic colorways including *Pink, Yellow, Cyan/Blue, Orchid, Peach, Beige, Maroon, Gemini*, and a custom hex picker.
- **Ultra-Smooth Defocus Transitions**: Seamless screen blur and color morphing transitions when switching themes.
- **Mobile-First Responsive Design**: Optimized bottom drawers, safe area insets, touch-friendly joystick controls, and custom glassmorphism.

---

## 🛠️ Tech Stack

| Domain | Technologies & Libraries |
| :--- | :--- |
| **Frontend Framework** | React 18 (SWC), TypeScript 5, Vite 5 |
| **Styling & Design System** | Tailwind CSS 3.4, PostCSS, Radix UI Primitives, Lucide Icons |
| **Animations & Transitions** | Framer Motion 12, Tailwind Animate, Canvas Confetti |
| **State Management** | Zustand 5, React Query (TanStack Query) |
| **Cloud & Backend Services** | Firebase (Auth, Firestore), AWS SDK (Polly, Rekognition, Bedrock) |
| **AI & Inference** | Groq Cloud API, Google Gemini, OpenRouter, Cloudflare Flux |
| **Storage & Caching** | IndexedDB (`idb`), LocalStorage, Firestore Cloud Sync |
| **Audio & Speech** | Web Audio API, Web Speech API, AWS Polly, Groq Whisper |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18.x or later recommended)
- [npm](https://www.npmjs.com/) or [bun](https://bun.sh/)
- A [Groq Cloud](https://console.groq.com/) account for LLM API keys
- (Optional) AWS account for AWS Polly Indian voice synthesis
- (Optional) Firebase project for cloud auth and memory sync

### 1. Clone the Repository
```bash
git clone https://github.com/Alakhx-dev/Saheli-Ai-Assistant.git
cd Saheli-Ai-Assistant
```

### 2. Install Dependencies
```bash
npm install
# or
bun install
```

### 3. Setup Environment Variables
Create a `.env` file in the root directory by copying the sample template:
```bash
cp .env.example .env
```
Fill in your credentials (see [Environment Configuration](#-environment-configuration) below).

### 4. Start the Development Server
```bash
npm run dev -- --host
```
Open your browser and navigate to `http://localhost:5173` (or the IP address shown in your terminal for mobile testing).

---

## 🔐 Environment Configuration

| Variable | Required | Description |
| :--- | :---: | :--- |
| `VITE_SITE_URL` | Optional | Base URL of the application (default: `http://localhost:3000`). |
| `VITE_GROQ_API_KEY` | **Yes** | Groq Cloud API Key for ultra-fast Llama-3/4 LLM inference. |
| `AWS_ACCESS_KEY_ID` | Optional | AWS IAM Access Key for AWS Polly (Swara voice) and Rekognition. |
| `AWS_SECRET_ACCESS_KEY` | Optional | AWS IAM Secret Access Key. |
| `AWS_REGION` | Optional | AWS Region for Polly service (e.g., `us-east-1` or `ap-south-1`). |
| `VITE_TTS_API_URL` | Optional | Custom hosted backend URL for text-to-speech `/api/tts`. |
| `VITE_API_PROXY_TARGET` | Optional | Proxy target for development server API routes. |

---

## 📂 Project Structure

```text
Saheli-Ai-Assistant/
├── api/                       # Serverless backend endpoints
│   ├── analyze-face.ts        # Face & expression analysis via AWS Bedrock/Rekognition
│   ├── flux.ts                # Image generation via Cloudflare Flux
│   ├── music.ts               # Music search and streaming audio resolver
│   ├── title.ts               # Automatic conversation title generation
│   ├── tts.ts                 # AWS Polly high-definition speech synthesis
│   └── weather.ts             # Real-time weather API integration
├── public/                    # Static assets, logos, and audio tracks
├── src/
│   ├── assets/                # App icons, avatars, and visual illustrations
│   ├── components/
│   │   ├── butterflies/       # Particle effects and floating butterflies
│   │   ├── chat/              # Chat cards, code blocks, BestieSnapCards
│   │   ├── memory/            # Memory modal, facts list, image grid
│   │   ├── mobile/            # Mobile flip sidebar, bottom guards, touch UI
│   │   ├── music/             # Fullscreen music player, audio visualizer dock
│   │   ├── reminders/         # Reminders manager and cinematic alert overlays
│   │   ├── settings/          # Comprehensive personalization & settings drawer
│   │   ├── ui/                # Radix UI glassmorphic primitives (dialog, slider, etc.)
│   │   └── AIDoll.tsx         # 2D/3D companion render canvas
│   ├── hooks/                 # Custom React hooks (voice, awareness, audio, theme)
│   ├── lib/
│   │   ├── ai-service.ts      # Multi-provider LLM brain & personality prompts
│   │   ├── chat-history.ts    # Session history management & local caching
│   │   ├── firebase.ts        # Firebase Auth & Firestore client configuration
│   │   ├── memory.ts          # Autonomous memory extraction & persistence
│   │   └── realtime-awareness.ts # Live clock, weather, and geolocation tracking
│   ├── pages/
│   │   ├── Chat.tsx           # Main application view with companion & chat interface
│   │   ├── Login.tsx          # Authentication & Google login screen
│   │   └── SharedChat.tsx     # Public read-only shared conversation viewer
│   ├── store/                 # Zustand global application & reminder stores
│   ├── utils/
│   │   ├── indexedDb.ts       # High-performance client-side IndexedDB driver
│   │   └── speechEngine.ts    # Browser Web Speech & audio playback management
│   ├── App.tsx                # Application root with router and theme provider
│   ├── index.css              # Global styles, glassmorphism, animations, theme tokens
│   └── main.tsx               # DOM entry point
├── tailwind.config.ts         # Tailwind CSS typography, animations & color tokens
├── vite.config.ts             # Vite build pipeline, proxying & PWA configuration
└── package.json               # Dependencies and scripts
```

---

## 🎯 Available Scripts

- **`npm run dev`**: Starts the Vite development server with hot-module replacement.
- **`npm run build`**: Compiles TypeScript and builds production-ready static assets in `dist/`.
- **`npm run preview`**: Locally serves the built production bundle for testing.
- **`npm run lint`**: Runs ESLint to check for code quality and syntax standards.
- **`npm run test`**: Runs unit and component test suites via Vitest.

---

## 📱 Mobile Experience

Saheli is meticulously optimized for touch screens and mobile browsers:
- **Floating Glassmorphic Panel**: Companion adjustment panel is transparent on mobile screens (`max-sm:bg-transparent`), allowing users to observe visual changes in real-time behind the controls.
- **Bottom Drawer Portals**: Memory management, music playlists, and settings open as native-feeling bottom sheets with smooth drag handles.
- **Touch D-Pad**: Sized and calibrated specifically for thumb navigation without interfering with page scrolling.
- **Safe Area Inset Support**: Automatically handles dynamic notches, home indicators, and software keyboards on iOS and Android.

---

## 💖 Contributing

Contributions, feedback, and suggestions are warmly welcomed!
1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 👤 Author & Acknowledgements

- **Created by**: **Alakh** ([@Alakhx-dev](https://github.com/Alakhx-dev))
- Built with ❤️ for everyone who needs a trusted companion, best friend, and intelligent assistant in their daily life.

---

<div align="center">
  <sub>Made with passion • Saheli AI © 2026</sub>
</div>

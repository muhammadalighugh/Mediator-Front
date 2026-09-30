# MediFact — Frontend

Next.js 14 frontend for the **Argument Mediator** app. Live at [mediator-front-psi.vercel.app](https://mediator-front-psi.vercel.app).

---

## Tech stack

| Layer | Library |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Animation | Framer Motion |
| Icons | Lucide React |
| Real-time | WebSocket (`lib/websocket.ts`) |
| Font | Bebas Neue (Google Fonts) |

---

## Project structure

```
app/
  page.tsx              # Landing page (hero, how-it-works, sign-in)
  layout.tsx            # Root layout + metadata
  start/page.tsx        # Speaker enrollment + session launch
  session/[id]/page.tsx # Live session (transcript, claims, report)
  demo/page.tsx         # Pre-recorded demo player
  business/page.tsx     # Business/pricing page

components/
  LoginModal.tsx        # Sign-in / register modal
  LiveTranscript.tsx    # Real-time transcript with speaker colours
  ClaimBoard.tsx        # Extracted claims panel
  ContradictionAlert.tsx# Pop-up contradiction flags
  MediationReport.tsx   # Final report + PDF download
  EvidenceUpload.tsx    # In-session document upload
  PastSessions.tsx      # User's session history
  SiteNav.tsx           # Top navigation bar
  ui/                   # Shared UI primitives (bouncing dots, bg gradient)

lib/
  websocket.ts          # Typed WS client with auto-reconnect
  micCapture.ts         # AudioWorklet microphone → PCM pipeline
  useWsEnrollment.ts    # Speaker enrollment hook (voice capture + WS)
  useVoiceEnrollment.ts # Voice segment recording helper
  useRequireAuth.ts     # Auth guard + JWT helpers
  types.ts              # Shared TypeScript types
  utils.ts              # cn() class-merge helper
  demo.ts               # Demo audio loader
  demoPlayer.ts         # Demo session replay engine
```

---

## Environment variables

The app reads two `NEXT_PUBLIC_` env vars at build time. These must be set in the **Vercel dashboard** under **Project → Settings → Environment Variables**.

| Variable | Description | Production value |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | HTTP base URL of the backend | `https://mediator-backend-75oi.onrender.com` |
| `NEXT_PUBLIC_WS_URL` | WebSocket base URL of the backend | `wss://mediator-backend-75oi.onrender.com` |

For local development copy `.env.local.example` to `.env.local` and use the local values:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_WS_URL=ws://127.0.0.1:8000
```

---

## Running locally

```bash
# 1. Install dependencies
npm install

# 2. Set up env vars (backend must be running separately)
cp .env.local.example .env.local
# edit .env.local — set the local URLs above

# 3. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment (Vercel)

The project is deployed via Vercel connected to the GitHub repository.

**Every push to `main` triggers an automatic re-deploy.**

### First-time setup

1. Import the repo in the [Vercel dashboard](https://vercel.com/new).
2. Set **Root Directory** to `assemblyai/frontend`.
3. Add the two environment variables above under **Settings → Environment Variables**.
4. Deploy.

No build configuration is needed — Vercel auto-detects Next.js.

---

## Pages

### `/` — Landing
Sign-in button opens `LoginModal`. Demo link goes to `/demo`. No auth required.

### `/start` — Launch a session
- Optionally enroll both speakers by voice (they say their name into the mic).
- Or skip enrollment and use positional labels (Speaker 1 / Speaker 2).
- Upload evidence documents (`.txt`, `.md`, `.csv`, `.pdf`) before launching.
- Redirects to `/session/[id]` on launch.

### `/session/[id]` — Live session
- Connects to the backend WebSocket (`wss://...`).
- Streams microphone audio as base64-encoded 16-bit PCM chunks.
- Renders live transcript, extracted claims, contradiction alerts.
- After `end_session` the final mediation report is displayed with a PDF download button.

### `/demo` — Demo player
Replays a pre-recorded conversation (`/demo/sample_conversation.mp3`) through the full pipeline so the app can be evaluated without a microphone.

---

## Key files

### [`lib/websocket.ts`](lib/websocket.ts)
Typed WebSocket wrapper. Reads `NEXT_PUBLIC_WS_URL`. Auto-reconnects up to 15 times with a 2 s interval. Export `connect(sessionId, email, token)` returns a `MediatorSocket` instance.

### [`lib/micCapture.ts`](lib/micCapture.ts)
`MicCapture` class. Uses an `AudioWorklet` (`/pcm-worklet.js`) to downsample the mic stream to 16 kHz 16-bit mono PCM and emit chunks via a callback.

### [`components/LoginModal.tsx`](components/LoginModal.tsx)
Handles both sign-in and registration. Posts to `NEXT_PUBLIC_API_URL/auth/login` and `/auth/register`. Stores the JWT in `localStorage`.

---

## Backend

The backend (FastAPI + Python) is deployed separately on **Render**:

- **URL:** `https://mediator-backend-75oi.onrender.com`
- **Repo folder:** `assemblyai/backend`
- **README:** `assemblyai/backend/README.md`

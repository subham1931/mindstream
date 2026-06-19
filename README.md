# MindStream

AI chat app powered by DeepSeek V4 Pro via NVIDIA API. React frontend + Node/Express backend.

## Local development

```bash
# Backend
cd server
cp .env.example .env   # add your NVIDIA_API_KEY
npm install
npm start

# Frontend (new terminal)
cd client
npm install
npm run dev
```

Open http://localhost:5173

## Deploy free

### 1. Backend — [Render](https://render.com) (free tier)

1. Push this repo to GitHub
2. Render → **New** → **Blueprint** → connect [subham1931/mindstream](https://github.com/subham1931/mindstream)
3. Set environment variables:
   - `NVIDIA_API_KEYS` — comma-separated NVIDIA keys (auto-rotates when one hits rate limit)
   - `NVIDIA_API_KEY` — single key (alternative to `NVIDIA_API_KEYS`)
   - `NVIDIA_FALLBACK_MODELS` — optional comma-separated backup models
   - `CLIENT_URL` — optional; Vercel `*.vercel.app` URLs are allowed automatically
4. Deploy. Copy the backend URL (e.g. `https://mindstream-api.onrender.com`)

### 2. Frontend — [Vercel](https://vercel.com) (free tier)

1. Vercel → **Add New** → **Project** → import the same GitHub repo
2. Set **Root Directory** to `client`
3. Add environment variable:
   - `VITE_API_URL` = your Render backend URL (no trailing slash)
4. Deploy

### 3. Finish setup

Update Render `CLIENT_URL` to match your final Vercel URL, then redeploy the backend if needed.

## Project structure

```
mindstream-chat/
├── client/     React + Vite UI
├── server/     Express API proxy
└── render.yaml Render blueprint
```

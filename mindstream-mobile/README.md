# MindStream Mobile

React Native (Expo) mobile app for [MindStream](../README.md). Uses the same `server` API and Supabase auth as the web client.

## Setup

```bash
cd mindstream-mobile
cp .env.example .env   # set API URL and Supabase keys
npm install
npm start
```

Scan the QR code with **Expo Go** (Android/iOS) or press `a` for Android emulator / `i` for iOS simulator (macOS only).

## Environment

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Backend URL (no trailing slash) |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |

### Local backend on a physical device

Use your computer's LAN IP, not `localhost`:

```
EXPO_PUBLIC_API_URL=http://192.168.1.10:3001
```

- **Android emulator:** `http://10.0.2.2:3001`
- **iOS simulator:** `http://localhost:3001`
- **Production:** `https://mindstream-api.onrender.com`

Ensure the server is running (`cd server && npm start`) and that `CLIENT_URL` on Render allows your setup if needed.

## Features

- AI chat with streaming responses and stop generation
- Model picker (Llama, Qwen, Kimi, Gemma, DeepSeek)
- Conversation history (signed-in users)
- Draft new chats (not saved until first message)
- Temporary chat mode
- Pin / delete chats (long-press in sidebar)
- Email sign in & sign up via Supabase

## Project structure

```
mindstream-mobile/
├── App.tsx              Entry + navigation
├── src/
│   ├── components/      Chat UI, auth, messages
│   ├── context/         Auth + chat state
│   ├── hooks/           useChat (API + persistence)
│   ├── screens/         Chat + drawer sidebar
│   ├── api.ts           API base URL
│   └── supabase.ts      Supabase client
└── app.config.js        Expo config + env
```

## Build for stores

```bash
npx expo prebuild
# Then open ios/ or android/ in Xcode / Android Studio
```

For EAS Build, see [Expo documentation](https://docs.expo.dev/build/introduction/).

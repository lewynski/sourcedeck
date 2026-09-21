# SourceDeck

A local-first website source manager built with Next.js and Tailwind CSS. It is designed for Vercel deployment and can later be adapted into an Android app with Capacitor plus a native WebView layer.

## Features

- Add, edit, delete, and favorite website sources
- Open saved websites inside SourceDeck's built-in source viewer
- Quick-open any valid HTTP/HTTPS URL in the built-in viewer
- External-open fallback for sites that block iframe embedding
- Search your source library
- Launch history and open counts
- Local browser storage — no database required
- JSON backup export/import
- Responsive desktop/mobile layout
- PWA manifest included
- Safe URL validation (`http:` and `https:` only)
- Video-friendly iframe permissions for sources that permit embedding

## Built-in viewer behavior

SourceDeck uses a standard browser iframe for the Vercel/web version. If a website permits iframe embedding, you can browse it and use its own web player without leaving SourceDeck.

Some websites send `X-Frame-Options` or Content Security Policy (`frame-ancestors`) headers that intentionally prevent other websites from embedding them. SourceDeck does **not** remove or bypass those protections. The viewer always includes **Open externally** as a fallback.

The web version also cannot reliably control the back/forward history of a cross-origin embedded site. A later Android version can provide a fuller browser experience through a native WebView.

## Design direction

The UI uses a restrained enterprise-inspired visual system: off-black surfaces, warm neutral text, rust accents, strict borders/grids, and subtle motion. It is inspired by the visual language of the ERP design reference supplied for the project, while the implementation and interface are original.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploy to Vercel

1. Create a new GitHub repository.
2. Upload/push this project to the repository.
3. In Vercel, choose **Add New > Project**.
4. Import the GitHub repository.
5. Vercel should detect **Next.js** automatically.
6. No environment variables are required.
7. Click **Deploy**.

## Data storage

All data is saved in the user's browser using `localStorage`:

- `sourcedeck.sources.v1`
- `sourcedeck.history.v1`

This means data is device/browser-specific. Use **Export backup** before switching devices.

## Android conversion later

The same source library model can be retained while replacing the iframe viewer with a native Android WebView.

```text
Next.js UI
   ↓
Capacitor
   ↓
Android native WebView screen
   ↓
APK / AAB
```

A native WebView can later add back/forward controls, progress reporting, full-screen video handling, downloads where permitted, and other Android-specific behaviors.

## Notes

SourceDeck is a generic browser/source manager. Websites retain their own authentication, framing, content, copyright, and usage restrictions. Use sources and content you are authorized to access.

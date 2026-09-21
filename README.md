# SourceDeck

A local-first website source launcher built with Next.js and Tailwind CSS. It is designed for Vercel deployment and can later be adapted into an Android app with Capacitor.

## Features

- Add, edit, delete, and favorite website sources
- Quick-open any valid HTTP/HTTPS URL
- Search your source library
- Launch history
- Local browser storage — no database required
- JSON backup export/import
- Responsive desktop/mobile layout
- PWA manifest included
- Safe URL validation (only `http:` and `https:`)
- No iframe dependency; sources open in a new browser tab

## Design direction

The UI uses a restrained enterprise-inspired visual system: off-black surfaces, warm neutral text, rust accents, strict borders/grids, and subtle motion. It is inspired by the visual language of the ERP design reference supplied for the project, but the implementation and interface are original.

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

This means data is device/browser-specific. Use the built-in **Export backup** function before switching devices.

## Android conversion later

The project is intentionally separated from any iframe or streaming extraction logic. A future Android version can use Capacitor and an in-app browser/WebView layer while keeping the same source library model.

Typical future path:

```text
Next.js UI
   ↓
Capacitor
   ↓
Android Studio
   ↓
APK / AAB
```

For Android, replace the `window.open(...)` call in `app/page.tsx` with your chosen Capacitor Browser or WebView integration.

## Notes

This is a generic source/bookmark launcher. Websites may enforce their own login, content, framing, automation, or usage restrictions. Respect each site's terms and content rights.

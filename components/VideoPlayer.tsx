"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Playback } from "@/lib/sources/types";

type Props = {
  playback: Playback;
  startAt?: number;
  onProgress?: (position: number, duration: number) => void;
  onEnded?: () => void;
};

export default function VideoPlayer({ playback, startAt = 0, onProgress, onEnded }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSave = useRef(0);
  const progressRef = useRef(onProgress);
  const endedRef = useRef(onEnded);
  const startRef = useRef(startAt);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  progressRef.current = onProgress;
  endedRef.current = onEnded;
  startRef.current = startAt;

  const stream = playback.streams[0];
  const streamUrl = stream?.url;
  const streamKind = stream?.kind;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;
    let hls: { destroy(): void } | null = null;
    let cancelled = false;
    setError(null);
    setLoading(true);

    const seek = () => {
      const at = startRef.current;
      if (at > 3 && Number.isFinite(video.duration) && at < video.duration - 5) {
        video.currentTime = at;
      }
    };
    video.addEventListener("loadedmetadata", seek, { once: true });

    async function attach() {
      if (!video) return;
      if (streamKind === "hls" && !video.canPlayType("application/vnd.apple.mpegurl")) {
        const { default: Hls } = await import("hls.js");
        if (cancelled) return;
        if (!Hls.isSupported()) {
          setError("This browser can't play HLS streams.");
          return;
        }
        const instance = new Hls();
        hls = instance;
        instance.loadSource(streamUrl!);
        instance.attachMedia(video);
        instance.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) setError("The stream failed to load.");
        });
      } else {
        video.src = streamUrl!;
      }
    }
    attach().catch(() => setError("The player failed to start."));

    return () => {
      cancelled = true;
      video.removeEventListener("loadedmetadata", seek);
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [streamUrl, streamKind]);

  // Flush progress when the tab closes or is hidden (phones kill background tabs).
  useEffect(() => {
    const flush = () => {
      const v = videoRef.current;
      if (v && v.duration) progressRef.current?.(v.currentTime, v.duration);
    };
    const onHide = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      flush();
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [streamUrl]);

  const hasSubs = !!playback.subtitles?.length;

  return (
    <div className="relative aspect-video w-full bg-black">
      <video
        ref={videoRef}
        className="h-full w-full"
        controls
        playsInline
        autoPlay
        preload="metadata"
        crossOrigin={hasSubs ? "anonymous" : undefined}
        onCanPlay={() => setLoading(false)}
        onWaiting={() => setLoading(true)}
        onPlaying={() => setLoading(false)}
        onError={() => setError("This video couldn't be played (unsupported format or blocked by the host).")}
        onPause={(e) => {
          const v = e.currentTarget;
          if (v.duration) progressRef.current?.(v.currentTime, v.duration);
        }}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          const now = Date.now();
          if (v.duration && now - lastSave.current > 5000) {
            lastSave.current = now;
            progressRef.current?.(v.currentTime, v.duration);
          }
        }}
        onEnded={(e) => {
          const v = e.currentTarget;
          progressRef.current?.(v.duration, v.duration);
          endedRef.current?.();
        }}
      >
        {playback.subtitles?.map((track, i) => (
          <track key={track.url} kind="subtitles" src={track.url} label={track.label} srcLang={track.lang} default={i === 0} />
        ))}
      </video>

      {loading && !error && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <Loader2 className="h-7 w-7 animate-spin text-white/70" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 grid place-items-center bg-[#0a0908]/95 p-6 text-center">
          <div>
            <p className="text-sm text-[#e9e2dc]">{error}</p>
            {streamUrl && (
              <a
                href={streamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 bg-[#f4f0ea] px-4 py-2.5 text-xs font-semibold text-[#0a0908]"
              >
                <ExternalLink className="h-4 w-4" /> Open stream directly
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

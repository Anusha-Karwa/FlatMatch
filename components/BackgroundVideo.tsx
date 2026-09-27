"use client";

import { useEffect, useState } from "react";

/**
 * Looping aerial city footage behind the green banners (Pexels, free licence).
 * Skipped for reduced-motion and data-saver users; they keep the plain green gradient.
 * Fades in only once it can play, so the gradient never flashes to black.
 */
export function BackgroundVideo({ className = "" }: { className?: string }) {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    setEnabled(!reduceMotion && !saveData);
  }, []);

  if (!enabled) return null;
  return (
    <video
      className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"} ${className}`}
      src="/videos/skyline.mp4"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden
      tabIndex={-1}
      onCanPlay={() => setReady(true)}
    />
  );
}

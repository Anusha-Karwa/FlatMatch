"use client";

import { useEffect, useState } from "react";

/**
 * City backdrop behind the green banners: a still photo (the video's first frame), with the
 * looping aerial footage (Pexels, free licence) fading in on top once it can play.
 * Reduced-motion and data-saver visitors get the photo only.
 */
export function BackgroundVideo({ className = "" }: { className?: string }) {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    setEnabled(!reduceMotion && !saveData);
  }, []);

  const layer = `pointer-events-none absolute inset-0 h-full w-full object-cover ${className}`;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/videos/skyline-poster.jpg" alt="" aria-hidden className={layer} decoding="async" />
      {enabled && (
        <video
          className={`${layer} transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}
          src="/videos/skyline.mp4"
          poster="/videos/skyline-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
          tabIndex={-1}
          onCanPlay={() => setReady(true)}
        />
      )}
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

const VIDEO_SRC = "/videos/city-sunset.mp4";
const PLAYBACK_RATE = 0.5;

/**
 * Full-screen sunset skyline video behind the page on desktop (1024px+) only. The poster photo
 * comes from CSS inside a media query, so phones download neither. Reduced-motion and data-saver
 * visitors keep the still photo.
 */
export function DesktopBackdrop() {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    const update = () => setEnabled(wide.matches && !reduceMotion && !saveData);
    update();
    wide.addEventListener("change", update);
    return () => wide.removeEventListener("change", update);
  }, []);

  const applyRate = () => {
    if (videoRef.current) videoRef.current.playbackRate = PLAYBACK_RATE;
  };

  return (
    <div className="desktop-backdrop" aria-hidden>
      {enabled && (
        <video
          ref={videoRef}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}
          src={VIDEO_SRC}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          tabIndex={-1}
          onLoadedMetadata={applyRate}
          onPlay={applyRate}
          onCanPlay={() => {
            applyRate();
            setReady(true);
          }}
        />
      )}
      <div className="desktop-wash" />
    </div>
  );
}

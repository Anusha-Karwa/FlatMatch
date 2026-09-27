"use client";

import { useEffect, useRef, useState } from "react";

const VIDEO_SRC = "/videos/beach-city.mp4";
const POSTER_SRC = "/videos/beach-city-poster.jpg";
/** Slowed down so the footage drifts calmly behind the text. */
const PLAYBACK_RATE = 0.5;

/**
 * City backdrop behind the green banners: a still photo (the video's first frame), with the
 * looping beach-and-city footage (Pexels, free licence) fading in on top once it can play.
 * Reduced-motion and data-saver visitors get the photo only.
 */
export function BackgroundVideo({ className = "" }: { className?: string }) {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    setEnabled(!reduceMotion && !saveData);
  }, []);

  // playbackRate can reset when the source (re)loads, so set it on every load event too.
  const applyRate = () => {
    if (videoRef.current) videoRef.current.playbackRate = PLAYBACK_RATE;
  };

  const layer = `pointer-events-none absolute inset-0 h-full w-full object-cover ${className}`;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={POSTER_SRC} alt="" aria-hidden className={layer} decoding="async" />
      {enabled && (
        <video
          ref={videoRef}
          className={`${layer} transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}
          src={VIDEO_SRC}
          poster={POSTER_SRC}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
          tabIndex={-1}
          onLoadedMetadata={applyRate}
          onPlay={applyRate}
          onCanPlay={() => {
            applyRate();
            setReady(true);
          }}
        />
      )}
    </>
  );
}

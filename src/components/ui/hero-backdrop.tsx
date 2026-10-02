"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Sliding hero background.
 *
 * Real Kigali photography rather than an abstract gradient: the goal is for a
 * visitor to recognise their own city in the first second. Each slide cross-
 * fades and slowly drifts, then pauses - continuous motion reads as a tech
 * demo, so the cycle only advances on an explicit interval and stops on hover.
 *
 * Honours prefers-reduced-motion by holding a single frame with no drift.
 */
const SLIDES = [
  {
    src: "/kigali/convention-centre.jpg",
    alt: "Kigali Convention Centre rising above its landscaped grounds",
    place: "Kigali Convention Centre",
  },
  {
    src: "/kigali/skyline.jpg",
    alt: "The Rwandan flag above the Kigali skyline and the CN Tower",
    place: "Kigali City Centre",
  },
  {
    src: "/kigali/hills-flag.jpg",
    alt: "Kigali's hills with the Rwandan flag in the foreground",
    place: "The Hills of Kigali",
  },
];

const DURATION = 7000;

export function HeroBackdrop() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback((next: number) => {
    setIndex(((next % SLIDES.length) + SLIDES.length) % SLIDES.length);
  }, []);

  useEffect(() => {
    if (paused || reduceMotion) return;
    timer.current = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), DURATION);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [paused, reduceMotion]);

  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {SLIDES.map((slide, i) => (
        <div
          key={slide.src}
          className="absolute inset-0 transition-opacity duration-[1400ms] ease-out"
          style={{ opacity: i === index ? 1 : 0 }}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            priority={i === 0}
            quality={72}
            sizes="100vw"
            className={
              reduceMotion
                ? "object-cover"
                : "object-cover motion-safe:animate-[hero-drift_26s_ease-in-out_infinite_alternate]"
            }
          />
        </div>
      ))}

      {/* Legibility scrims. Without these the glass search panel loses contrast
          against a bright sky, and the headline disappears on the skyline. */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(18,16,12,0.94)_0%,rgba(18,16,12,0.78)_45%,rgba(18,16,12,0.55)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(to_bottom,rgba(18,16,12,0.85),transparent)]" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-[linear-gradient(to_top,rgba(18,16,12,0.95),transparent)]" />
      {/* Warm wash ties the photography to the palette. */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_20%_20%,rgba(180,83,9,0.18),transparent_60%)]" />

      {/* Caption + controls: only the active slide is announced. */}
      <div className="absolute bottom-4 right-5 z-10 flex items-center gap-2 sm:bottom-6 sm:right-8">
        <span className="mr-1 hidden text-xs text-white/70 sm:inline">{SLIDES[index].place}</span>
        <button
          type="button"
          tabIndex={-1}
          aria-label="Previous image"
          onClick={() => go(index - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/80 backdrop-blur-md transition-colors hover:bg-white/20"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          tabIndex={-1}
          aria-label="Next image"
          onClick={() => go(index + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/80 backdrop-blur-md transition-colors hover:bg-white/20"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Progress dots double as slide position. */}
      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 sm:bottom-6">
        {SLIDES.map((s, i) => (
          <button
            key={s.src}
            type="button"
            tabIndex={-1}
            aria-label={`Show ${s.place}`}
            onClick={() => go(i)}
            className={`h-1 rounded-full transition-all duration-500 ${
              i === index ? "w-7 bg-white/90" : "w-3 bg-white/35 hover:bg-white/60"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default HeroBackdrop;
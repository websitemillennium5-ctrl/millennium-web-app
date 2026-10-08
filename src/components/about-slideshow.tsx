"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { aboutGallery } from "@/lib/site";

const INTERVAL = 5000;

/** Crossfading photo loop with a slow zoom and progress indicators */
export function AboutSlideshow() {
  const [index, setIndex] = useState(0);
  // The outgoing photo keeps zooming while it fades out, so it never snaps back mid-fade
  const [prev, setPrev] = useState<number | null>(null);
  const show = (i: number) => {
    setPrev(index);
    setIndex(i);
  };
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = window.setTimeout(() => {
      setPrev(index);
      setIndex((index + 1) % aboutGallery.length);
    }, INTERVAL);
    return () => window.clearTimeout(id);
  }, [index, paused]);

  return (
    <div
      className="group/slides absolute inset-0"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {aboutGallery.map((photo, i) => {
        const active = i === index;
        const zooming = active || i === prev;
        return (
          <div
            key={photo.src}
            aria-hidden={!active}
            className={`absolute inset-0 transition-opacity duration-[1400ms] ease-in-out ${active ? "opacity-100" : "opacity-0"}`}
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              priority={i === 0}
              sizes="(min-width: 1024px) 50vw, 100vw"
              className={`object-cover transition-transform ease-linear motion-reduce:transition-none ${
                zooming ? "scale-110 duration-[7000ms]" : "scale-100 duration-0"
              }`}
            />
          </div>
        );
      })}

      <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-ink/80 via-ink/30 to-transparent" />

      <div className="absolute inset-x-6 bottom-6 text-white">
        <div className="relative h-16 sm:h-14">
          {aboutGallery.map((photo, i) => (
            <p
              key={photo.src}
              className={`absolute inset-x-0 bottom-0 max-w-sm text-xl leading-snug font-semibold tracking-tight transition-all duration-700 ${
                i === index ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
              }`}
            >
              {photo.caption}
            </p>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-2">
          {aboutGallery.map((photo, i) => (
            <button
              key={photo.src}
              type="button"
              onClick={() => i !== index && show(i)}
              aria-label={`Show photo ${i + 1}`}
              className="h-1 flex-1 overflow-hidden rounded-full bg-white/25"
            >
              <span
                key={i === index ? `active-${index}` : undefined}
                className={`block h-full origin-left rounded-full bg-white ${
                  i < index ? "scale-x-100" : i === index ? "animate-[slide-progress_linear_forwards]" : "scale-x-0"
                }`}
                style={
                  i === index
                    ? { animationDuration: `${INTERVAL}ms`, animationPlayState: paused ? "paused" : "running" }
                    : undefined
                }
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

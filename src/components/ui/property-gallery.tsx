"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { CoverImage } from "./cover-image";
import { ChevronLeft, ChevronRight, X, Images as ImagesIcon, PlayCircle } from "lucide-react";

/**
 * Property photo gallery with a full-screen preview.
 *
 * Photography is the product on a property site, so the grid stays the visual
 * anchor and every image opens in a lightbox: click, arrow keys, and Escape.
 * Thumbnails below the hero keep the other shots one click away instead of
 * hiding them behind a carousel the user has to discover.
 *
 * `priority` on the first frame keeps the hero image out of the lazy-loading
 * queue, which is what the LCP element on this page is.
 */
export function PropertyGallery({
  images,
  title,
  videoUrl,
  badge,
}: {
  images: { url: string; altText?: string | null }[];
  title: string;
  videoUrl?: string | null;
  badge?: string | null;
}) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const count = images.length;

  const close = useCallback(() => setLightbox(null), []);
  const step = useCallback(
    (delta: number) => {
      setLightbox((i) => (i == null ? null : (i + delta + count) % count));
    },
    [count]
  );

  useEffect(() => {
    if (lightbox == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    // Stop the page behind the overlay from scrolling with the arrow keys.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [lightbox, close, step]);

  if (count === 0) {
    return (
      <div className="flex aspect-[16/9] w-full flex-col items-center justify-center rounded-[18px] bg-[#f2ede6] text-[#a8a29e]">
        <svg className="mb-3 h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
        </svg>
        <p className="text-sm">No photos yet</p>
      </div>
    );
  }

  const [first, ...rest] = images;

  return (
    <>
      {/* Hero frame: first photo at 16:9, the rest as a strip beneath it. */}
      <div className="overflow-hidden rounded-[18px] border border-[#e8e1d8] bg-[#fffdfb] shadow-[0_2px_8px_-2px_rgba(28,25,23,0.07)]">
        <button
          type="button"
          onClick={() => setLightbox(0)}
          className="group relative block aspect-[16/9] w-full overflow-hidden"
        >
<CoverImage
            src={first.url}
            alt={first.altText || title}
            sizes="(min-width: 1024px) 66vw, 100vw"
            priority
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
          <span aria-hidden className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/30 to-transparent" />

          {badge && (
            <span className="absolute left-4 top-4 rounded-full bg-[#047857] px-2.5 py-1 text-xs font-semibold text-white shadow-md">
              {badge}
            </span>
          )}

          {/* Affordance: this is a preview, not decoration. */}
          <span className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md transition-colors group-hover:bg-black/70">
            <ImagesIcon className="h-3.5 w-3.5" />
            {count} photo{count === 1 ? "" : "s"}
          </span>

          {videoUrl && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm transition-transform group-hover:scale-110">
                <PlayCircle className="h-9 w-9 text-white" />
              </span>
            </span>
          )}
        </button>

        {rest.length > 0 && (
          <div className="grid grid-cols-2 gap-px bg-[#e8e1d8] sm:grid-cols-3">
            {rest.slice(0, 3).map((img, i) => (
              <button
                key={img.url}
                type="button"
                onClick={() => setLightbox(i + 1)}
                className="group relative aspect-[16/10] overflow-hidden bg-[#f2ede6]"
              >
                <Image
                  src={img.url}
                  alt={img.altText || `${title} photo ${i + 2}`}
                  fill
                  sizes="(min-width: 640px) 22vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {i === 2 && rest.length > 3 && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-semibold text-white">
                    +{rest.length - 3} more
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox != null && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-[#0c0a09]/95 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`${title} photos`}
        >
          <div className="flex items-center justify-between px-4 py-3 text-white/70">
            <span className="text-sm tabular-nums">
              {lightbox + 1} / {count}
            </span>
            <button
              type="button"
              onClick={close}
              aria-label="Close preview"
              className="rounded-full p-2 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-4">
            <Image
              key={images[lightbox].url}
              src={images[lightbox].url}
              alt={images[lightbox].altText || `${title} photo ${lightbox + 1}`}
              width={2000}
              height={1500}
              sizes="95vw"
              className="max-h-full max-w-full rounded-lg object-contain"
            />

            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Previous photo"
                  className="absolute left-3 rounded-full bg-black/45 p-3 text-white backdrop-blur-md transition-colors hover:bg-black/70 sm:left-6"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Next photo"
                  className="absolute right-3 rounded-full bg-black/45 p-3 text-white backdrop-blur-md transition-colors hover:bg-black/70 sm:right-6"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {count > 1 && (
            <div className="flex justify-center gap-2 overflow-x-auto px-4 pb-5">
              {images.map((img, i) => (
                <button
                  key={img.url}
                  type="button"
                  onClick={() => setLightbox(i)}
                  aria-label={`Photo ${i + 1}`}
                  aria-current={i === lightbox}
                  className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-md transition-all ${
                    i === lightbox ? "ring-2 ring-white" : "opacity-50 hover:opacity-80"
                  }`}
                >
                  <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default PropertyGallery;
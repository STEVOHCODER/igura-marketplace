"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * Cover image with a graceful failure state.
 *
 * A stored URL can still be undecodable or already purged from the bucket, and
 * when that happens the browser paints its alt text straight across the card
 * badges. This lives in its own client component so `PropertyCard` can stay a
 * Server Component (it is rendered from `owners/[id]`, which is not a client
 * component) instead of dragging the whole card across the boundary.
 */
export function CoverImage({
  src,
  alt,
  sizes,
  className,
  priority,
}: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  /** Set on the LCP element (the property detail hero) so it is preloaded. */
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-slate-300">
        <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21"
          />
        </svg>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      {...(priority ? { priority } : {})}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

export default CoverImage;
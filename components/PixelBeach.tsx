import type { ReactNode } from "react";
import { SunMark } from "@/components/ui";

/**
 * The pixel beach behind the overview header.
 *
 * Drawn rather than dropped in as the reference jpg on purpose. The header
 * stretches from a phone to a wide desktop, and a 736px raster stretched across
 * that either blurs or crops the horizon out of frame. Bands of flat colour hold
 * the horizon wherever the box lands, cost nothing to load, and let the foam
 * animate on the waterline instead of over it.
 *
 * The palette is in globals.css, read off that same reference art.
 */

/** Foam tiles, 64px wide so the loop can step by exactly one tile. */
const FOAM_FRONT =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="12" shape-rendering="crispEdges">
      <g fill="#eefcff">
        <rect x="0" y="4" width="12" height="4"/><rect x="4" y="0" width="8" height="4"/>
        <rect x="16" y="6" width="16" height="4"/><rect x="20" y="2" width="8" height="4"/>
        <rect x="36" y="4" width="10" height="4"/><rect x="40" y="8" width="14" height="4"/>
        <rect x="52" y="2" width="8" height="4"/><rect x="56" y="6" width="8" height="4"/>
      </g>
    </svg>`,
  );

const FOAM_BACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="10" shape-rendering="crispEdges">
      <g fill="#c9f4f4">
        <rect x="2" y="2" width="18" height="4"/><rect x="10" y="6" width="10" height="4"/>
        <rect x="26" y="0" width="12" height="4"/><rect x="30" y="4" width="18" height="4"/>
        <rect x="50" y="2" width="12" height="4"/>
      </g>
    </svg>`,
  );

const CLOUD =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="20" shape-rendering="crispEdges">
      <g fill="#ffffff">
        <rect x="12" y="4" width="24" height="4"/><rect x="8" y="8" width="36" height="4"/>
        <rect x="4" y="12" width="48" height="4"/><rect x="16" y="0" width="12" height="4"/>
      </g>
    </svg>`,
  );

export function PixelBeach({ children }: { children: ReactNode }) {
  return (
    <div className="pixel-edge relative mb-8 overflow-hidden bg-beach-sky-mid">
      {/* Sky, sea and sand as hard bands. No soft gradient anywhere: a blend
          between two of these would be the one un-pixel thing on the page. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom," +
            "var(--color-beach-sky-high) 0 14%," +
            "var(--color-beach-sky-mid) 14% 28%," +
            "var(--color-beach-sky-low) 28% 40%," +
            "var(--color-beach-haze) 40% 48%," +
            "var(--color-beach-sea-deep) 48% 60%," +
            "var(--color-beach-sea-mid) 60% 70%," +
            "var(--color-beach-sea-low) 70% 78%," +
            "var(--color-beach-sand-wet) 78% 84%," +
            "var(--color-beach-sand) 84% 100%)",
        }}
      />

      <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
        <SunMark className="absolute right-6 top-5 h-12 w-12 sm:right-10 sm:h-16 sm:w-16" />

        {/* Clouds drift far slower than the foam, which is what sells the depth. */}
        <div
          className="beach-motion absolute left-0 top-[8%] h-5 w-[200%] pixelated"
          style={{
            backgroundImage: `url("${CLOUD}")`,
            backgroundRepeat: "repeat-x",
            backgroundSize: "180px 20px",
            animation: "beach-drift 90s steps(30) infinite",
          }}
        />
        <div
          className="beach-motion absolute left-0 top-[22%] h-5 w-[200%] opacity-80 pixelated"
          style={{
            backgroundImage: `url("${CLOUD}")`,
            backgroundRepeat: "repeat-x",
            backgroundSize: "260px 20px",
            animation: "beach-drift 140s steps(30) infinite",
          }}
        />

        {/* Two foam lines at different speeds. One alone reads as a moving
            stripe; two at different rates read as water. */}
        <div
          className="beach-motion absolute inset-x-0 top-[70%] h-2.5 pixelated"
          style={{
            backgroundImage: `url("${FOAM_BACK}")`,
            backgroundRepeat: "repeat-x",
            backgroundSize: "64px 10px",
            animation: "beach-foam 6s steps(16) infinite",
          }}
        />
        <div
          className="beach-motion absolute inset-x-0 top-[76%] h-3 pixelated"
          style={{
            backgroundImage: `url("${FOAM_FRONT}")`,
            backgroundRepeat: "repeat-x",
            backgroundSize: "64px 12px",
            animation: "beach-foam 3.5s steps(16) infinite",
          }}
        />
      </div>

      <div className="relative px-5 pb-16 pt-8 sm:px-8 sm:pb-20 sm:pt-10">{children}</div>
    </div>
  );
}

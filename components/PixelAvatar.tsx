import { displayName } from "@/lib/people";

/**
 * A pixel bust, one per person, drawn from their email address.
 *
 * Deterministic on purpose. Nothing about a person is stored anywhere, so the
 * address is the only input there is, and the same address has to produce the
 * same face in every browser or two people looking at the same message would
 * see different avatars against it. That also means nobody can pick their own
 * face, which is the honest trade while there is no shared storage to keep a
 * choice in.
 *
 * Drawn as rects on a 12x12 grid rather than shipped as images: it stays crisp
 * at 20px next to a chat line and at 64px on a profile row, from one source,
 * and adding a fifth person costs nothing.
 */

/**
 * The three heads, as character grids.
 *
 *   .  nothing    o  outline    h  hair
 *   s  skin       e  eye        t  shirt
 *
 * Every row is exactly GRID characters wide. They are drawn out in full rather
 * than generated so that the faces can be adjusted by looking at them.
 */
const GRID = 12;

const HEADS: string[][] = [
  // Cropped.
  [
    "....oooo....",
    "..oohhhhoo..",
    ".ohhhhhhhho.",
    ".ohhhhhhhho.",
    ".ohssssssho.",
    ".osssssssso.",
    ".oseesseeso.",
    ".osssssssso.",
    "..osssssso..",
    "...oossoo...",
    ".otttttttto.",
    "otttttttttto",
  ],
  // Long, framing the face.
  [
    "....oooo....",
    "..oohhhhoo..",
    ".ohhhhhhhho.",
    "ohhhhhhhhhho",
    "ohhsssssshho",
    "ohssssssssho",
    "ohseesseesho",
    "ohssssssssho",
    "ohhsssssshho",
    ".hhoossoohh.",
    ".otttttttto.",
    "otttttttttto",
  ],
  // Swept back, no sides.
  [
    "...oooooo...",
    "..ohhhhhho..",
    ".ohhhhhhhho.",
    ".ohhhhhhhho.",
    ".osssssssso.",
    ".osssssssso.",
    ".oseesseeso.",
    ".osssssssso.",
    "..osssssso..",
    "...oossoo...",
    ".otttttttto.",
    "otttttttttto",
  ],
];

/** Sunglasses replace the eye row wholesale. It is a beach brand. */
const SHADES_ROW = 6;
const SHADES = ".oggggggggo.";

const OUTLINE = "#002a53";
const EYE = "#002a53";
const LENS = "#0a1f33";

const SKINS = ["#ffdbac", "#f3c9a0", "#e0a878", "#c1784b", "#8d5524", "#5c3317"];
const HAIRS = ["#2b1b12", "#5a3a22", "#a9772f", "#e8c66a", "#b4443c", "#7a7a86"];
/** Shirts come from the brand palette, so a row of avatars still reads as SOLLOS. */
const SHIRTS = ["#002a53", "#00616c", "#ff6b00", "#0f7a4a", "#1b8fc6", "#ffd100"];

/** FNV-1a. Small, stable across runtimes, and enough to spread five addresses. */
function hash(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Each trait is hashed from the address plus its own name rather than from
 * different bits of one hash, so hair colour and shirt colour cannot end up
 * correlated across the roster.
 */
function trait(email: string, name: string, count: number): number {
  return hash(`${email.trim().toLowerCase()}:${name}`) % count;
}

export type AvatarLook = {
  head: string[];
  skin: string;
  hair: string;
  shirt: string;
  shades: boolean;
};

export function lookFor(email: string): AvatarLook {
  return {
    head: HEADS[trait(email, "head", HEADS.length)],
    skin: SKINS[trait(email, "skin", SKINS.length)],
    hair: HAIRS[trait(email, "hair", HAIRS.length)],
    shirt: SHIRTS[trait(email, "shirt", SHIRTS.length)],
    // One in four, so shades stay a detail you notice rather than the house style.
    shades: trait(email, "shades", 4) === 0,
  };
}

type Run = { x: number; y: number; width: number; fill: string };

/**
 * Runs of one colour become one rect. A rect per pixel would be 140 nodes per
 * avatar, and a chat page can hold a hundred avatars.
 */
function runsFor(look: AvatarLook): Run[] {
  const colors: Record<string, string> = {
    o: OUTLINE,
    e: EYE,
    g: LENS,
    h: look.hair,
    s: look.skin,
    t: look.shirt,
  };

  const runs: Run[] = [];
  look.head.forEach((row, y) => {
    const cells = look.shades && y === SHADES_ROW ? SHADES : row;
    let x = 0;
    while (x < GRID) {
      const char = cells[x];
      let width = 1;
      while (x + width < GRID && cells[x + width] === char) width++;
      const fill = colors[char];
      if (fill) runs.push({ x, y, width, fill });
      x += width;
    }
  });
  return runs;
}

export function PixelAvatar({
  email,
  size = 28,
  className = "",
  label,
}: {
  email: string;
  size?: number;
  className?: string;
  /**
   * Set only where the avatar stands alone. Next to a name it is decoration,
   * and announcing "Rodolfo" twice in a row helps nobody on a screen reader.
   */
  label?: string;
}) {
  const look = lookFor(email);
  const described = label ?? undefined;

  return (
    <svg
      viewBox={`0 0 ${GRID} ${GRID}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={`shrink-0 ${className}`}
      role={described ? "img" : undefined}
      aria-label={described}
      aria-hidden={described ? undefined : true}
    >
      {runsFor(look).map((run) => (
        <rect
          key={`${run.x},${run.y}`}
          x={run.x}
          y={run.y}
          width={run.width}
          height={1}
          fill={run.fill}
        />
      ))}
    </svg>
  );
}

/** An avatar with the name beside it, which is how a person usually appears. */
export function PersonTag({
  email,
  size = 20,
  className = "",
}: {
  email: string;
  size?: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <PixelAvatar email={email} size={size} />
      <span>{displayName(email)}</span>
    </span>
  );
}

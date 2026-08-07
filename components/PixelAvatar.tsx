import { PEOPLE, displayName } from "@/lib/people";

/**
 * A pixel alien, one per person, drawn from their email address.
 *
 * Deterministic on purpose. Nothing about a person is stored anywhere, so the
 * address is the only input there is, and the same address has to produce the
 * same face in every browser or two people looking at the same message would
 * see different avatars against it. That also means nobody can pick their own
 * face, which is the honest trade while there is no shared storage to keep a
 * choice in.
 *
 * Every colour comes from the brand and beach palettes, so a row of these still
 * reads as SOLLOS rather than as a sticker sheet. Drawn as rects on a 12x12
 * grid rather than shipped as images: it stays crisp at 20px next to a chat
 * line and at 64px on a profile row, from one source, and adding a fifth person
 * costs nothing.
 */

/**
 * The three heads, as character grids.
 *
 *   .  nothing    o  outline    s  skin
 *   e  eye        t  shirt      b  antenna tip
 *
 * Every row is exactly GRID characters wide. They are drawn out in full rather
 * than generated so that the faces can be adjusted by looking at them.
 */
const GRID = 12;

const HEADS: string[][] = [
  // Two antennae, narrow skull.
  [
    "..bb....bb..",
    "...o....o...",
    "...oooooo...",
    "..osssssso..",
    ".osssssssso.",
    ".osssssssso.",
    ".oeeesseeeo.",
    ".oseesseeso.",
    "..osssssso..",
    "...oossoo...",
    ".otttttttto.",
    "otttttttttto",
  ],
  // One antenna, wide skull.
  [
    ".....bb.....",
    ".....o......",
    "..oooooooo..",
    ".osssssssso.",
    "osssssssssso",
    "osssssssssso",
    "oeeesssseeeo",
    ".oeesssseeo.",
    ".osssssssso.",
    "...oossoo...",
    ".otttttttto.",
    "otttttttttto",
  ],
  // No antennae, tall dome.
  [
    "....oooo....",
    "..oossssoo..",
    ".osssssssso.",
    ".osssssssso.",
    "osssssssssso",
    "osssssssssso",
    "oeeesssseeeo",
    ".oeesssseeo.",
    ".osssssssso.",
    "...oossoo...",
    ".otttttttto.",
    "otttttttttto",
  ],
];

/** A visor over both eye rows. It is a beach brand, even in orbit. */
const VISOR_ROWS = [6, 7];
const VISOR = [".oggggggggo.", ".osggggggso."];

const OUTLINE = "#002a53"; // brand navy, the only line colour anywhere
const EYE = "#002a53";
const LENS = "#0a1f33";

/** Skins off the brand teals, greens and the beach sea. */
const SKINS = ["#15b4bb", "#37cfc8", "#00616c", "#0f7a4a", "#35abdb", "#ffd100"];
/** Shirts off the brand palette, so a row of avatars still reads as SOLLOS. */
const SHIRTS = ["#002a53", "#ff6b00", "#00616c", "#1b8fc6", "#ffd100", "#0f7a4a"];
/** The antenna tip, always one of the two warm brand colours. */
const TIPS = ["#ffd100", "#ff6b00"];

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
 * different bits of one hash, so skin and shirt cannot end up correlated
 * across the roster.
 */
function trait(email: string, name: string, count: number): number {
  return hash(`${email.trim().toLowerCase()}:${name}`) % count;
}

export type AvatarLook = {
  headIndex: number;
  skin: string;
  shirt: string;
  tip: string;
  visor: boolean;
};

function computeLook(email: string, variant: number): AvatarLook {
  // Variant 0 keeps the plain salts, so adding the de-duplication below did not
  // change the face of anybody who was not colliding.
  const salt = (name: string) => (variant === 0 ? name : `${name}#${variant}`);

  const skin = SKINS[trait(email, salt("skin"), SKINS.length)];
  const shirtIndex = trait(email, salt("shirt"), SHIRTS.length);

  // Teal appears in both palettes, so an unlucky pair would put a teal shirt
  // under a teal head and lose the shoulders entirely. Step along until they
  // differ rather than dropping the colour from one of the lists.
  let shirt = SHIRTS[shirtIndex];
  for (let i = 1; shirt === skin && i < SHIRTS.length; i++) {
    shirt = SHIRTS[(shirtIndex + i) % SHIRTS.length];
  }

  return {
    headIndex: trait(email, salt("head"), HEADS.length),
    skin,
    shirt,
    tip: TIPS[trait(email, salt("tip"), TIPS.length)],
    // One in four, so a visor stays a detail you notice rather than the uniform.
    visor: trait(email, salt("visor"), 4) === 0,
  };
}

/**
 * What makes two aliens read as the same alien.
 *
 * Head and skin only. Those two carry almost the whole silhouette at 20px, and
 * two people who differ by nothing but the colour of their shoulders are two
 * people nobody can tell apart in a chat log.
 */
function silhouette(look: AvatarLook): string {
  return `${look.headIndex}|${look.skin}`;
}

/**
 * Hashing each person independently is not enough on a roster this small.
 * Charlie and Dillon landed on the same head, the same skin and the same shirt,
 * which on a four-person team is not a rare collision, it is a quarter of the
 * company sharing a face.
 *
 * So the roster is resolved once, in order: anyone whose silhouette is already
 * taken gets rehashed under the next variant until it is not. PEOPLE comes from
 * ALLOWED_EMAILS and is identical in every browser, so this lands on the same
 * answer everywhere, which is the property that actually matters.
 */
const rosterLooks: Map<string, AvatarLook> = (() => {
  const taken = new Set<string>();
  const looks = new Map<string, AvatarLook>();

  for (const person of PEOPLE) {
    let variant = 0;
    let look = computeLook(person.email, variant);
    // Bounded so a palette smaller than the roster cannot spin here forever.
    while (taken.has(silhouette(look)) && variant < 32) {
      look = computeLook(person.email, ++variant);
    }
    taken.add(silhouette(look));
    looks.set(person.email, look);
  }
  return looks;
})();

/**
 * Anyone off the roster, such as an address left on an old message, keeps the
 * plain hash. There is nobody to collide with in a list they are not in.
 */
export function lookFor(email: string): AvatarLook {
  const key = email.trim().toLowerCase();
  return rosterLooks.get(key) ?? computeLook(key, 0);
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
    s: look.skin,
    t: look.shirt,
    b: look.tip,
  };

  const runs: Run[] = [];
  HEADS[look.headIndex].forEach((row, y) => {
    const visorRow = look.visor ? VISOR_ROWS.indexOf(y) : -1;
    const cells = visorRow === -1 ? row : VISOR[visorRow];
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

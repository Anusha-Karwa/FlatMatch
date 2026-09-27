/** Decorative SVG art: logo, city skyline and listing illustrations. No external images needed. */

/** Small deterministic PRNG so the art is identical on server and client. */
function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect width="40" height="40" rx="12" fill="#4ad1c4" />
      <path d="M8 21 20 10l12 11" fill="none" stroke="#0b3431" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 19v11h16V19" fill="none" stroke="#0b3431" strokeWidth="2.6" strokeLinejoin="round" />
      <circle cx="16.5" cy="24" r="2" fill="#dcbd80" />
      <circle cx="23.5" cy="24" r="2" fill="#dcbd80" />
      <path d="M16.5 24h7" stroke="#dcbd80" strokeWidth="1.6" />
    </svg>
  );
}

interface Building {
  x: number;
  w: number;
  h: number;
  roof: "flat" | "step" | "spire";
}

function buildings(seed: string, width: number, minH: number, maxH: number): Building[] {
  const r = rng(seed);
  const out: Building[] = [];
  let x = -10;
  while (x < width) {
    const w = 34 + Math.floor(r() * 50);
    const h = minH + Math.floor(r() * (maxH - minH));
    const roll = r();
    out.push({ x, w, h, roof: roll > 0.85 ? "spire" : roll > 0.6 ? "step" : "flat" });
    x += w + 2 + Math.floor(r() * 8);
  }
  return out;
}

/** A city skyline silhouette. Colours come from props so it works on light and dark bands. */
export function Skyline({
  className = "",
  back = "rgba(255,255,255,0.12)",
  front = "rgba(255,255,255,0.2)",
  windows = "rgba(255,255,255,0.32)",
  seed = "pune",
}: {
  className?: string;
  back?: string;
  front?: string;
  windows?: string;
  seed?: string;
}) {
  const W = 1200;
  const H = 180;
  const backRow = buildings(seed + "b", W, 60, 150);
  const frontRow = buildings(seed + "f", W, 30, 110);
  const r = rng(seed + "w");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" className={className} aria-hidden>
      {backRow.map((b, i) => (
        <rect key={`b${i}`} x={b.x} y={H - b.h} width={b.w} height={b.h} fill={back} />
      ))}
      {frontRow.map((b, i) => {
        const top = H - b.h;
        const cols = Math.max(2, Math.floor((b.w - 8) / 10));
        const rows = Math.floor((b.h - 14) / 12);
        return (
          <g key={`f${i}`}>
            <rect x={b.x} y={top} width={b.w} height={b.h} fill={front} />
            {b.roof === "step" && <rect x={b.x + b.w * 0.2} y={top - 10} width={b.w * 0.6} height={10} fill={front} />}
            {b.roof === "spire" && (
              <path d={`M${b.x + b.w / 2 - 3} ${top} L${b.x + b.w / 2} ${top - 22} L${b.x + b.w / 2 + 3} ${top} Z`} fill={front} />
            )}
            {Array.from({ length: rows }).flatMap((_, ry) =>
              Array.from({ length: cols }).map((__, cx) =>
                r() > 0.55 ? (
                  <rect
                    key={`${ry}-${cx}`}
                    x={b.x + 6 + cx * ((b.w - 12) / cols)}
                    y={top + 8 + ry * 12}
                    width={4}
                    height={5}
                    rx={0.5}
                    fill={windows}
                  />
                ) : null,
              ),
            )}
          </g>
        );
      })}
    </svg>
  );
}

const PALETTES = [
  { sky: ["#dcf6f2", "#f7efe0"], tower: "#2fb3a6", side: "#1d6560" },
  { sky: ["#e4eef0", "#f3f1ea"], tower: "#3aa39a", side: "#1f5f5b" },
  { sky: ["#f5ecd9", "#e0f5f2"], tower: "#259c91", side: "#1a524e" },
  { sky: ["#e3f5f1", "#eef3f6"], tower: "#4ab8ad", side: "#22706a" },
];

/**
 * Listing illustration in place of a photo: an apartment tower with the flat's own floor
 * highlighted in sand, so floor and lift are visible at a glance.
 */
export function PropertyArt({
  seed,
  floor,
  totalFloors,
  hasLift,
  className = "",
}: {
  seed: string;
  floor: number;
  totalFloors: number;
  hasLift: boolean;
  className?: string;
}) {
  const r = rng(seed);
  const p = PALETTES[Math.floor(r() * PALETTES.length)];
  const W = 320;
  const H = 180;
  const MAX_LEVELS = 14;
  const levels = Math.max(1, Math.min(totalFloors + 1, MAX_LEVELS)); // include ground
  const scale = totalFloors + 1 <= MAX_LEVELS ? 1 : (MAX_LEVELS - 1) / Math.max(1, totalFloors);
  const yourLevel = Math.min(Math.round(floor * scale), levels - 1);
  const floorH = Math.min(11, 130 / levels);
  const towerW = 92;
  const tx = 150 + Math.floor(r() * 30);
  const ground = H - 18;
  const top = ground - levels * floorH;
  const id = `sky-${seed.replace(/[^a-z0-9]/gi, "")}`;
  const neighbours = [
    { x: tx - 96, w: 70, h: 40 + r() * 50 },
    { x: tx + towerW + 14, w: 64, h: 30 + r() * 60 },
    { x: 8, w: 40, h: 20 + r() * 30 },
  ];
  const sunX = 40 + r() * 60;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky[0]} />
          <stop offset="1" stopColor={p.sky[1]} />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id})`} />
      <circle cx={sunX} cy={38} r={16} fill="#fff" opacity={0.7} />
      {neighbours.map((n, i) => (
        <rect key={i} x={n.x} y={ground - n.h} width={n.w} height={n.h} rx={2} fill={p.side} opacity={0.18} />
      ))}
      <rect x={tx + towerW} y={top + 6} width={12} height={ground - top - 6} fill={p.side} />
      <rect x={tx} y={top} width={towerW} height={ground - top} fill={p.tower} />
      <rect x={tx - 4} y={top - 5} width={towerW + 8} height={6} rx={1.5} fill={p.side} />
      {Array.from({ length: levels }).map((_, lvl) => {
        const y = ground - (lvl + 1) * floorH;
        const mine = lvl === yourLevel;
        return (
          <g key={lvl}>
            {mine && <rect x={tx - 3} y={y} width={towerW + 6} height={floorH} fill="#dcbd80" />}
            {[0, 1, 2, 3].map((c) => (
              <rect
                key={c}
                x={tx + 8 + c * 21}
                y={y + floorH * 0.22}
                width={13}
                height={floorH * 0.56}
                rx={1}
                fill={mine ? "#fff8ea" : "#ffffff"}
                opacity={mine ? 1 : 0.55}
              />
            ))}
          </g>
        );
      })}
      {hasLift && <rect x={tx + towerW + 3} y={top + 12} width={6} height={ground - top - 12} fill="#ffffff" opacity={0.35} />}
      <rect y={ground} width={W} height={H - ground} fill="#cdebe6" />
      {[tx - 30, tx + towerW + 36, 60, 290].map((x, i) => (
        <g key={i}>
          <rect x={x - 1.5} y={ground - 10} width={3} height={10} fill="#6b5a3e" />
          <circle cx={x} cy={ground - 16} r={9 + (i % 2) * 3} fill="#3f9a66" />
        </g>
      ))}
    </svg>
  );
}

export function PinIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden fill="currentColor">
      <path d="M10 1.5a6 6 0 0 0-6 6c0 4.4 6 11 6 11s6-6.6 6-11a6 6 0 0 0-6-6Zm0 8.2a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4Z" />
    </svg>
  );
}

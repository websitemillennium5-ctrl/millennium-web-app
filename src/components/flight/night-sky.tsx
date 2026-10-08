/**
 * Night sky above the airfield for the footer landing: a light-polluted gradient, a few
 * twinkling stars, a detailed moon, drifting moonlit clouds and a warm glow over the horizon.
 * Everything is generated from a seeded PRNG with integer math, so server and client markup match.
 */

function prng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

const stars = (() => {
  const r = prng(7);
  return Array.from({ length: 70 }, () => {
    const big = r() > 0.93;
    return {
      left: round(r() * 100),
      top: round(Math.pow(r(), 1.6) * 40), // only high in the sky; city glow washes out the rest
      size: big ? 2 : r() > 0.6 ? 1.5 : 1,
      opacity: round(0.2 + r() * 0.5),
      twinkle: r() > 0.55,
      duration: round(2.5 + r() * 4, 1),
      delay: round(-r() * 6, 1),
      warm: r() > 0.85,
    };
  });
})();

// moon craters: [cx, cy, r]
const craters: [number, number, number][] = [
  [62, 30, 3.2],
  [38, 66, 2.4],
  [70, 62, 4.2],
  [30, 38, 1.8],
  [52, 80, 2.1],
  [78, 44, 1.6],
  [45, 22, 1.4],
  [24, 56, 1.3],
  [58, 52, 1.2],
];

function Moon() {
  return (
    <div className="absolute top-[11%] right-[12%] size-20 sm:size-24">
      {/* atmospheric halo */}
      <span className="absolute -inset-24 rounded-full bg-[radial-gradient(circle,rgba(226,232,255,0.16),rgba(226,232,255,0.05)_35%,transparent_65%)]" />
      <span className="absolute -inset-3 rounded-full bg-[radial-gradient(circle,rgba(255,252,240,0.35),transparent_70%)] blur-md" />
      <svg viewBox="0 0 100 100" className="relative size-full drop-shadow-[0_0_18px_rgba(255,250,235,0.35)]">
        <defs>
          <radialGradient id="moon-base" cx="42%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#fffdf6" />
            <stop offset="55%" stopColor="#ebe6d8" />
            <stop offset="100%" stopColor="#c9c2b0" />
          </radialGradient>
          <radialGradient id="moon-limb" cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#2a2618" stopOpacity="0.45" />
          </radialGradient>
          <filter id="moon-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="4" />
            <feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.33  0 0 0 0 0.28  0 0 0 0.55 0" />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
          <filter id="moon-soft">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
          <clipPath id="moon-clip">
            <circle cx="50" cy="50" r="48" />
          </clipPath>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#moon-base)" />
        <g clipPath="url(#moon-clip)">
          {/* maria: the dark lunar seas */}
          <g fill="#8f8a7a" opacity="0.42" filter="url(#moon-soft)">
            <ellipse cx="36" cy="34" rx="15" ry="11" />
            <ellipse cx="56" cy="40" rx="11" ry="8" />
            <ellipse cx="44" cy="54" rx="9" ry="7" />
            <ellipse cx="30" cy="58" rx="7" ry="9" />
            <ellipse cx="64" cy="26" rx="6" ry="5" />
          </g>
          {craters.map(([cx, cy, r], i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r={r} fill="#a7a090" opacity="0.55" />
              <circle cx={cx - r * 0.25} cy={cy - r * 0.25} r={r} fill="none" stroke="#fffaf0" strokeOpacity="0.45" strokeWidth="0.5" />
            </g>
          ))}
          {/* bright ray crater */}
          <circle cx="40" cy="78" r="1.6" fill="#fffef8" opacity="0.9" />
          <rect width="100" height="100" filter="url(#moon-grain)" opacity="0.5" />
          <circle cx="50" cy="50" r="48" fill="url(#moon-limb)" />
        </g>
      </svg>
    </div>
  );
}

/** A soft cloud bank built from overlapping blurred puffs, lit from above by the moon */
function CloudBank({ className, duration, delay = 0 }: { className: string; duration: number; delay?: number }) {
  return (
    <div
      className={`absolute motion-safe:animate-[cloud-drift_var(--d)_ease-in-out_infinite_alternate] ${className}`}
      style={{ "--d": `${duration}s`, animationDelay: `${delay}s` } as React.CSSProperties}
    >
      <div className="relative h-full w-full blur-2xl">
        <span className="absolute top-[30%] left-0 h-[60%] w-[45%] rounded-full bg-[#2a3552]" />
        <span className="absolute top-[10%] left-[22%] h-[75%] w-[40%] rounded-full bg-[#34405f]" />
        <span className="absolute top-[25%] left-[50%] h-[65%] w-[45%] rounded-full bg-[#2c3755]" />
        {/* moonlit tops */}
        <span className="absolute top-[8%] left-[28%] h-[30%] w-[30%] rounded-full bg-[#8f9cc4]/35" />
        <span className="absolute top-[22%] left-[58%] h-[25%] w-[25%] rounded-full bg-[#8f9cc4]/25" />
      </div>
    </div>
  );
}

export function NightSky() {
  return (
    <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
      {/* deep sky: near-black zenith to a faint blue horizon */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#02040a_0%,#050a17_35%,#0a1226_70%,#0b1220_100%)]" />
      {/* stars */}
      {stars.map((s, i) => (
        <span
          key={i}
          className={`absolute rounded-full ${s.warm ? "bg-amber-100" : "bg-white"} ${
            s.twinkle ? "motion-safe:animate-[twinkle_var(--d)_ease-in-out_infinite]" : ""
          } ${s.size === 2 ? "shadow-[0_0_6px_1px_rgba(255,255,255,0.45)]" : ""}`}
          style={
            {
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              opacity: s.opacity,
              "--d": `${s.duration}s`,
              animationDelay: `${s.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}

      <Moon />

      {/* drifting cloud banks: one high across the moon, others low over the horizon */}
      <CloudBank className="top-[14%] right-[2%] h-28 w-[30rem] opacity-60" duration={70} />
      <CloudBank className="top-[30%] left-[-6%] h-28 w-[34rem] opacity-40" duration={95} delay={-30} />

      {/* light-polluted horizon above the airfield: the 3D ground covers everything below it */}
      <div className="absolute inset-x-0 top-[22%] h-[40%] bg-[linear-gradient(180deg,transparent,rgba(20,27,45,0.9)_75%,#141b2d)]" />
      <div className="absolute inset-x-0 top-[30%] h-[30%] bg-[radial-gradient(ellipse_70%_60%_at_55%_100%,rgba(255,150,95,0.16),transparent_70%)]" />
    </div>
  );
}

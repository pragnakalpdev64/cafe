/**
 * Static stand-in for the 3D salad bowl: shown first (fast paint) and kept for
 * reduced-motion users, data-saver mode and devices without WebGL.
 */
export function BowlPoster() {
  const leaves = [
    { x: 70, y: 150, r: -35, c: "#3d8a2c" },
    { x: 115, y: 118, r: -18, c: "#4f9e2f" },
    { x: 170, y: 104, r: -5, c: "#2f7424" },
    { x: 232, y: 104, r: 8, c: "#3d8a2c" },
    { x: 288, y: 118, r: 20, c: "#4f9e2f" },
    { x: 330, y: 148, r: 34, c: "#2f7424" },
    { x: 140, y: 128, r: -12, c: "#6b1a3c" },
    { x: 262, y: 126, r: 14, c: "#6b1a3c" },
  ];
  const tomatoes = [
    [250, 150],
    [272, 160],
    [120, 166],
  ];
  const paneer = [
    [178, 148],
    [198, 160],
    [160, 166],
  ];
  const chickpeas = [
    [222, 170],
    [234, 178],
    [212, 182],
    [246, 168],
    [300, 170],
  ];
  return (
    <div className="absolute inset-x-0 bottom-[6svh] flex justify-center md:inset-y-0 md:right-[4%] md:left-auto md:w-[55%] md:items-center">
      <svg viewBox="0 0 400 320" className="w-[88vw] max-w-[560px] drop-shadow-2xl" aria-hidden>
        <defs>
          <linearGradient id="bp-glaze" x1="0" x2="1">
            <stop offset="0" stopColor="#c2410c" />
            <stop offset="0.45" stopColor="#ff9a24" />
            <stop offset="1" stopColor="#d4560a" />
          </linearGradient>
          <radialGradient id="bp-greens" cx="0.45" cy="0.4" r="0.7">
            <stop offset="0" stopColor="#79a944" />
            <stop offset="1" stopColor="#2f6e22" />
          </radialGradient>
          <radialGradient id="bp-shadow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#0f3d22" stopOpacity="0.35" />
            <stop offset="1" stopColor="#0f3d22" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="200" cy="296" rx="150" ry="18" fill="url(#bp-shadow)" />
        {leaves.map((l, i) => (
          <ellipse key={i} cx={l.x} cy={l.y} rx="34" ry="64" fill={l.c} transform={`rotate(${l.r} ${l.x} ${l.y})`} />
        ))}
        <path d="M40 160 C 50 255, 120 292, 200 292 C 280 292, 350 255, 360 160 Z" fill="url(#bp-glaze)" />
        <ellipse cx="200" cy="160" rx="160" ry="40" fill="#fff6e8" />
        <ellipse cx="200" cy="162" rx="148" ry="33" fill="url(#bp-greens)" />
        {paneer.map(([x, y], i) => (
          <rect key={i} x={x - 9} y={y - 9} width="18" height="18" rx="4" fill={i === 1 ? "#e9a352" : "#fbf1dc"} />
        ))}
        {chickpeas.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="5.5" fill="#d9b274" />
        ))}
        {tomatoes.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="10" fill="#d8231b" />
        ))}
        <ellipse cx="95" cy="176" rx="14" ry="6" fill="#d9ecb0" stroke="#1f5d24" strokeWidth="2.5" />
        <ellipse cx="315" cy="178" rx="14" ry="6" fill="#d9ecb0" stroke="#1f5d24" strokeWidth="2.5" />
      </svg>
    </div>
  );
}

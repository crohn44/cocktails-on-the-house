import { useId } from "react";

// Illustrated glass for each drink. If a drink has an `image`, that photo is used instead.
// All shapes are drawn in a 120 × 160 box.
const GLASSES = {
  rocks: {
    body: "M26 58 L94 58 L90 140 Q90 144 86 144 L34 144 Q30 144 30 140 Z",
    top: 82, rim: [92, 58], ice: "big",
  },
  highball: {
    body: "M36 24 L84 24 L81 144 Q81 147 78 147 L42 147 Q39 147 39 144 Z",
    top: 40, rim: [83, 24], ice: "stack",
  },
  collins: {
    body: "M40 12 L80 12 L78 146 Q78 148 76 148 L44 148 Q42 148 42 146 Z",
    top: 28, rim: [79, 12], ice: "stack",
  },
  coupe: {
    body: "M16 52 L104 52 Q102 96 60 98 Q18 96 16 52 Z",
    stem: "M60 98 L60 141 M40 145 Q60 137 80 145",
    top: 58, rim: [100, 52],
  },
  martini: {
    body: "M14 38 L106 38 L60 92 Z",
    stem: "M60 92 L60 141 M38 145 Q60 137 82 145",
    top: 46, rim: [100, 38],
  },
  flute: {
    body: "M46 14 L74 14 Q76 80 62 96 L58 96 Q44 80 46 14 Z",
    stem: "M60 96 L60 141 M44 145 Q60 139 76 145",
    top: 32, rim: [73, 14],
  },
  wine: {
    body: "M30 26 L90 26 Q96 92 60 98 Q24 92 30 26 Z",
    stem: "M60 98 L60 141 M40 145 Q60 137 80 145",
    top: 50, rim: [89, 26], ice: "small",
  },
  mug: {
    body: "M28 52 L88 52 L86 140 Q86 144 82 144 L34 144 Q30 144 30 140 Z",
    handle: "M87 68 Q108 70 106 96 Q104 120 86 122",
    top: 52, rim: [86, 52], copper: true,
  },
  tiki: {
    body: "M34 18 L86 18 Q92 58 76 82 Q70 96 78 112 Q86 130 80 142 L40 142 Q34 130 42 112 Q50 96 44 82 Q28 58 34 18 Z",
    top: 34, rim: [85, 18], ice: "crushed",
  },
};

function garnishFor(text = "") {
  const t = text.toLowerCase();
  if (t.includes("coffee")) return "coffee";
  if (t.includes("celery")) return "celery";
  if (t.includes("olive") && !t.includes("lemon")) return "olive";
  if (t.includes("mint")) return t.includes("lime") ? "mint-lime" : "mint";
  if (t.includes("paper plane")) return "plane";
  if (t.includes("pineapple")) return "pineapple";
  if (t.includes("grapefruit")) return "grapefruit";
  if (t.includes("lime")) return "lime";
  if (t.includes("lemon")) return "lemon";
  if (t.includes("orange")) return "orange";
  if (t.includes("cherry")) return "cherry";
  if (t.includes("ginger")) return "ginger";
  return null;
}

function Wheel({ x, y, color, rind }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="12" fill={rind} />
      <circle r="10" fill={color} />
      {[0, 45, 90, 135].map((a) => (
        <line key={a} x1="-9" y1="0" x2="9" y2="0" stroke={rind} strokeWidth="1" opacity="0.55" transform={`rotate(${a})`} />
      ))}
      <circle r="2" fill={rind} opacity="0.6" />
    </g>
  );
}

function Garnish({ kind, glass }) {
  const [x, y] = glass.rim;
  switch (kind) {
    case "lime":
      return <Wheel x={x} y={y} color="#c6e377" rind="#5f9e2f" />;
    case "lemon":
      return <Wheel x={x} y={y} color="#fff2a1" rind="#e8c51e" />;
    case "orange":
      return <Wheel x={x} y={y} color="#ffbe6b" rind="#e8781e" />;
    case "grapefruit":
      return <Wheel x={x} y={y} color="#ff9e8f" rind="#e8a33d" />;
    case "cherry":
      return (
        <g>
          <path d={`M${x - 4} ${y - 2} Q${x} ${y - 22} ${x + 10} ${y - 26}`} stroke="#5a3a1a" strokeWidth="1.6" fill="none" />
          <circle cx={x - 4} cy={y + 2} r="7" fill="#b3122e" />
          <circle cx={x - 6} cy={y} r="2" fill="#fff" opacity="0.5" />
        </g>
      );
    case "mint":
    case "mint-lime":
      return (
        <g>
          {kind === "mint-lime" && <Wheel x={x} y={y + 2} color="#c6e377" rind="#5f9e2f" />}
          <g transform={`translate(${x - 26} ${y - 4})`}>
            <path d="M0 0 Q-8 -14 2 -24 Q10 -12 0 0 Z" fill="#4caf50" />
            <path d="M4 0 Q14 -10 24 -6 Q16 4 4 0 Z" fill="#66bb6a" />
            <path d="M0 0 Q-14 -6 -18 -16 Q-4 -16 0 0 Z" fill="#388e3c" />
          </g>
        </g>
      );
    case "coffee":
      return (
        <g>
          {[-12, 0, 12].map((dx) => (
            <g key={dx} transform={`translate(${60 + dx} ${glass.top + 1})`}>
              <ellipse rx="4" ry="2.6" fill="#2b1810" />
              <line x1="-3" y1="0" x2="3" y2="0" stroke="#6d4c41" strokeWidth="0.8" />
            </g>
          ))}
        </g>
      );
    case "olive":
      return (
        <g>
          <line x1={x - 30} y1={y + 30} x2={x + 6} y2={y - 14} stroke="#d9b45a" strokeWidth="1.6" />
          <ellipse cx={x - 18} cy={y + 15} rx="6" ry="5" fill="#7a8b2e" />
          <circle cx={x - 17} cy={y + 15} r="1.8" fill="#c0392b" />
        </g>
      );
    case "celery":
      return (
        <g>
          <path d={`M${x - 14} ${y + 30} L${x + 2} ${y - 30}`} stroke="#8bc34a" strokeWidth="7" strokeLinecap="round" />
          <path d={`M${x + 2} ${y - 30} q-8 -8 -2 -14 M${x + 2} ${y - 30} q8 -6 10 -14`} stroke="#66bb6a" strokeWidth="3" fill="none" strokeLinecap="round" />
          <Wheel x={x - 4} y={y + 4} color="#fff2a1" rind="#e8c51e" />
        </g>
      );
    case "pineapple":
      return (
        <g>
          <path d={`M${x - 10} ${y + 6} L${x + 12} ${y + 6} L${x + 4} ${y - 12} Z`} fill="#ffd54f" stroke="#e0a800" />
          <path d={`M${x + 4} ${y - 12} l-6 -12 M${x + 4} ${y - 12} l2 -14 M${x + 4} ${y - 12} l9 -10`} stroke="#4caf50" strokeWidth="3" strokeLinecap="round" />
          <circle cx={x - 12} cy={y + 2} r="6" fill="#b3122e" />
        </g>
      );
    case "plane":
      return (
        <path
          d={`M${x - 18} ${y - 4} L${x + 16} ${y - 22} L${x - 2} ${y + 2} Z M${x - 2} ${y + 2} L${x + 16} ${y - 22} L${x + 2} ${y + 8} Z`}
          fill="#f5f0e6"
          stroke="#c8bfae"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      );
    case "ginger":
      return <rect x={x - 6} y={y - 8} width="12" height="12" rx="3" fill="#e8c67a" stroke="#c49a3a" transform={`rotate(20 ${x} ${y})`} />;
    default:
      return null;
  }
}

function Ice({ kind, top }) {
  const cube = (x, y, s, r = 0) => (
    <rect key={`${x}${y}`} x={x} y={y} width={s} height={s} rx="4" fill="#fff" opacity="0.28" stroke="#fff" strokeOpacity="0.5" transform={`rotate(${r} ${x + s / 2} ${y + s / 2})`} />
  );
  if (kind === "big") return cube(40, top - 6, 40, 4);
  if (kind === "stack") return <>{[cube(44, top - 4, 22, 8), cube(52, top + 26, 22, -10), cube(44, top + 56, 22, 6)]}</>;
  if (kind === "small") return <>{[cube(40, top + 2, 16, 10), cube(62, top + 8, 16, -12)]}</>;
  if (kind === "crushed")
    return (
      <>
        {Array.from({ length: 18 }, (_, i) => (
          <rect key={i} x={40 + ((i * 17) % 40)} y={top + 2 + ((i * 11) % 50)} width="8" height="7" rx="2" fill="#fff" opacity="0.25" transform={`rotate(${i * 23} ${44 + ((i * 17) % 40)} ${top + 6 + ((i * 11) % 50)})`} />
        ))}
      </>
    );
  return null;
}

export default function CocktailArt({ cocktail, size = "md", className = "" }) {
  const uid = useId().replace(/:/g, "");
  if (cocktail.image) {
    return (
      <div className={`art art-${size} ${className}`}>
        <img src={cocktail.image} alt={cocktail.name} loading="lazy" />
      </div>
    );
  }
  const glass = GLASSES[cocktail.glass] || GLASSES.rocks;
  const kind = garnishFor(cocktail.garnish ?? cocktail.tagline);
  const color = cocktail.color || "#d9b45a";

  return (
    <div className={`art art-${size} ${className}`} style={{ "--drink": color }}>
      <svg viewBox="0 0 120 160" role="img" aria-label={`${cocktail.name} illustration`}>
        <defs>
          <clipPath id={`clip-${uid}`}>
            <path d={glass.body} />
          </clipPath>
          <linearGradient id={`liq-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.95" />
            <stop offset="1" stopColor={color} stopOpacity="0.75" />
          </linearGradient>
          <linearGradient id={`copper-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8a4b25" />
            <stop offset="0.35" stopColor="#e3965f" />
            <stop offset="0.6" stopColor="#b8683a" />
            <stop offset="1" stopColor="#7a3f1d" />
          </linearGradient>
        </defs>

        <ellipse cx="60" cy="150" rx="40" ry="5" fill="#000" opacity="0.35" />

        {glass.handle && (
          <path d={glass.handle} stroke={`url(#copper-${uid})`} strokeWidth="7" fill="none" strokeLinecap="round" />
        )}

        <g clipPath={`url(#clip-${uid})`}>
          <rect x="0" y="0" width="120" height="160" fill="#fff" opacity="0.05" />
          {glass.copper ? (
            <>
              <rect x="0" y="0" width="120" height="160" fill={`url(#copper-${uid})`} />
              <rect x="0" y={glass.top} width="120" height="5" fill={color} />
            </>
          ) : (
            <>
              <rect x="0" y={glass.top} width="120" height="160" fill={`url(#liq-${uid})`} />
              <rect x="0" y={glass.top} width="120" height="2.5" fill="#fff" opacity="0.35" />
              <Ice kind={glass.ice} top={glass.top} />
            </>
          )}
          <rect x="34" y="0" width="5" height="160" fill="#fff" opacity="0.14" transform="skewX(-6)" />
        </g>

        <path d={glass.body} fill="none" stroke="#fff" strokeOpacity={glass.copper ? 0.25 : 0.6} strokeWidth="2" strokeLinejoin="round" />
        {glass.stem && <path d={glass.stem} fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="2.5" strokeLinecap="round" />}

        <Garnish kind={kind} glass={glass} />
      </svg>
    </div>
  );
}

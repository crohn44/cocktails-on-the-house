// A small map of where a drink comes from. The world outline is baked into data/worldMap.js
// (x = longitude * K, y = -latitude), and the view zooms to fit the drink's places.
import { K, borders, land } from "../data/worldMap.js";

const ASPECT = 4 / 3;
const PAD = 7; // map units of breathing room around the places
const MIN_WIDTH = 30;

function frame(points) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  let w = Math.max(maxX - minX + PAD * 2, MIN_WIDTH);
  let h = Math.max(maxY - minY + PAD * 2, MIN_WIDTH / ASPECT);
  if (w / h > ASPECT) h = w / ASPECT;
  else w = h * ASPECT;
  return { x: (minX + maxX) / 2 - w / 2, y: (minY + maxY) / 2 - h / 2, w, h };
}

/** Puts each label beside its pin, flipping left near the right edge and nudging down to avoid overlaps. */
function layoutLabels(points, view, fontSize, gap) {
  const placed = [];
  const order = [...points].sort((a, b) => a.y - b.y);
  for (const p of order) {
    const width = p.name.length * fontSize * 0.56;
    const left = p.x + gap + width > view.x + view.w - gap;
    const box = { x0: left ? p.x - gap - width : p.x + gap, x1: left ? p.x - gap : p.x + gap + width, y: p.y };
    for (let moved = true; moved; ) {
      moved = false;
      for (const o of placed) {
        if (box.x0 < o.box.x1 && o.box.x0 < box.x1 && Math.abs(box.y - o.box.y) < fontSize * 1.05) {
          box.y = o.box.y + fontSize * 1.1;
          moved = true;
        }
      }
    }
    placed.push({ p, box, left });
  }
  return placed;
}

export default function OriginMap({ places }) {
  if (!places?.length) return null;
  const points = places.map((p) => ({ ...p, x: p.lng * K, y: -p.lat }));
  const origin = points.find((p) => p.origin) ?? points[0];
  const view = frame(points);
  const u = view.w / 100; // one percent of the map's width
  const fontSize = 3.6 * u;
  const labels = layoutLabels(points, view, fontSize, 2.6 * u);

  return (
    <svg
      className="origin-map"
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      role="img"
      aria-label={`Map showing ${places.map((p) => p.name).join(", ")}`}
    >
      <rect x={view.x} y={view.y} width={view.w} height={view.h} className="map-sea" />
      <path d={land} className="map-land" />
      <path d={borders} className="map-borders" />
      {points
        .filter((p) => p !== origin)
        .map((p) => {
          // A gentle arc from the origin to each other place in the story.
          const mx = (origin.x + p.x) / 2, my = (origin.y + p.y) / 2;
          const dx = p.x - origin.x, dy = p.y - origin.y;
          return (
            <path
              key={`arc-${p.name}`}
              d={`M${origin.x} ${origin.y}Q${mx - dy * 0.2} ${my + dx * 0.2 - Math.hypot(dx, dy) * 0.05} ${p.x} ${p.y}`}
              className="map-arc"
            />
          );
        })}
      {points.map((p) => (
        <circle
          key={`pin-${p.name}`}
          cx={p.x}
          cy={p.y}
          r={(p === origin ? 1.5 : 1.1) * u}
          className={p === origin ? "map-pin origin" : "map-pin"}
        />
      ))}
      {labels.map(({ p, box, left }) => (
        <text
          key={`label-${p.name}`}
          x={left ? box.x1 : box.x0}
          y={box.y}
          fontSize={fontSize}
          dominantBaseline="middle"
          textAnchor={left ? "end" : "start"}
          className={p === origin ? "map-label origin" : "map-label"}
        >
          {p.name}
        </text>
      ))}
    </svg>
  );
}

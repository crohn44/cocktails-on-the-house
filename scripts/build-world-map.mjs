// Bakes a simplified land + border outline from world-atlas (Natural Earth 1:50m) into a JS module.
// Usage: download https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json, then
//   node scripts/build-world-map.mjs countries-50m.json client/src/data/worldMap.js
// Widen BOX below to cover pins outside it (currently all but New Zealand, the far Pacific and the poles).
import { readFileSync, writeFileSync } from "node:fs";

const [, , src, out] = process.argv;
const topo = JSON.parse(readFileSync(src, "utf8"));
const { scale, translate } = topo.transform;
const K = 0.8; // horizontal squash, ~cos(37°), so mid-latitudes don't look stretched
const BOX = { minLng: -170, maxLng: 160, minLat: -50, maxLat: 72 };
const TOL = 0.18; // drop points closer than this (degrees) to the previous kept point

const arcs = topo.arcs.map((arc) => {
  let x = 0, y = 0;
  return arc.map(([dx, dy]) => {
    x += dx; y += dy;
    return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
  });
});
const arcPts = (i) => (i >= 0 ? arcs[i] : arcs[~i].slice().reverse());
// Unwrap longitudes so rings that cross the antimeridian don't streak across the whole map.
const unwrap = (pts) => {
  const out = [];
  for (const [x, y] of pts) {
    let ux = x;
    if (out.length) {
      const prev = out[out.length - 1][0];
      while (ux - prev > 180) ux -= 360;
      while (ux - prev < -180) ux += 360;
    }
    out.push([ux, y]);
  }
  return out;
};
const ringPts = (ring) => unwrap(ring.flatMap((i, k) => (k ? arcPts(i).slice(1) : arcPts(i))));

const inBox = (pts) => {
  let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
  for (const [x, y] of pts) { a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); d = Math.max(d, y); }
  return { ok: b >= BOX.minLng && a <= BOX.maxLng && d >= BOX.minLat && c <= BOX.maxLat, span: Math.max(b - a, d - c) };
};
const simplify = (pts, closed) => {
  const kept = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = kept[kept.length - 1];
    if (Math.hypot(pts[i][0] - px, pts[i][1] - py) >= TOL) kept.push(pts[i]);
  }
  kept.push(pts[pts.length - 1]);
  return kept;
};
const r = (n) => Math.round(n * 10) / 10;
// Relative path commands in tenths of a unit keep the string small.
const toPath = (pts, close) => {
  const q = pts.map(([x, y]) => [Math.round(x * K * 10), Math.round(-y * 10)]);
  let d = `M${q[0][0] / 10} ${q[0][1] / 10}l`;
  const parts = [];
  for (let i = 1; i < q.length; i++) {
    const dx = q[i][0] - q[i - 1][0], dy = q[i][1] - q[i - 1][1];
    if (dx || dy) parts.push(`${dx / 10} ${dy / 10}`);
  }
  return d + parts.join(" ").replace(/ -/g, "-").replace(/(^|[ -])0\./g, "$1.") + (close ? "z" : "");
};

// Land: every country polygon ring in the box, skipping specks.
const geoms = topo.objects.countries.geometries;
const usage = new Map();
let land = "";
for (const g of geoms) {
  const polys = g.type === "Polygon" ? [g.arcs] : g.type === "MultiPolygon" ? g.arcs : [];
  for (const poly of polys) {
    for (const ring of poly) {
      for (const i of ring) { const k = i >= 0 ? i : ~i; usage.set(k, (usage.get(k) || 0) + 1); }
      const pts = ringPts(ring);
      const { ok, span } = inBox(pts);
      if (!ok || span < 0.5) continue;
      const s = simplify(pts, true);
      if (s.length >= 4) land += toPath(s, true);
    }
  }
}

// Borders: arcs shared by two countries.
let borders = "";
for (const [k, n] of usage) {
  if (n < 2) continue;
  const pts = unwrap(arcs[k]);
  if (!inBox(pts).ok) continue;
  const s = simplify(pts, false);
  if (s.length >= 2) borders += toPath(s, false);
}

writeFileSync(
  out,
  `// Generated outline of the land and country borders, from Natural Earth (public domain) via the
// world-atlas package (ISC), simplified and cropped to longitudes -170 to 160 and latitudes -50 to 72.
// Coordinates: x = longitude * K, y = -latitude.
export const K = ${K};
export const land = ${JSON.stringify(land)};
export const borders = ${JSON.stringify(borders)};
`
);
console.log(`land ${(land.length / 1024).toFixed(0)} KB, borders ${(borders.length / 1024).toFixed(0)} KB`);

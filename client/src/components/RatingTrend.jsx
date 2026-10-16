// Line chart of a drink's average rating at the end of each month, from its first rating to today.
// Hovering (or arrowing through with the keyboard) shows how that month compares with today.
import { useEffect, useRef, useState } from "react";

const HEIGHT = 264; // matches the ratings list beside it
const M = { top: 16, right: 16, bottom: 28, left: 40 };

const parseDate = (sqlDate) => new Date(sqlDate.replace(" ", "T") + "Z");
const monthLabel = (d, opts = { month: "short" }) => d.toLocaleDateString(undefined, { ...opts, timeZone: "UTC" });

/** Running average as of the end of each month. The last point is the current month, so it equals today's average. */
export function monthlyAverages(ratings, now = new Date()) {
  if (!ratings.length) return [];
  const sorted = ratings.map((r) => ({ stars: r.stars, t: parseDate(r.createdAt) })).sort((a, b) => a.t - b.t);
  const first = sorted[0].t;
  const points = [];
  let i = 0, sum = 0;
  for (
    let y = first.getUTCFullYear(), m = first.getUTCMonth();
    y < now.getUTCFullYear() || (y === now.getUTCFullYear() && m <= now.getUTCMonth());
    m === 11 ? (y++, (m = 0)) : m++
  ) {
    const monthEnd = Date.UTC(y, m + 1, 1);
    while (i < sorted.length && sorted[i].t < monthEnd) sum += sorted[i++].stars;
    points.push({ date: new Date(Date.UTC(y, m, 1)), average: sum / i, count: i });
  }
  return points;
}

function useWidth(ref) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

/** e.g. "−0.12 vs. today's 3.58": how this month's average differs from the current one. */
function compareToToday(then, today) {
  const diff = Math.round((then - today) * 100) / 100;
  const sign = diff > 0 ? "+" : diff < 0 ? "−" : "±";
  return `${sign}${Math.abs(diff).toFixed(2)} vs. today's ${today.toFixed(2)}`;
}

export default function RatingTrend({ ratings }) {
  const wrap = useRef(null);
  const width = useWidth(wrap);
  const [active, setActive] = useState(null);
  const points = monthlyAverages(ratings);

  if (points.length < 2) {
    return (
      <div ref={wrap} className="trend-empty muted small">
        Check back next month: the trend needs at least two months of ratings.
      </div>
    );
  }

  const today = points[points.length - 1].average;
  const lo = Math.max(1, Math.floor((Math.min(...points.map((p) => p.average)) - 0.1) * 4) / 4);
  const hi = Math.min(5, Math.ceil((Math.max(...points.map((p) => p.average)) + 0.1) * 4) / 4);
  const step = hi - lo > 1.5 ? 0.5 : 0.25;
  const ticks = [];
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(v);

  const plotW = Math.max(0, width - M.left - M.right);
  const plotH = HEIGHT - M.top - M.bottom;
  const x = (i) => M.left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v) => M.top + (1 - (v - lo) / (hi - lo)) * plotH;
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i)} ${y(p.average)}`).join("");
  // Label every month when there's room, otherwise every other / every third.
  const every = Math.max(1, Math.ceil((points.length * 44) / Math.max(plotW, 1)));

  const pick = (clientX) => {
    const rect = wrap.current.getBoundingClientRect();
    const rel = (clientX - rect.left - M.left) / plotW;
    setActive(Math.max(0, Math.min(points.length - 1, Math.round(rel * (points.length - 1)))));
  };

  const a = active != null ? points[active] : null;

  return (
    <div ref={wrap} className="trend">
      {width > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          tabIndex={0}
          role="img"
          aria-label={`Average rating by month, from ${points[0].average.toFixed(2)} in ${monthLabel(points[0].date, {
            month: "long",
            year: "numeric",
          })} to ${today.toFixed(2)} today. Use the arrow keys to step through months.`}
          onPointerMove={(e) => pick(e.clientX)}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive(points.length - 1)}
          onBlur={() => setActive(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setActive((i) => Math.max(0, (i ?? points.length - 1) - 1));
            if (e.key === "ArrowRight") setActive((i) => Math.min(points.length - 1, (i ?? 0) + 1));
          }}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={M.left + plotW} y1={y(t)} y2={y(t)} className="trend-grid" />
              <text x={M.left - 8} y={y(t)} className="trend-axis" textAnchor="end" dominantBaseline="middle">
                {t.toFixed(2)}
              </text>
            </g>
          ))}
          {points.map((p, i) =>
            i % every === (points.length - 1) % every ? (
              <text key={i} x={x(i)} y={HEIGHT - 8} className="trend-axis" textAnchor="middle">
                {monthLabel(p.date)}
              </text>
            ) : null
          )}
          {a && <line x1={x(active)} x2={x(active)} y1={M.top} y2={M.top + plotH} className="trend-crosshair" />}
          <path d={line} className="trend-line" />
          {points.map((p, i) => (
            <circle
              key={i}
              cx={x(i)}
              cy={y(p.average)}
              r={i === active ? 5.5 : 4}
              className={i === points.length - 1 ? "trend-dot today" : "trend-dot"}
            />
          ))}
        </svg>
      )}
      {a && (
        <div
          className={`trend-tip ${x(active) > width / 2 ? "left" : ""}`}
          style={{ left: x(active), top: y(a.average) }}
          role="status"
        >
          <strong>{a.average.toFixed(2)}</strong>
          <span className="muted">
            {monthLabel(a.date, { month: "long", year: "numeric" })} · {a.count} rating{a.count === 1 ? "" : "s"}
          </span>
          <span>{active === points.length - 1 ? "Today's average" : compareToToday(a.average, today)}</span>
        </div>
      )}
    </div>
  );
}

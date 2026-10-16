import { useState } from "react";

/** Read-only star display that supports fractional values (e.g. 4.3). */
export function Stars({ value = 0, size = 18, label }) {
  const pct = Math.max(0, Math.min(5, value)) / 5 * 100;
  return (
    <span
      className="stars"
      style={{ "--size": `${size}px` }}
      role="img"
      aria-label={label ?? `${Number(value.toFixed(2))} out of 5 stars`}
    >
      <span className="stars-empty">★★★★★</span>
      <span className="stars-full" style={{ width: `${pct}%` }}>★★★★★</span>
    </span>
  );
}

const LABELS = ["", "Not for me", "It's okay", "Pretty good", "Really good", "Outstanding"];

/** Interactive 1–5 star picker. `compact` drops the text label (for use in lists). */
export function StarInput({ value, onChange, size = 34, compact = false, label = "Your rating", disabled = false }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className={`star-input ${compact ? "compact" : ""}`}>
      <div role="radiogroup" aria-label={label} onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className={n <= shown ? "on" : ""}
            style={{ fontSize: size }}
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(0)}
            disabled={disabled}
            onClick={() => onChange(n)}
          >
            ★
          </button>
        ))}
      </div>
      {!compact && <span className="star-input-label">{LABELS[shown] || "Tap a star to rate"}</span>}
    </div>
  );
}

import { useState } from "react";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { Link } from "../lib/router.jsx";
import { StarInput, Stars } from "./Stars.jsx";

/** A drink's versions, ranked against each other, each with its own quick star rating. */
export default function Variations({ drink, variations, onChanged, onShowRecipe }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const ranked = [...variations].sort((a, b) => a.rank - b.rank);
  const next = encodeURIComponent(`/drinks/${drink.slug}#variations`);

  async function rate(v, stars) {
    setBusy(v.slug);
    setError(null);
    try {
      if (stars) await api.rateVariation(drink.slug, v.slug, stars);
      else await api.unrateVariation(drink.slug, v.slug);
      await onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="card variations" id="variations">
      <h2>Variations</h2>
      <p className="muted variations-intro">
        Rate each version on its own to rank them against each other. These ratings don't change the {drink.name}'s
        overall score.
      </p>
      {error && <p className="alert">{error}</p>}
      <ol className="variation-list">
        {ranked.map((v) => {
          const name = v.classic ? `Classic ${drink.name}` : v.name;
          return (
            <li key={v.slug} className={`variation ${v.rank === 1 && v.ratingCount ? "top" : ""}`}>
              <span className="variation-rank" aria-label={`Rank ${v.rank}`}>
                {v.rank}
              </span>
              <div className="variation-main">
                <span className="variation-name">
                  {name}
                  {v.classic && <span className="tag">Original</span>}
                </span>
                <span className="muted small block">{v.classic ? drink.tagline : v.description}</span>
                <button type="button" className="link-btn small" onClick={() => onShowRecipe(v.slug)}>
                  View recipe
                </button>
              </div>
              <div className="variation-score">
                {v.ratingCount > 0 ? (
                  <>
                    <Stars value={v.averageRating} size={14} />
                    <strong>{v.averageRating.toFixed(2)}</strong>
                    <span className="muted small">({v.ratingCount})</span>
                  </>
                ) : (
                  <span className="muted small">No ratings yet</span>
                )}
              </div>
              <div className="variation-mine">
                {user ? (
                  <>
                    <span className="muted small">{v.myStars ? "Yours" : "Rate it"}</span>
                    <StarInput
                      compact
                      size={20}
                      value={v.myStars ?? 0}
                      label={`Your rating for the ${name}`}
                      disabled={busy === v.slug}
                      onChange={(n) => rate(v, n)}
                    />
                    {v.myStars && (
                      <button type="button" className="link-btn small" disabled={busy === v.slug} onClick={() => rate(v, null)}>
                        Clear
                      </button>
                    )}
                  </>
                ) : (
                  <Link to={`/login?next=${next}`} className="small">
                    Sign in to rate
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

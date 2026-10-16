import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { Link } from "../lib/router.jsx";
import CocktailArt from "../components/CocktailArt.jsx";
import { Stars } from "../components/Stars.jsx";
import RatingForm from "../components/RatingForm.jsx";
import RatingTrend from "../components/RatingTrend.jsx";
import Variations from "../components/Variations.jsx";
import NotFound from "./NotFound.jsx";

// The map carries the world outline, so it loads separately from the rest of the page.
const OriginMap = lazy(() => import("../components/OriginMap.jsx"));

const GLASS_NAMES = {
  rocks: "Rocks glass",
  highball: "Highball glass",
  collins: "Collins glass",
  coupe: "Coupe",
  martini: "Martini glass",
  flute: "Champagne flute",
  wine: "Wine glass",
  mug: "Copper mug",
  tiki: "Hurricane / tiki glass",
};

function formatDate(sqlDate) {
  const d = new Date(sqlDate.replace(" ", "T") + "Z");
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function Drink({ slug }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  // Links like /drinks/margarita?recipe=spicy open the recipe card on that variation.
  const [recipeSlug, setRecipeSlug] = useState(() => new URLSearchParams(window.location.search).get("recipe") ?? "classic");

  const load = useCallback(() => {
    return api
      .cocktail(slug)
      .then((d) => {
        setData(d);
        setError(null);
        document.title = `${d.cocktail.name} · Cocktails on the House`;
      })
      .catch((e) => setError(e));
  }, [slug]);

  // Reload when the drink or the signed-in user changes (so "your rating" is correct).
  useEffect(() => {
    load();
  }, [load, user?.id]);

  // Honor links like /drinks/negroni#rate once the content has rendered.
  const loaded = Boolean(data);
  useEffect(() => {
    if (loaded && window.location.hash) {
      document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ behavior: "smooth" });
    }
  }, [loaded]);

  if (error?.status === 404) return <NotFound />;
  if (error) return <div className="container"><p className="alert">{error.message}</p></div>;
  if (!data) return <div className="container"><div className="drink-skeleton" /></div>;

  const { cocktail: c, stats, reviews, myRating, variations } = data;
  // The recipe card shows the classic unless a variation is picked.
  const recipe = variations.find((v) => v.slug === recipeSlug) ?? { ...c, classic: true };
  const showRecipe = (slug) => {
    setRecipeSlug(slug);
    document.getElementById("recipe")?.scrollIntoView({ behavior: "smooth" });
  };
  const written = reviews.filter((r) => r.review);
  // Newest first; the API lists written reviews ahead of star-only ones.
  const allRatings = [...reviews].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const maxCount = Math.max(1, ...stats.distribution.map((d) => d.count));

  return (
    <article className="drink">
      <section className="drink-hero" style={{ "--drink": c.color }}>
        <div className="container drink-hero-inner">
          <CocktailArt cocktail={c} size="lg" />
          <div className="drink-intro">
            <Link to="/rankings" className="back">
              ← All cocktails
            </Link>
            <p className="eyebrow">
              Ranked #{stats.rank} of {stats.totalCocktails}
            </p>
            <h1>{c.name}</h1>
            <p className="lede">{c.tagline}</p>
            <div className="drink-score">
              {stats.ratingCount > 0 ? (
                <>
                  <span className="big-avg">{stats.averageRating.toFixed(2)}</span>
                  <span>
                    <Stars value={stats.averageRating} size={22} />
                    <span className="muted block">
                      {stats.ratingCount} rating{stats.ratingCount === 1 ? "" : "s"} · {written.length} review
                      {written.length === 1 ? "" : "s"}
                    </span>
                  </span>
                </>
              ) : (
                <span className="muted">No ratings yet. Yours could be the first.</span>
              )}
            </div>
            <div className="tags">
              <span className="tag">{c.spirit}</span>
              <span className="tag">{GLASS_NAMES[c.glass] ?? c.glass}</span>
              {c.regions.map((r) => (
                <Link key={r} to={`/rankings?region=${encodeURIComponent(r)}`} className="tag tag-region" title={`More from ${r}`}>
                  {r}
                </Link>
              ))}
            </div>
            <a href="#rate" className="btn btn-primary">
              {myRating ? "Update your rating" : "Rate this drink"}
            </a>
          </div>
        </div>
      </section>

      <div className="container drink-body">
        <section className="card history">
          <div className="history-text">
            <h2>A little history</h2>
            <p>{c.history}</p>
          </div>
          {c.places.length > 0 && (
            <figure className="origin">
              <Suspense fallback={<div className="origin-map" />}>
                <OriginMap places={c.places} />
              </Suspense>
              <figcaption>
                <ul className="places">
                  {c.places.map((p) => (
                    <li key={p.name} className={p.origin ? "origin" : ""}>
                      <span className="place-dot" aria-hidden="true" />
                      <span>
                        <strong>{p.name}</strong>
                        {p.origin && <span className="place-role">Origin</span>}
                        <span className="muted block small">{p.note}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </figcaption>
            </figure>
          )}
        </section>

        <section className="card recipe" id="recipe">
          <div className="recipe-head">
            <h2>The recipe</h2>
            {variations.length > 0 && (
              <label className="sort recipe-picker">
                <span>Version</span>
                <select className="input" value={recipeSlug} onChange={(e) => setRecipeSlug(e.target.value)}>
                  {variations.map((v) => (
                    <option key={v.slug} value={v.slug}>
                      {v.classic ? `Classic ${c.name}` : v.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {!recipe.classic && recipe.description && <p className="recipe-desc muted">{recipe.description}</p>}
          <div className="recipe-grid">
            <div>
              <h3>Ingredients</h3>
              <ul className="ingredients">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i}>
                    <span className="amt">{ing.amount}</span>
                    <span>{ing.item}</span>
                  </li>
                ))}
              </ul>
              <dl className="specs">
                <dt>Glass</dt>
                <dd>{GLASS_NAMES[recipe.glass] ?? recipe.glass}</dd>
                {recipe.garnish && (
                  <>
                    <dt>Garnish</dt>
                    <dd>{recipe.garnish}</dd>
                  </>
                )}
              </dl>
            </div>
            <div>
              <h3>Method</h3>
              <ol className="steps">
                {recipe.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {variations.length > 0 && (
          <Variations drink={c} variations={variations} onChanged={load} onShowRecipe={showRecipe} />
        )}

        <section className="card ratings" id="rate">
          <h2>Ratings &amp; reviews</h2>
          <div className="ratings-grid">
            <div className="breakdown">
              <div className="breakdown-summary">
                <span className="big-avg">{stats.ratingCount ? stats.averageRating.toFixed(2) : "–"}</span>
                <Stars value={stats.averageRating} size={18} />
                <span className="muted small">
                  {stats.ratingCount} rating{stats.ratingCount === 1 ? "" : "s"}
                </span>
              </div>
              {stats.distribution.map((d) => (
                <div className="bar-row" key={d.stars}>
                  <span className="bar-label">{d.stars}★</span>
                  <span className="bar">
                    <span style={{ width: `${(d.count / maxCount) * 100}%` }} />
                  </span>
                  <span className="bar-count">{d.count}</span>
                </div>
              ))}
            </div>

            <div className="your-rating">
              {user ? (
                <RatingForm slug={c.slug} existing={myRating} onSaved={load} />
              ) : (
                <div className="signin-prompt">
                  <h3>What do you think?</h3>
                  <p className="muted">Sign in to rate the {c.name} and add a review.</p>
                  <div className="row">
                    <Link className="btn btn-primary" to={`/login?next=${encodeURIComponent(`/drinks/${c.slug}#rate`)}`}>
                      Sign in
                    </Link>
                    <Link className="btn btn-ghost" to={`/register?next=${encodeURIComponent(`/drinks/${c.slug}#rate`)}`}>
                      Create account
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          <h3 className="reviews-heading">
            {written.length ? `What people are saying (${written.length})` : "No written reviews yet"}
          </h3>
          <ul className="reviews">
            {written.map((r) => (
              <li key={r.id} className={`review ${user && r.userId === user.id ? "mine" : ""}`}>
                <div className="review-head">
                  <span className="avatar" aria-hidden="true">
                    {r.displayName.slice(0, 1).toUpperCase()}
                  </span>
                  <span>
                    <strong>{r.displayName}</strong>
                    {user && r.userId === user.id && <span className="you">You</span>}
                    <span className="muted small block">{formatDate(r.updatedAt)}</span>
                  </span>
                  <Stars value={r.stars} size={16} />
                </div>
                <p>{r.review}</p>
              </li>
            ))}
          </ul>
          {reviews.length > 0 && (
            <div className="rating-history">
              <div>
                <h3 className="reviews-heading">All ratings ({allRatings.length})</h3>
                <ul className="rating-list">
                  {allRatings.map((r) => (
                    <li key={r.id} className={user && r.userId === user.id ? "mine" : ""}>
                      <span className="rating-list-name">
                        {r.displayName}
                        {user && r.userId === user.id && <span className="you">You</span>}
                      </span>
                      <Stars value={r.stars} size={13} />
                      <span className="muted small">{formatDate(r.updatedAt)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="reviews-heading">Average rating over time</h3>
                <RatingTrend ratings={reviews} />
              </div>
            </div>
          )}
        </section>
      </div>
    </article>
  );
}

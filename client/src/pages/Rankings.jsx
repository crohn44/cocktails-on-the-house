import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { Link, useLocation, useNavigate } from "../lib/router.jsx";
import CocktailArt from "../components/CocktailArt.jsx";
import { Stars } from "../components/Stars.jsx";
import IngredientFilter from "../components/IngredientFilter.jsx";

export default function Rankings() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const { search } = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(search);
  // Search (from the header), region and ingredients live in the URL so they can be linked to.
  const q = params.get("q") ?? "";
  const region = params.get("region") ?? "";
  const ingredients = params.getAll("ingredient");
  const ingredientKey = ingredients.join("|"); // stable dependency for the fetch below
  const [spirit, setSpirit] = useState("");
  const [sort, setSort] = useState("rank");

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      api
        .cocktails({ q, spirit, region, ingredient: ingredients, sort: sort === "rank" ? "" : sort })
        .then((d) => !cancelled && (setData(d), setError(null)))
        .catch((e) => !cancelled && setError(e.message));
    }, q ? 200 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, spirit, region, ingredientKey, sort]); // ingredientKey stands in for the `ingredients` array

  const updateParams = (edit) => {
    const next = new URLSearchParams(search);
    edit(next);
    const qs = next.toString();
    navigate(`/rankings${qs ? `?${qs}` : ""}`, { replace: true, scroll: false });
  };
  const setRegion = (value) => updateParams((p) => (value ? p.set("region", value) : p.delete("region")));
  const setIngredients = (list) =>
    updateParams((p) => {
      p.delete("ingredient");
      list.forEach((i) => p.append("ingredient", i));
    });

  useEffect(() => {
    document.title = "Rankings · Cocktails on the House";
  }, []);

  return (
    <>
      <div className="container">
        <h1 className="page-title">The rankings</h1>
        <div className="toolbar">
          <div className="selects">
            <label className="sort">
              <span>Spirit</span>
              <select className="input" value={spirit} onChange={(e) => setSpirit(e.target.value)}>
                <option value="">All spirits</option>
                {data?.spirits.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <IngredientFilter options={data?.ingredients} selected={ingredients} onChange={setIngredients} />
            <label className="sort">
              <span>Region</span>
              <select className="input" value={region} onChange={(e) => setRegion(e.target.value)}>
                <option value="">All regions</option>
                {data?.regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="sort">
              <span>Sort</span>
              <select className="input" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="rank">Top rated</option>
                <option value="popular">Most rated</option>
                <option value="name">A–Z</option>
              </select>
            </label>
          </div>
        </div>

        {ingredients.length > 0 && (
          <div className="active-filters" aria-label="Ingredient filters">
            <span className="muted small">With</span>
            {ingredients.map((i) => (
              <button
                key={i}
                type="button"
                className="chip on"
                onClick={() => setIngredients(ingredients.filter((x) => x !== i))}
                aria-label={`Remove ${i}`}
              >
                {i} <span aria-hidden="true">×</span>
              </button>
            ))}
            <button type="button" className="link-btn small" onClick={() => setIngredients([])}>
              Clear
            </button>
          </div>
        )}

        {error && <p className="alert">Couldn't load cocktails: {error}. Is the API server running?</p>}
        {!data && !error && <ListSkeleton />}
        {data && data.cocktails.length === 0 && <p className="empty">No cocktails match those filters.</p>}

        <ol className="ranking">
          {data?.cocktails.map((c) => {
            // When filtering by region, show that region first so the visible tag explains the match.
            const regions =
              region && c.regions.includes(region) ? [region, ...c.regions.filter((r) => r !== region)] : c.regions;
            return (
              <li key={c.slug} className={`rank-row ${c.rank <= 3 ? `top top-${c.rank}` : ""}`}>
                <Link to={`/drinks/${c.slug}`} className="rank-link">
                  <span className="rank-num" aria-label={`Rank ${c.rank}`}>
                    {c.rank}
                  </span>
                  <CocktailArt cocktail={c} size="sm" />
                  <span className="rank-main">
                    <span className="rank-name">{c.name}</span>
                    <span className="rank-tagline">{c.tagline}</span>
                  </span>
                  <span className="rank-meta">
                    {/* One line of tags so every row is the same height; extra regions fold into "+N". */}
                    <span className="rank-tags">
                      <span className="tag">{c.spirit}</span>
                      {regions.length > 0 && <span className="tag tag-region">{regions[0]}</span>}
                      {regions.length > 1 && (
                        <span
                          className="tag tag-region"
                          title={regions.slice(1).join(", ")}
                          aria-label={`Also: ${regions.slice(1).join(", ")}`}
                        >
                          +{regions.length - 1}
                        </span>
                      )}
                    </span>
                    {c.ratingCount > 0 ? (
                      <span className="rank-rating">
                        <Stars value={c.averageRating} size={16} />
                        <span className="rank-avg">{c.averageRating.toFixed(2)}</span>
                        <span className="muted">
                          ({c.ratingCount}
                          <span className="rank-count-label"> rating{c.ratingCount === 1 ? "" : "s"}</span>)
                        </span>
                      </span>
                    ) : (
                      <span className="muted small">Not yet rated, be the first</span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>

        <p className="footnote">
          How the ranking works: drinks are ordered by a weighted average that pulls drinks with only a few ratings
          toward the site-wide average. A single 5-star vote won't beat a hundred 4.8s, but a well-loved newcomer will
          climb fast.
        </p>
      </div>
    </>
  );
}

function ListSkeleton() {
  return (
    <ol className="ranking" aria-busy="true">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="rank-row skeleton" />
      ))}
    </ol>
  );
}

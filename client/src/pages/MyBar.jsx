import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";
import { Link } from "../lib/router.jsx";
import CocktailArt from "../components/CocktailArt.jsx";
import { Stars } from "../components/Stars.jsx";

// The ticked ingredients are kept in this browser so the bar is still there next visit.
const STORAGE_KEY = "coth.bar";
function loadBar() {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []);
  } catch {
    return new Set();
  }
}
function saveBar(bar) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...bar]));
  } catch {
    /* storage unavailable (private mode etc.): the page still works for this visit */
  }
}

/** Requirements a recipe still needs: each is a list of alternatives, any one of which will do. */
const missingFor = (recipe, bar) => recipe.needs.filter((alts) => !alts.some((id) => bar.has(id)));

export default function MyBar() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [bar, setBar] = useState(loadBar);
  const [find, setFind] = useState("");
  // On phones the list collapses; start it closed when there's already a saved bar to show results first.
  const [pickerOpen, setPickerOpen] = useState(() => bar.size === 0);

  useEffect(() => {
    document.title = "What can I make? · Cocktails on the House";
    api
      .pantry()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => saveBar(bar), [bar]);

  const toggle = (id) =>
    setBar((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Drinks you can make (in ranking order, with each makeable version), and the single ingredients
  // that would unlock the most recipes you're one step away from.
  const { drinks, recipeCount, nextBottles } = useMemo(() => {
    if (!data) return { drinks: [], recipeCount: 0, nextBottles: [] };
    const byDrink = new Map();
    const unlocks = new Map();
    let recipeCount = 0;
    for (const r of data.recipes) {
      const missing = missingFor(r, bar);
      if (missing.length === 0) {
        recipeCount++;
        if (!byDrink.has(r.slug)) byDrink.set(r.slug, { ...r, versions: [] });
        byDrink.get(r.slug).versions.push(r.variation); // null is the classic
      } else if (missing.length === 1 && bar.size > 0) {
        for (const id of missing[0]) {
          if (!unlocks.has(id)) unlocks.set(id, new Set());
          unlocks.get(id).add(r.variation?.name ?? r.name);
        }
      }
    }
    const names = Object.fromEntries(data.items.map((i) => [i.id, i.name]));
    const nextBottles = [...unlocks]
      .map(([id, recipes]) => ({ id, name: names[id], recipes: [...recipes] }))
      .sort((a, b) => b.recipes.length - a.recipes.length || a.name.localeCompare(b.name))
      .slice(0, 5);
    return { drinks: [...byDrink.values()], recipeCount, nextBottles };
  }, [data, bar]);

  const term = find.trim().toLowerCase();
  const groups = [];
  for (const item of data?.items ?? []) {
    if (term && !item.name.toLowerCase().includes(term)) continue;
    let g = groups.find((x) => x.name === item.group);
    if (!g) groups.push((g = { name: item.group, items: [] }));
    g.items.push(item);
  }

  return (
    <>
      <div className="container">
        <h1 className="page-title">What can I make?</h1>
      </div>

      <div className="container bar-layout">
        <aside className="card bar-picker" aria-label="Your ingredients">
          <div className="bar-picker-head">
            <h2>
              Your bar <span className="muted">({bar.size})</span>
            </h2>
            <span className="row">
              {bar.size > 0 && (
                <button type="button" className="link-btn small" onClick={() => setBar(new Set())}>
                  Clear all
                </button>
              )}
              <button
                type="button"
                className="link-btn small bar-picker-toggle"
                aria-expanded={pickerOpen}
                onClick={() => setPickerOpen((o) => !o)}
              >
                {pickerOpen ? "Hide list" : "Edit"}
              </button>
            </span>
          </div>
          <div className={`bar-picker-body ${pickerOpen ? "" : "collapsed"}`}>
            <input
              type="search"
              className="input"
              placeholder="Find an ingredient…"
              aria-label="Find an ingredient"
              value={find}
              onChange={(e) => setFind(e.target.value)}
            />
            {!data && !error && <p className="muted small">Loading ingredients…</p>}
            {groups.map((g) => (
              <fieldset key={g.name}>
                <legend>{g.name}</legend>
                {g.items.map((i) => (
                  <label key={i.id} className="ing-option">
                    <input type="checkbox" checked={bar.has(i.id)} onChange={() => toggle(i.id)} />
                    <span>{i.name}</span>
                  </label>
                ))}
              </fieldset>
            ))}
            {data && groups.length === 0 && <p className="muted small">No ingredients match “{find}”.</p>}
            {data && (
              <p className="muted small bar-staples">
                Always assumed: {data.staples.join(", ").toLowerCase()}. Optional ingredients and garnishes are
                skipped.
              </p>
            )}
          </div>
        </aside>

        <div className="bar-results">
          {error && <p className="alert">Couldn't load ingredients: {error}</p>}
          {data && bar.size === 0 && (
            <p className="empty">Tick a few ingredients to see what you can make.</p>
          )}
          {data && bar.size > 0 && (
            <>
              <p className="bar-summary" role="status">
                You can make <strong>{drinks.length}</strong> drink{drinks.length === 1 ? "" : "s"}
                {recipeCount > drinks.length && (
                  <span className="muted"> ({recipeCount} recipes counting variations)</span>
                )}
              </p>

              {nextBottles.length > 0 && (
                <div className="next-bottles">
                  <h3>One ingredient away</h3>
                  <ul>
                    {nextBottles.map((b) => (
                      <li key={b.id}>
                        <button type="button" className="chip" onClick={() => toggle(b.id)} title={`Add ${b.name}`}>
                          + {b.name}
                        </button>
                        <span className="muted small">
                          {b.recipes.slice(0, 3).join(", ")}
                          {b.recipes.length > 3 && ` and ${b.recipes.length - 3} more`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <ol className="ranking">
                {drinks.map((d) => (
                  <li key={d.slug} className="rank-row make-row">
                    <div className="rank-link">
                      <span className="rank-num" aria-label={`Rank ${d.rank}`}>
                        {d.rank}
                      </span>
                      <CocktailArt cocktail={d} size="sm" />
                      <span className="rank-main">
                        <Link to={`/drinks/${d.slug}`} className="rank-name">
                          {d.name}
                        </Link>
                        <span className="bar-versions">
                          {d.versions.map((v) => (
                            <Link
                              key={v?.slug ?? "classic"}
                              to={`/drinks/${d.slug}${v ? `?recipe=${v.slug}` : ""}#recipe`}
                              className="tag tag-region"
                              title={v ? `See the ${v.name} recipe` : "See the classic recipe"}
                            >
                              {v ? v.name : "Classic"}
                            </Link>
                          ))}
                        </span>
                      </span>
                      <span className="rank-meta">
                        {d.ratingCount > 0 && (
                          <span className="rank-rating">
                            <Stars value={d.averageRating} size={16} />
                            <span className="rank-avg">{d.averageRating.toFixed(2)}</span>
                          </span>
                        )}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
              {drinks.length === 0 && (
                <p className="empty">Nothing complete yet. Try one of the ingredients above.</p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

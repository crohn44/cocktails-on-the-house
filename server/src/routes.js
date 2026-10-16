import { db } from "./db.js";
import { REGIONS } from "./data/cocktails.js";
import { INGREDIENTS, ingredientTags } from "./data/ingredients.js";
import { PANTRY, STAPLES, recipeNeeds } from "./data/pantry.js";
import { HttpError, createRouter, readJson, sendJson } from "./http.js";
import {
  createSession,
  currentUser,
  destroySession,
  getSessionToken,
  hashPassword,
  requireUser,
  sessionCookie,
  verifyPassword,
} from "./auth.js";

export const router = createRouter();

// ---------------------------------------------------------------------------
// Ranking
//
// Sorting by plain average would let a drink with a single 5-star rating beat
// one with two hundred 4.8s. Instead we use a Bayesian (weighted) average:
//
//   score = (v / (v + m)) * R + (m / (v + m)) * C
//
//   R = the drink's average rating     v = number of ratings it has
//   C = average rating across the site m = PRIOR_WEIGHT ("phantom" votes)
//
// A drink with few ratings is pulled toward the site-wide average; as it
// collects ratings its own average dominates.
// ---------------------------------------------------------------------------
const PRIOR_WEIGHT = 5;
const DEFAULT_PRIOR = 3.5;

function rankedCocktails() {
  const rows = db
    .prepare(
      `SELECT c.id, c.slug, c.name, c.tagline, c.spirit, c.glass, c.color, c.image, c.garnish, c.regions, c.ingredients,
              COUNT(r.id)                          AS ratingCount,
              COALESCE(AVG(r.stars), 0)            AS averageRating,
              SUM(CASE WHEN r.review IS NOT NULL THEN 1 ELSE 0 END) AS reviewCount
         FROM cocktails c
    LEFT JOIN ratings r ON r.cocktail_id = c.id
     GROUP BY c.id`
    )
    .all();

  const global = db.prepare("SELECT AVG(stars) AS avg FROM ratings").get();
  const C = global.avg ?? DEFAULT_PRIOR;
  const m = PRIOR_WEIGHT;

  for (const row of rows) {
    row.regions = JSON.parse(row.regions);
    row.ingredientTags = ingredientTags(JSON.parse(row.ingredients));
    delete row.ingredients;
    const v = row.ratingCount;
    row.score = v === 0 ? C : (v / (v + m)) * row.averageRating + (m / (v + m)) * C;
    row.averageRating = Math.round(row.averageRating * 100) / 100;
  }

  rows.sort(
    (a, b) =>
      b.score - a.score ||
      b.ratingCount - a.ratingCount ||
      a.name.localeCompare(b.name)
  );
  rows.forEach((row, i) => {
    row.rank = i + 1;
    row.score = Math.round(row.score * 1000) / 1000;
  });
  return rows;
}

// Variations are ranked within their drink the same way, pulled toward the drink's average
// across all its variation ratings, with a smaller prior since there are fewer ratings.
const VARIATION_PRIOR_WEIGHT = 3;

function rankedVariations(cocktail, userId) {
  const rows = db
    .prepare(
      `SELECT v.id, v.slug, v.name, v.description, v.glass, v.garnish, v.ingredients, v.steps, v.position,
              COUNT(r.id) AS ratingCount, COALESCE(AVG(r.stars), 0) AS averageRating,
              MAX(CASE WHEN r.user_id = ? THEN r.stars END) AS myStars
         FROM variations v
    LEFT JOIN variation_ratings r ON r.variation_id = v.id
        WHERE v.cocktail_id = ?
     GROUP BY v.id
     ORDER BY v.position`
    )
    .all(userId ?? -1, cocktail.id);
  if (!rows.length) return [];

  const total = rows.reduce((n, r) => n + r.ratingCount, 0);
  const C = total ? rows.reduce((sum, r) => sum + r.averageRating * r.ratingCount, 0) / total : DEFAULT_PRIOR;
  const m = VARIATION_PRIOR_WEIGHT;
  const list = rows.map((r) => {
    const v = r.ratingCount;
    return {
      slug: r.slug,
      name: r.name,
      description: r.description,
      classic: r.slug === "classic",
      glass: r.glass ?? cocktail.glass,
      garnish: r.garnish ?? cocktail.garnish,
      ingredients: JSON.parse(r.ingredients ?? cocktail.ingredients),
      steps: JSON.parse(r.steps ?? cocktail.steps),
      position: r.position,
      ratingCount: v,
      averageRating: Math.round(r.averageRating * 100) / 100,
      myStars: r.myStars ?? null,
      score: v === 0 ? C : (v / (v + m)) * r.averageRating + (m / (v + m)) * C,
    };
  });
  [...list]
    .sort((a, b) => b.score - a.score || b.ratingCount - a.ratingCount || a.position - b.position)
    .forEach((v, i) => {
      v.rank = i + 1;
      delete v.score;
    });
  return list; // in recipe order (classic first); `rank` gives the ranking
}

function getVariationOr404(cocktail, slug) {
  const row = db.prepare("SELECT * FROM variations WHERE cocktail_id = ? AND slug = ?").get(cocktail.id, slug);
  if (!row) throw new HttpError(404, "Variation not found");
  return row;
}

function getCocktailOr404(slug) {
  const row = db.prepare("SELECT * FROM cocktails WHERE slug = ?").get(slug);
  if (!row) throw new HttpError(404, "Cocktail not found");
  return row;
}

// ---------------------------------------------------------------------------
// Simple in-memory rate limit for sign-in / sign-up attempts
// ---------------------------------------------------------------------------
const attempts = new Map();
function rateLimit(req, key, max = 10, windowMs = 15 * 60 * 1000) {
  const id = `${key}:${req.socket.remoteAddress}`;
  const now = Date.now();
  const entry = attempts.get(id) || { count: 0, reset: now + windowMs };
  if (now > entry.reset) {
    entry.count = 0;
    entry.reset = now + windowMs;
  }
  entry.count += 1;
  attempts.set(id, entry);
  if (entry.count > max) throw new HttpError(429, "Too many attempts. Please try again in a few minutes.");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const publicUser = (u) => ({ id: u.id, email: u.email, displayName: u.displayName ?? u.display_name });

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
router.post("/api/auth/register", async (req, res) => {
  rateLimit(req, "register");
  const body = await readJson(req);
  const email = String(body.email ?? "").trim().toLowerCase();
  const displayName = String(body.displayName ?? "").trim();
  const password = String(body.password ?? "");

  if (!EMAIL_RE.test(email)) throw new HttpError(400, "Please enter a valid email address.");
  if (displayName.length < 2 || displayName.length > 40)
    throw new HttpError(400, "Display name must be 2–40 characters.");
  if (password.length < 8) throw new HttpError(400, "Password must be at least 8 characters.");
  if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email))
    throw new HttpError(409, "An account with that email already exists.");

  const hash = await hashPassword(password);
  const { lastInsertRowid } = db
    .prepare("INSERT INTO users (email, display_name, password_hash) VALUES (?, ?, ?)")
    .run(email, displayName, hash);
  const id = Number(lastInsertRowid);
  const { token, expires } = createSession(id);
  sendJson(res, 201, { user: { id, email, displayName } }, { "Set-Cookie": sessionCookie(token, expires) });
});

router.post("/api/auth/login", async (req, res) => {
  rateLimit(req, "login");
  const body = await readJson(req);
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!row || !(await verifyPassword(password, row.password_hash)))
    throw new HttpError(401, "Incorrect email or password.");
  const { token, expires } = createSession(row.id);
  sendJson(res, 200, { user: publicUser(row) }, { "Set-Cookie": sessionCookie(token, expires) });
});

router.post("/api/auth/logout", async (req, res) => {
  destroySession(getSessionToken(req));
  sendJson(res, 200, { ok: true }, { "Set-Cookie": sessionCookie(null) });
});

router.get("/api/auth/me", async (req, res) => {
  const user = currentUser(req);
  sendJson(res, 200, { user: user ? publicUser(user) : null });
});

// ---------------------------------------------------------------------------
// Cocktails
// ---------------------------------------------------------------------------
router.get("/api/cocktails", async (req, res, { query }) => {
  let list = rankedCocktails();
  const spirits = [...new Set(list.map((c) => c.spirit))].sort();

  const q = (query.get("q") || "").trim().toLowerCase();
  const spirit = query.get("spirit");
  const region = query.get("region");
  if (q) list = list.filter((c) => c.name.toLowerCase().includes(q) || c.tagline.toLowerCase().includes(q));
  if (spirit) list = list.filter((c) => c.spirit === spirit);
  if (region) list = list.filter((c) => c.regions.includes(region));
  // Several ingredients narrow to drinks that contain all of them.
  const ingredients = query.getAll("ingredient");
  for (const ing of ingredients) list = list.filter((c) => c.ingredientTags.includes(ing));

  // How many of the current results contain each ingredient (= the result count if it's added).
  const ingredientOptions = INGREDIENTS.map(({ name, group }) => ({
    name,
    group,
    count: list.filter((c) => c.ingredientTags.includes(name)).length,
  }));

  const sort = query.get("sort");
  if (sort === "popular") list.sort((a, b) => b.ratingCount - a.ratingCount || a.rank - b.rank);
  if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));

  sendJson(res, 200, { cocktails: list, spirits, regions: REGIONS, ingredients: ingredientOptions });
});

// Everything the "What can I make?" page needs in one go: the ingredients to pick from, and every
// recipe (classics and variations) with its requirements, so the page can match as boxes are ticked.
router.get("/api/pantry", async (req, res) => {
  const ranked = new Map(rankedCocktails().map((c) => [c.id, c]));
  const recipes = [];
  for (const c of db.prepare("SELECT * FROM cocktails").all()) {
    const r = ranked.get(c.id);
    const drink = {
      slug: c.slug,
      name: c.name,
      tagline: c.tagline,
      spirit: c.spirit,
      glass: c.glass,
      color: c.color,
      image: c.image,
      garnish: c.garnish,
      rank: r.rank,
      averageRating: r.averageRating,
      ratingCount: r.ratingCount,
    };
    recipes.push({ ...drink, variation: null, needs: recipeNeeds(JSON.parse(c.ingredients)).needs });
    for (const v of rankedVariations(c)) {
      if (v.classic) continue;
      recipes.push({
        ...drink,
        variation: { slug: v.slug, name: v.name, rank: v.rank, averageRating: v.averageRating, ratingCount: v.ratingCount },
        needs: recipeNeeds(v.ingredients).needs,
      });
    }
  }
  recipes.sort((a, b) => a.rank - b.rank || (a.variation?.rank ?? 0) - (b.variation?.rank ?? 0));
  const usedBy = (id) => recipes.filter((r) => r.needs.some((alts) => alts.includes(id))).length;
  sendJson(res, 200, {
    items: PANTRY.map(({ id, name, group }) => ({ id, name, group, recipeCount: usedBy(id) })),
    staples: STAPLES,
    recipes,
  });
});

router.get("/api/cocktails/:slug", async (req, res, { params }) => {
  const c = getCocktailOr404(params.slug);
  const user = currentUser(req);
  const ranked = rankedCocktails();
  const stats = ranked.find((r) => r.id === c.id);

  const distribution = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: 0 }));
  for (const row of db
    .prepare("SELECT stars, COUNT(*) AS count FROM ratings WHERE cocktail_id = ? GROUP BY stars")
    .all(c.id)) {
    distribution.find((d) => d.stars === row.stars).count = row.count;
  }

  const reviews = db
    .prepare(
      `SELECT r.id, r.stars, r.review, r.created_at AS createdAt, r.updated_at AS updatedAt,
              u.id AS userId, u.display_name AS displayName
         FROM ratings r JOIN users u ON u.id = r.user_id
        WHERE r.cocktail_id = ?
        ORDER BY (r.review IS NULL), r.updated_at DESC`
    )
    .all(c.id);

  const myRating = user ? reviews.find((r) => r.userId === user.id) ?? null : null;

  sendJson(res, 200, {
    cocktail: {
      id: c.id,
      slug: c.slug,
      name: c.name,
      tagline: c.tagline,
      spirit: c.spirit,
      glass: c.glass,
      color: c.color,
      image: c.image,
      garnish: c.garnish,
      history: c.history,
      regions: JSON.parse(c.regions),
      places: JSON.parse(c.places),
      ingredients: JSON.parse(c.ingredients),
      steps: JSON.parse(c.steps),
    },
    stats: {
      rank: stats.rank,
      totalCocktails: ranked.length,
      averageRating: stats.averageRating,
      ratingCount: stats.ratingCount,
      score: stats.score,
      distribution,
    },
    reviews,
    myRating,
    variations: rankedVariations(c, user?.id),
  });
});

router.put("/api/cocktails/:slug/variations/:variation/rating", async (req, res, { params }) => {
  const user = requireUser(req);
  const v = getVariationOr404(getCocktailOr404(params.slug), params.variation);
  const body = await readJson(req);
  const stars = Number(body.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5)
    throw new HttpError(400, "Rating must be a whole number from 1 to 5.");
  db.prepare(
    `INSERT INTO variation_ratings (user_id, variation_id, stars) VALUES (?, ?, ?)
     ON CONFLICT(user_id, variation_id) DO UPDATE SET stars = excluded.stars, updated_at = datetime('now')`
  ).run(user.id, v.id, stars);
  sendJson(res, 200, { ok: true });
});

router.delete("/api/cocktails/:slug/variations/:variation/rating", async (req, res, { params }) => {
  const user = requireUser(req);
  const v = getVariationOr404(getCocktailOr404(params.slug), params.variation);
  db.prepare("DELETE FROM variation_ratings WHERE user_id = ? AND variation_id = ?").run(user.id, v.id);
  sendJson(res, 200, { ok: true });
});

router.put("/api/cocktails/:slug/rating", async (req, res, { params }) => {
  const user = requireUser(req);
  const c = getCocktailOr404(params.slug);
  const body = await readJson(req);
  const stars = Number(body.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5)
    throw new HttpError(400, "Rating must be a whole number from 1 to 5.");
  let review = body.review == null ? null : String(body.review).trim();
  if (review === "") review = null;
  if (review && review.length > 2000) throw new HttpError(400, "Reviews are limited to 2,000 characters.");

  db.prepare(
    `INSERT INTO ratings (user_id, cocktail_id, stars, review)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, cocktail_id) DO UPDATE SET
       stars = excluded.stars, review = excluded.review, updated_at = datetime('now')`
  ).run(user.id, c.id, stars, review);

  sendJson(res, 200, { ok: true });
});

router.delete("/api/cocktails/:slug/rating", async (req, res, { params }) => {
  const user = requireUser(req);
  const c = getCocktailOr404(params.slug);
  db.prepare("DELETE FROM ratings WHERE user_id = ? AND cocktail_id = ?").run(user.id, c.id);
  sendJson(res, 200, { ok: true });
});

router.get("/api/me/ratings", async (req, res) => {
  const user = requireUser(req);
  const ratings = db
    .prepare(
      `SELECT r.stars, r.review, r.updated_at AS updatedAt,
              c.slug, c.name, c.glass, c.color, c.image, c.spirit, c.garnish
         FROM ratings r JOIN cocktails c ON c.id = r.cocktail_id
        WHERE r.user_id = ?
        ORDER BY r.stars DESC, r.updated_at DESC`
    )
    .all(user.id);
  sendJson(res, 200, { ratings });
});

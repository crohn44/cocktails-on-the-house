import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cocktails as seedCocktails } from "./data/cocktails.js";
import { variations as seedVariations } from "./data/variations.js";

const here = dirname(fileURLToPath(import.meta.url));
export const DB_PATH = process.env.DB_PATH || resolve(here, "../data/cocktails.db");

mkdirSync(dirname(DB_PATH), { recursive: true });
export const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    display_name  TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cocktails (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    slug        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    tagline     TEXT NOT NULL,
    spirit      TEXT NOT NULL,
    glass       TEXT NOT NULL,
    color       TEXT NOT NULL,
    image       TEXT,
    garnish     TEXT,
    history     TEXT NOT NULL,
    regions     TEXT NOT NULL DEFAULT '[]', -- JSON array of region names
    places      TEXT NOT NULL DEFAULT '[]', -- JSON array of {name, lat, lng, note, origin?}
    ingredients TEXT NOT NULL, -- JSON array of {amount, item}
    steps       TEXT NOT NULL  -- JSON array of strings
  );

  CREATE TABLE IF NOT EXISTS ratings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cocktail_id INTEGER NOT NULL REFERENCES cocktails(id) ON DELETE CASCADE,
    stars       INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
    review      TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (user_id, cocktail_id)
  );

  CREATE INDEX IF NOT EXISTS idx_ratings_cocktail ON ratings(cocktail_id);

  -- Recipe variations of a drink. The drink's own recipe is the "classic" row (its recipe
  -- columns are NULL and the cocktail's are used). Rated separately from the drink overall.
  CREATE TABLE IF NOT EXISTS variations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    cocktail_id INTEGER NOT NULL REFERENCES cocktails(id) ON DELETE CASCADE,
    slug        TEXT NOT NULL,
    name        TEXT NOT NULL,
    description TEXT,
    glass       TEXT,
    garnish     TEXT,
    ingredients TEXT, -- JSON array of {amount, item}; NULL for the classic
    steps       TEXT, -- JSON array of strings; NULL for the classic
    position    INTEGER NOT NULL DEFAULT 0,
    UNIQUE (cocktail_id, slug)
  );

  CREATE TABLE IF NOT EXISTS variation_ratings (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    variation_id INTEGER NOT NULL REFERENCES variations(id) ON DELETE CASCADE,
    stars        INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (user_id, variation_id)
  );

  CREATE INDEX IF NOT EXISTS idx_variation_ratings_variation ON variation_ratings(variation_id);
`);

// Databases created before regions and places existed get the columns added, then a re-sync below.
const cocktailColumns = db.prepare("PRAGMA table_info(cocktails)").all().map((c) => c.name);
let needsSync = false;
for (const col of ["regions", "places"]) {
  if (!cocktailColumns.includes(col)) {
    db.exec(`ALTER TABLE cocktails ADD COLUMN ${col} TEXT NOT NULL DEFAULT '[]'`);
    needsSync = true;
  }
}

// Databases created before variations existed need them filled in.
if (!db.prepare("SELECT 1 FROM variations LIMIT 1").get() && Object.keys(seedVariations).length) needsSync = true;

/**
 * Insert or update every drink in data/cocktails.js (matched by slug) and its variations in
 * data/variations.js. Ratings are untouched, except for variations removed from the data file.
 */
export function seedCocktailCatalogue() {
  const upsert = db.prepare(`
    INSERT INTO cocktails (slug, name, tagline, spirit, glass, color, image, garnish, history, regions, places, ingredients, steps)
    VALUES (:slug, :name, :tagline, :spirit, :glass, :color, :image, :garnish, :history, :regions, :places, :ingredients, :steps)
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name, tagline = excluded.tagline, spirit = excluded.spirit,
      glass = excluded.glass, color = excluded.color, image = excluded.image,
      garnish = excluded.garnish, history = excluded.history,
      regions = excluded.regions, places = excluded.places,
      ingredients = excluded.ingredients, steps = excluded.steps
  `);
  db.exec("BEGIN");
  try {
    for (const c of seedCocktails) {
      upsert.run({
        slug: c.slug,
        name: c.name,
        tagline: c.tagline,
        spirit: c.spirit,
        glass: c.glass,
        color: c.color,
        image: c.image ?? null,
        garnish: c.garnish ?? null,
        history: c.history,
        regions: JSON.stringify(c.regions ?? []),
        places: JSON.stringify(c.places ?? []),
        ingredients: JSON.stringify(c.ingredients),
        steps: JSON.stringify(c.steps),
      });
      syncVariations(c.slug, seedVariations[c.slug] ?? []);
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  return seedCocktails.length;
}

function syncVariations(slug, list) {
  const { id: cocktailId } = db.prepare("SELECT id FROM cocktails WHERE slug = ?").get(slug);
  const rows = list.length ? [{ slug: "classic", name: "Classic" }, ...list] : [];
  const upsert = db.prepare(`
    INSERT INTO variations (cocktail_id, slug, name, description, glass, garnish, ingredients, steps, position)
    VALUES (:cocktailId, :slug, :name, :description, :glass, :garnish, :ingredients, :steps, :position)
    ON CONFLICT(cocktail_id, slug) DO UPDATE SET
      name = excluded.name, description = excluded.description, glass = excluded.glass,
      garnish = excluded.garnish, ingredients = excluded.ingredients, steps = excluded.steps,
      position = excluded.position
  `);
  rows.forEach((v, position) =>
    upsert.run({
      cocktailId,
      slug: v.slug,
      name: v.name,
      description: v.description ?? null,
      glass: v.glass ?? null,
      garnish: v.garnish ?? null,
      ingredients: v.ingredients ? JSON.stringify(v.ingredients) : null,
      steps: v.steps ? JSON.stringify(v.steps) : null,
      position,
    })
  );
  // Drop variations that were removed from the data file (and their ratings).
  const keep = rows.map((v) => v.slug);
  db.prepare(
    `DELETE FROM variations WHERE cocktail_id = ? AND slug NOT IN (${keep.map(() => "?").join(",") || "''"})`
  ).run(cocktailId, ...keep);
}

const { n } = db.prepare("SELECT COUNT(*) AS n FROM cocktails").get();
if (n === 0 || needsSync) seedCocktailCatalogue();

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cocktails as catalogue } from "../src/data/cocktails.js";

const PORT = 3999;
const BASE = `http://localhost:${PORT}`;
let proc, dir;

before(async () => {
  dir = mkdtempSync(join(tmpdir(), "coth-"));
  proc = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "src/index.js"], {
    env: { ...process.env, PORT: String(PORT), DB_PATH: join(dir, "test.db") },
    stdio: "pipe",
  });
  await new Promise((resolve, reject) => {
    proc.stdout.on("data", (d) => String(d).includes("listening") && resolve());
    proc.on("exit", (code) => reject(new Error(`server exited ${code}`)));
  });
});

after(() => {
  proc?.kill();
  rmSync(dir, { recursive: true, force: true });
});

function client() {
  let cookie = "";
  return async (method, path, body) => {
    const res = await fetch(BASE + path, {
      method,
      headers: { "Content-Type": "application/json", ...(cookie && { Cookie: cookie }) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    return { status: res.status, body: await res.json() };
  };
}

test("lists every cocktail with ranks", async () => {
  const api = client();
  const { status, body } = await api("GET", "/api/cocktails");
  assert.equal(status, 200);
  assert.equal(body.cocktails.length, catalogue.length);
  assert.deepEqual(body.cocktails.map((c) => c.rank), Array.from({ length: catalogue.length }, (_, i) => i + 1));
});

test("rating requires sign-in", async () => {
  const api = client();
  const { status } = await api("PUT", "/api/cocktails/negroni/rating", { stars: 5 });
  assert.equal(status, 401);
});

test("register, rate, review, rank, update, delete", async () => {
  const alice = client();
  const bob = client();
  let r = await alice("POST", "/api/auth/register", { email: "alice@test.com", displayName: "Alice", password: "password1" });
  assert.equal(r.status, 201);
  r = await bob("POST", "/api/auth/register", { email: "bob@test.com", displayName: "Bob", password: "password1" });
  assert.equal(r.status, 201);

  // duplicate email
  r = await client()("POST", "/api/auth/register", { email: "ALICE@test.com", displayName: "A2", password: "password1" });
  assert.equal(r.status, 409);

  r = await alice("GET", "/api/auth/me");
  assert.equal(r.body.user.displayName, "Alice");

  // invalid stars
  r = await alice("PUT", "/api/cocktails/negroni/rating", { stars: 6 });
  assert.equal(r.status, 400);

  await alice("PUT", "/api/cocktails/negroni/rating", { stars: 5, review: "Perfectly bitter." });
  await bob("PUT", "/api/cocktails/negroni/rating", { stars: 4 });
  await alice("PUT", "/api/cocktails/cosmopolitan/rating", { stars: 1 });

  r = await alice("GET", "/api/cocktails/negroni");
  assert.equal(r.body.stats.ratingCount, 2);
  assert.equal(r.body.stats.averageRating, 4.5);
  assert.equal(r.body.stats.rank, 1);
  assert.equal(r.body.myRating.stars, 5);
  assert.equal(r.body.reviews[0].review, "Perfectly bitter.");
  assert.equal(r.body.stats.distribution.find((d) => d.stars === 4).count, 1);

  r = await alice("GET", "/api/cocktails");
  assert.equal(r.body.cocktails[0].slug, "negroni");
  assert.equal(r.body.cocktails.at(-1).slug, "cosmopolitan");

  // updating replaces rather than duplicates
  await alice("PUT", "/api/cocktails/negroni/rating", { stars: 3, review: "" });
  r = await alice("GET", "/api/cocktails/negroni");
  assert.equal(r.body.stats.ratingCount, 2);
  assert.equal(r.body.myRating.review, null);

  r = await alice("GET", "/api/me/ratings");
  assert.equal(r.body.ratings.length, 2);

  await alice("DELETE", "/api/cocktails/negroni/rating");
  r = await alice("GET", "/api/cocktails/negroni");
  assert.equal(r.body.stats.ratingCount, 1);
  assert.equal(r.body.myRating, null);
});

test("login / logout", async () => {
  const api = client();
  let r = await api("POST", "/api/auth/login", { email: "alice@test.com", password: "wrong" });
  assert.equal(r.status, 401);
  r = await api("POST", "/api/auth/login", { email: "alice@test.com", password: "password1" });
  assert.equal(r.status, 200);
  r = await api("POST", "/api/auth/logout");
  r = await api("GET", "/api/auth/me");
  assert.equal(r.body.user, null);
});

test("cross-origin writes are blocked", async () => {
  const res = await fetch(BASE + "/api/auth/logout", { method: "POST", headers: { Origin: "https://evil.example" } });
  assert.equal(res.status, 403);
});

test("search and filter", async () => {
  const api = client();
  let r = await api("GET", "/api/cocktails?spirit=Gin");
  assert.ok(r.body.cocktails.every((c) => c.spirit === "Gin"));
  r = await api("GET", "/api/cocktails?q=mule");
  assert.equal(r.body.cocktails[0].slug, "moscow-mule");
  r = await api("GET", "/api/cocktails?region=France");
  assert.ok(r.body.cocktails.length > 0);
  assert.ok(r.body.cocktails.every((c) => c.regions.includes("France")));
  assert.ok(r.body.regions.includes("France"));
  r = await api("GET", "/api/cocktails?ingredient=Campari&ingredient=Sweet%20vermouth");
  const slugs = r.body.cocktails.map((c) => c.slug);
  assert.ok(slugs.includes("negroni") && slugs.includes("americano"));
  assert.ok(!slugs.includes("old-pal")); // Campari with dry vermouth
  assert.ok(r.body.cocktails.every((c) => c.ingredientTags.includes("Campari") && c.ingredientTags.includes("Sweet vermouth")));
  assert.equal(r.body.ingredients.find((i) => i.name === "Campari").count, slugs.length);
  r = await api("GET", "/api/cocktails/french-75");
  assert.deepEqual(r.body.cocktail.regions, ["France", "UK & Ireland", "US South"]);
  assert.equal(r.body.cocktail.places.filter((p) => p.origin).length, 1);
  r = await api("GET", "/api/cocktails/nope");
  assert.equal(r.status, 404);
});

test("variations: listed, rated separately, ranked within the drink", async () => {
  const carol = client();
  const dave = client();
  await carol("POST", "/api/auth/register", { email: "carol@test.com", displayName: "Carol", password: "password1" });
  await dave("POST", "/api/auth/register", { email: "dave@test.com", displayName: "Dave", password: "password1" });

  let r = await carol("GET", "/api/cocktails/dry-martini");
  const { variations } = r.body;
  assert.equal(variations[0].slug, "classic");
  assert.deepEqual(variations[0].ingredients, r.body.cocktail.ingredients);
  assert.ok(variations.some((v) => v.slug === "dirty"));
  assert.deepEqual(variations.map((v) => v.rank).sort((a, b) => a - b), variations.map((_, i) => i + 1));

  // Drinks without variations get an empty list.
  r = await carol("GET", "/api/cocktails/paper-plane");
  assert.deepEqual(r.body.variations, []);

  r = await client()("PUT", "/api/cocktails/dry-martini/variations/dirty/rating", { stars: 5 });
  assert.equal(r.status, 401);
  r = await carol("PUT", "/api/cocktails/dry-martini/variations/nope/rating", { stars: 5 });
  assert.equal(r.status, 404);
  r = await carol("PUT", "/api/cocktails/dry-martini/variations/dirty/rating", { stars: 0 });
  assert.equal(r.status, 400);

  await carol("PUT", "/api/cocktails/dry-martini/variations/dirty/rating", { stars: 5 });
  await dave("PUT", "/api/cocktails/dry-martini/variations/dirty/rating", { stars: 5 });
  await carol("PUT", "/api/cocktails/dry-martini/variations/vodka/rating", { stars: 2 });

  r = await carol("GET", "/api/cocktails/dry-martini");
  const dirty = r.body.variations.find((v) => v.slug === "dirty");
  const vodka = r.body.variations.find((v) => v.slug === "vodka");
  assert.equal(dirty.ratingCount, 2);
  assert.equal(dirty.averageRating, 5);
  assert.equal(dirty.myStars, 5);
  assert.equal(dirty.rank, 1);
  assert.equal(vodka.rank, r.body.variations.length);
  // Variation ratings don't touch the drink's overall rating.
  assert.equal(r.body.stats.ratingCount, 0);

  // Update, then remove.
  await carol("PUT", "/api/cocktails/dry-martini/variations/dirty/rating", { stars: 3 });
  r = await carol("GET", "/api/cocktails/dry-martini");
  assert.equal(r.body.variations.find((v) => v.slug === "dirty").averageRating, 4);
  await carol("DELETE", "/api/cocktails/dry-martini/variations/dirty/rating");
  r = await carol("GET", "/api/cocktails/dry-martini");
  assert.equal(r.body.variations.find((v) => v.slug === "dirty").myStars, null);
});

test("pantry: every recipe line is understood", async () => {
  const { recipeNeeds } = await import("../src/data/pantry.js");
  const { variations } = await import("../src/data/variations.js");
  const unknown = [];
  for (const c of catalogue) {
    unknown.push(...recipeNeeds(c.ingredients).unknown.map((u) => `${c.slug}: ${u}`));
    for (const v of variations[c.slug] ?? [])
      unknown.push(...recipeNeeds(v.ingredients).unknown.map((u) => `${c.slug}/${v.slug}: ${u}`));
  }
  assert.deepEqual(unknown, [], "add PANTRY entries (server/src/data/pantry.js) for these lines");
});

test("pantry: lists ingredients and makeable recipes, including variations", async () => {
  const api = client();
  const { status, body } = await api("GET", "/api/pantry");
  assert.equal(status, 200);
  assert.ok(body.items.some((i) => i.id === "campari"));
  const have = new Set(["gin", "campari", "sweet-vermouth", "mezcal"]);
  const makeable = body.recipes.filter((r) => r.needs.every((alts) => alts.some((id) => have.has(id))));
  const names = makeable.map((r) => (r.variation ? r.variation.name : r.name));
  assert.ok(names.includes("Negroni"));
  assert.ok(names.includes("Mezcal Negroni"));
  assert.ok(!names.includes("Americano")); // needs soda water
  // Ordered by the drinks' overall rank.
  const ranks = body.recipes.map((r) => r.rank);
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
});

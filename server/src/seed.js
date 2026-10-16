// Usage:
//   npm run reseed            -> re-sync the cocktail catalogue from data/cocktails.js (keeps users & ratings)
//   npm run seed:demo         -> also (re)create clearly-labelled demo accounts with sample ratings
//
// Demo accounts all use the password "cocktails123".
import { db, seedCocktailCatalogue } from "./db.js";
import { hashPassword } from "./auth.js";

const count = seedCocktailCatalogue();
console.log(`Synced ${count} cocktails.`);

if (process.argv.includes("--demo")) {
  const DEMO_USERS = 600;
  const REVIEW_CHANCE = 1 / 11; // about 10 star-only ratings for every written review
  const DAYS = 365; // ratings are spread over the past year, weighted toward recent months

  // Rough worldwide popularity, 1–10. It sets how many ratings each drink gets (squared, so the
  // classics get roughly ten times as many as the deep cuts). Drinks not listed default to 4.
  const POPULARITY = {
    10: ["margarita", "mojito", "old-fashioned", "negroni", "espresso-martini", "aperol-spritz", "gin-and-tonic"],
    9: ["dry-martini", "daiquiri", "whiskey-sour", "moscow-mule", "pina-colada", "cosmopolitan", "manhattan", "cuba-libre", "mimosa"],
    8: ["paloma", "mai-tai", "bloody-mary", "long-island-iced-tea", "pornstar-martini", "white-russian", "caipirinha", "pisco-sour", "french-75", "tequila-sunrise"],
    7: ["tom-collins", "dark-n-stormy", "penicillin", "boulevardier", "sex-on-the-beach", "irish-coffee", "mint-julep", "sidecar", "bellini", "sazerac", "hugo-spritz", "gimlet", "negroni-sbagliato", "americano"],
    6: ["paper-plane", "last-word", "lemon-drop", "hot-toddy", "bees-knees", "bramble", "singapore-sling", "zombie", "painkiller", "hurricane", "kir-royale", "tommys-margarita", "appletini", "black-russian", "caesar", "japanese-highball", "rob-roy", "jungle-bird", "carajillo"],
    5: ["vieux-carre", "gold-rush", "corpse-reviver-2", "clover-club", "aviation", "ramos-gin-fizz", "southside", "white-lady", "vesper", "gibson", "brandy-alexander", "grasshopper", "midori-sour", "pimms-cup", "el-diablo", "oaxaca-old-fashioned", "naked-and-famous", "planters-punch", "hemingway-daiquiri", "blue-hawaii", "rum-runner", "b-52", "fernet-con-coca", "gin-basil-smash", "garibaldi", "mudslide", "blood-and-sand"],
    4: ["brown-derby", "rusty-nail", "whiskey-smash", "martinez", "hanky-panky", "gin-rickey", "harvey-wallbanger", "el-presidente", "ti-punch", "batanga", "cantarito", "stinger", "new-york-sour", "trinidad-sour", "jack-rose", "mary-pickford", "old-pal"],
    3: ["ward-eight", "seelbach", "pegu-club", "queens-park-swizzle", "brandy-crusta", "pisco-punch", "sherry-cobbler", "bamboo"],
  };
  const popularity = new Map(Object.entries(POPULARITY).flatMap(([p, slugs]) => slugs.map((s) => [s, Number(p)])));
  // Love-it-or-hate-it drinks get a wider, less lopsided spread of stars.
  const POLARIZING = new Set(["appletini", "bloody-mary", "caesar", "fernet-con-coca", "trinidad-sour", "long-island-iced-tea", "b-52", "blue-hawaii", "midori-sour"]);

  // Deterministic pseudo-random numbers, so every run produces the same demo data.
  let seed = 20261013;
  const random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const normal = () => Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());
  // Skew-normal sample with mean 0 and sd 1. Negative `alpha` gives a longer tail of low scores:
  // most people who order a drink like it, and a few really don't.
  const skewNormal = (alpha) => {
    const delta = alpha / Math.sqrt(1 + alpha * alpha);
    const u0 = normal();
    const u1 = delta * u0 + Math.sqrt(1 - delta * delta) * normal();
    const z = u0 >= 0 ? u1 : -u1;
    const mean = delta * Math.sqrt(2 / Math.PI);
    return (z - mean) / Math.sqrt(1 - mean * mean);
  };

  const sampleReviews = {
    5: ["Sample review from a demo account: an all-time favorite.", "Sample review from a demo account: perfectly balanced."],
    4: ["Sample review from a demo account: really good, would order again.", "Sample review from a demo account: solid classic."],
    3: ["Sample review from a demo account: fine, but not my go-to.", "Sample review from a demo account: depends on who's making it."],
    2: ["Sample review from a demo account: too sweet for me.", "Sample review from a demo account: not really my style."],
    1: ["Sample review from a demo account: couldn't finish it."],
  };

  // Replace any earlier demo data; real accounts and their ratings are untouched.
  db.prepare("DELETE FROM users WHERE email LIKE 'demo%@example.com'").run();

  const hash = await hashPassword("cocktails123");
  const insertUser = db.prepare("INSERT INTO users (email, display_name, password_hash) VALUES (?, ?, ?)");
  const insertRating = db.prepare(
    `INSERT INTO ratings (user_id, cocktail_id, stars, review, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`
  );

  // Each drink gets a typical score (a little higher for popular drinks), a spread and a skew.
  const drinks = db
    .prepare("SELECT id, slug FROM cocktails ORDER BY id")
    .all()
    .map((c) => {
      const pop = popularity.get(c.slug) ?? 4;
      const polarizing = POLARIZING.has(c.slug);
      return {
        id: c.id,
        chance: 0.6 * (pop / 10) ** 2 * (0.85 + random() * 0.3),
        mean: Math.min(4.6, Math.max(2.6, 3.35 + 0.07 * pop + normal() * 0.25 - (polarizing ? 0.3 : 0))),
        sd: polarizing ? 1.25 : 0.75 + random() * 0.3,
        alpha: polarizing ? -0.5 + random() : -1 - random() * 3,
        raters: [],
      };
    });

  let ratings = 0, reviews = 0;
  const counts = new Map();
  db.exec("BEGIN");
  for (let i = 1; i <= DEMO_USERS; i++) {
    const { lastInsertRowid } = insertUser.run(`demo${i}@example.com`, `Demo Taster ${i}`, hash);
    const activity = Math.exp(normal() * 0.5 - 0.125); // some accounts rate a lot more than others
    for (const d of drinks) {
      if (random() > Math.min(0.95, d.chance * activity)) continue;
      const stars = Math.min(5, Math.max(1, Math.round(d.mean + d.sd * skewNormal(d.alpha))));
      const options = sampleReviews[stars];
      const review = random() < REVIEW_CHANCE ? options[Math.floor(random() * options.length)] : null;
      const ago = DAYS * random() ** 1.3 * 864e5;
      const when = new Date(Date.now() - ago).toISOString().slice(0, 19).replace("T", " ");
      insertRating.run(Number(lastInsertRowid), d.id, stars, review, when, when);
      d.raters.push({ userId: Number(lastInsertRowid), stars, ago });
      counts.set(d.id, (counts.get(d.id) ?? 0) + 1);
      ratings++;
      if (review) reviews++;
    }
  }

  // Variations: some of the people who rated a drink also rate its versions. The classic gets the
  // most ratings, later variations fewer. Each version has its own lean relative to the drink, and
  // people's scores stay correlated with how they rated the drink overall.
  const variationsOf = db.prepare("SELECT id, position FROM variations WHERE cocktail_id = ? ORDER BY position");
  const insertVariationRating = db.prepare(
    "INSERT INTO variation_ratings (user_id, variation_id, stars, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  );
  let variationRatings = 0;
  for (const d of drinks) {
    for (const v of variationsOf.all(d.id)) {
      const chance = v.position === 0 ? 0.5 : 0.35 / Math.sqrt(v.position);
      const lean = v.position === 0 ? 0.1 : normal() * 0.35;
      for (const r of d.raters) {
        if (random() > chance) continue;
        const stars = Math.min(5, Math.max(1, Math.round(0.5 * r.stars + 0.5 * d.mean + lean + normal() * 0.7)));
        const when = new Date(Date.now() - r.ago * random()).toISOString().slice(0, 19).replace("T", " ");
        insertVariationRating.run(r.userId, v.id, stars, when, when);
        variationRatings++;
      }
    }
  }
  db.exec("COMMIT");
  const perDrink = [...counts.values()].sort((a, b) => a - b);
  console.log(
    `Added ${DEMO_USERS} demo accounts (demo1–demo${DEMO_USERS}@example.com, password: cocktails123) ` +
      `with ${ratings} ratings, ${reviews} of them with written reviews. ` +
      `Ratings per drink range from ${perDrink[0]} to ${perDrink[perDrink.length - 1]}. ` +
      `Plus ${variationRatings} ratings of individual variations.`
  );
}

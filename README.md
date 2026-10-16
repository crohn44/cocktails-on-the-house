# 🍸 Cocktails on the House

The best cocktails, ranked by the people who drink them.

- **Sign up / sign in** with email and password
- **Rate any cocktail 1–5 stars**, with an optional written review (edit or remove it any time)
- **Live rankings**: the overall list is ordered by each drink's aggregate rating
- **A page for every drink** with artwork, a short history, the full recipe, a rating breakdown and reviews
- Search from the header on any page, filter by base spirit, region or other ingredients (lime, Campari, egg white...), and sort by top rated / most rated / A–Z
- **Variations**: popular drinks list their best-known versions (Dirty Martini, Spicy Margarita, White Negroni...), each with its own recipe and its own quick star rating, ranked against each other on the drink page
- **What can I make?** (`/my-bar`): tick what's in your bar and see every drink and variation you can make, best-ranked first, plus which single bottle would unlock the most new recipes
- **Region tags and an origin map** on every drink page, showing where it was created and where else it made its name
- A **My ratings** page for everything you've rated
- 111 classic and modern-classic cocktails from around the world to start

## Tech

| Part | Stack |
| --- | --- |
| `client/` | React 19 + Vite, plain CSS, a tiny built-in router (no other runtime deps) |
| `server/` | Node.js with **zero npm dependencies**: built-in `node:http`, `node:crypto` (scrypt password hashing) and `node:sqlite` |
| Database | A single SQLite file at `server/data/cocktails.db`, created automatically |

Auth uses an `HttpOnly` session cookie (30-day sessions stored in SQLite), with basic rate limiting on sign-in and cross-origin write protection.

## Getting started

Requires **Node.js 22.13 or newer** (Node 24 LTS recommended). Check with `node -v`.

```bash
cd ~/Documents/cocktails-on-the-house
npm install          # installs React + Vite for the client
npm run dev          # starts the API (port 3001) and the site (port 5173)
```

Open **http://localhost:5173**.

The database is created and filled with the 111 cocktails the first time the server starts. To see the rankings in action straight away, you can add clearly-labeled demo accounts with sample ratings:

```bash
npm run seed:demo    # demo1@example.com … demo600@example.com, password: cocktails123
npm run reset        # wipe ALL users/ratings and start fresh
```

## Scripts (run from the project root)

| Command | What it does |
| --- | --- |
| `npm run dev` | API + Vite dev server with hot reload |
| `npm run build` | Build the React app into `client/dist` |
| `npm start` | Serve the built site **and** API together on http://localhost:3001 |
| `npm test` | API tests (auth, rating, ranking, permissions) |
| `npm run reseed` | Re-sync drinks from `server/src/data/cocktails.js` (keeps users & ratings) |
| `npm run seed:demo` | Replace the demo accounts and sample ratings: about 16,000 ratings, more for more popular drinks, about 10 star-only per written review (weights are in `server/src/seed.js`) |
| `npm run reset` | Delete the database and start fresh |

## How the ranking works

Sorting by plain average would let a drink with one 5-star rating beat one with a hundred 4.8s. Instead the list uses a **Bayesian (weighted) average**:

```
score = (v / (v + m)) × R  +  (m / (v + m)) × C
```

`R` is the drink's average, `v` its number of ratings, `C` the average across the whole site, and `m` = 5 "phantom" votes. Drinks with few ratings get pulled toward the site average, and as they collect real ratings their own average takes over. You can tune `PRIOR_WEIGHT` in `server/src/routes.js`.

## Adding or editing cocktails

All drinks live in **`server/src/data/cocktails.js`**: name, tagline, base spirit, region tags, map places, glass, color, garnish, history, ingredients and steps. Edit or add an entry, then run `npm run reseed`.

`regions` picks one or more names from the `REGIONS` list at the top of that file (add a new region there first). `places` are the pins on the drink's map: each has a name, latitude, longitude and a short note, and the one where the drink was created gets `origin: true`. The map outline itself is pre-generated in `client/src/data/worldMap.js` (Natural Earth data, covering everything except New Zealand, the far Pacific and the poles), so pins outside that area need the outline regenerated with `scripts/build-world-map.mjs` (instructions at the top of that file).

### Ingredient filters

The ingredients you can filter by are listed in **`server/src/data/ingredients.js`**, each with a pattern that's matched against the items in a drink's classic recipe, so new drinks are tagged automatically. To make a new ingredient filterable, add an entry there.

### "What can I make?"

Every line of every recipe is mapped to the ingredient checklist in **`server/src/data/pantry.js`**. "A or B" lines accept either, optional lines and garnishes are skipped, and sugar, simple syrup, ice, water, salt and pepper are assumed. If you add a drink with an ingredient it doesn't know, `npm test` fails and names the line, so add a `PANTRY` entry for it. A user's ticked ingredients are saved in their browser.

### Variations

Variations live in **`server/src/data/variations.js`**, keyed by the drink's slug. Each has a slug, name, one-line description, ingredients and steps, and optionally its own glass and garnish (otherwise the classic's are used). The drink's main recipe is automatically listed first as the "Classic". Variation ratings are separate from the drink's overall rating, so they never move it on the Rankings page. Run `npm run reseed` after editing; removing a variation from the file deletes it and its ratings.

### Photos

Each drink shows an illustrated glass drawn from its `glass`, `color` and `garnish` fields. To use a real photo, put it in `client/public/images/`, add `image: "/images/negroni.jpg"` to the drink, and run `npm run reseed`. Only use photos you have the rights to.

## Project structure

```
cocktails-on-the-house/
├── client/                 React app (Vite)
│   ├── src/
│   │   ├── pages/          Home, Rankings, MyBar, Drink, Auth, MyRatings, NotFound
│   │   ├── components/     Header, CocktailArt, Stars, RatingForm, OriginMap, RatingTrend, Variations, IngredientFilter
│   │   ├── data/           worldMap.js (generated map outline)
│   │   ├── lib/            api.js, auth.jsx (context), router.jsx
│   │   └── styles.css
│   └── vite.config.js      proxies /api → localhost:3001 in dev
├── server/
│   ├── src/
│   │   ├── index.js        HTTP server + static file serving
│   │   ├── routes.js       API endpoints + ranking
│   │   ├── auth.js         passwords, sessions, cookies
│   │   ├── db.js           SQLite schema
│   │   ├── seed.js
│   │   └── data/           cocktails.js, variations.js, ingredients.js, pantry.js
│   └── test/api.test.js
└── scripts/dev.js          runs both dev servers
```

## API

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | | `{ email, displayName, password }` |
| POST | `/api/auth/login` | | `{ email, password }` |
| POST | `/api/auth/logout` | | |
| GET | `/api/auth/me` | | Current user or `null` |
| GET | `/api/cocktails?q=&spirit=&region=&ingredient=&sort=popular\|name` | | Ranked list; repeat `ingredient` to require several |
| GET | `/api/cocktails/:slug` | | Drink, stats, distribution, reviews, your rating, ranked variations |
| PUT | `/api/cocktails/:slug/rating` | ✔ | `{ stars: 1–5, review? }`, create or update |
| DELETE | `/api/cocktails/:slug/rating` | ✔ | Remove your rating |
| PUT | `/api/cocktails/:slug/variations/:variation/rating` | ✔ | `{ stars: 1–5 }` for one variation (use `classic` for the main recipe) |
| DELETE | `/api/cocktails/:slug/variations/:variation/rating` | ✔ | Remove your rating of that variation |
| GET | `/api/me/ratings` | ✔ | Everything you've rated |
| GET | `/api/pantry` | | Checklist ingredients and every recipe's requirements, for "What can I make?" |

## Deploying

Run `npm run build`, then `npm start` on any host that runs Node 22.13+ and has a persistent disk for the SQLite file (Render, Railway and Fly.io all work, as does a small VPS). Behind HTTPS, set `COOKIE_SECURE=true`. Use `PORT` to change the port and `DB_PATH` to move the database file.

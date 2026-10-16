# Cocktail photos

Each drink shows an illustrated glass by default. To use a real photo:

1. Put the image in this folder, e.g. `negroni.jpg` (landscape or square, ~1200px works well).
2. In `server/src/data/cocktails.js`, add `image: "/images/negroni.jpg",` to that drink.
3. Run `npm run reseed` from the project root (your users and ratings are kept).

Only use photos you took yourself or have the rights to use (e.g. CC-licensed images with attribution).

## Background photos

`bg-glasses.jpg` ([CHUTTERSNAP](https://unsplash.com/photos/piled-wine-glass-set-hanging-DOBIZ_sqgXM)) and `bg-bar-shelf.jpg` ([ncp](https://unsplash.com/photos/bottles-and-glasses-on-a-bar-shelf-with-warm-lighting-ZgISIpuyo18)) are from Unsplash, under the Unsplash License. They're used as the faint site background (see `.site-bg` in `src/styles.css`).

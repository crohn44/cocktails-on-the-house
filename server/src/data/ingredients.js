// Ingredients people can filter the rankings by, other than the base spirit (which has its own filter).
// Each drink is tagged automatically by matching `match` against the items in its classic recipe
// (variations don't count); `not` rules out false matches. Add an entry here to make a new
// ingredient filterable; no changes to cocktails.js are needed.

export const INGREDIENTS = [
  // Citrus & juice
  { name: "Lime", group: "Citrus & juice", match: /\blime\b/i, not: /lemon-lime/i },
  { name: "Lemon", group: "Citrus & juice", match: /\blemon\b/i, not: /lemon-lime/i },
  { name: "Orange juice", group: "Citrus & juice", match: /orange juice/i },
  { name: "Grapefruit", group: "Citrus & juice", match: /grapefruit/i },
  { name: "Pineapple", group: "Citrus & juice", match: /pineapple/i },
  { name: "Cranberry", group: "Citrus & juice", match: /cranberry/i },
  { name: "Passion fruit", group: "Citrus & juice", match: /passion fruit/i },
  { name: "Tomato", group: "Citrus & juice", match: /tomato/i },

  // Liqueurs & amari
  { name: "Orange liqueur", group: "Liqueurs & amari", match: /cointreau|triple sec|cura[cç]ao|grand marnier/i },
  { name: "Campari", group: "Liqueurs & amari", match: /campari/i },
  { name: "Aperol", group: "Liqueurs & amari", match: /aperol/i },
  { name: "Maraschino", group: "Liqueurs & amari", match: /maraschino/i },
  { name: "Coffee liqueur", group: "Liqueurs & amari", match: /coffee liqueur/i },
  { name: "Chartreuse", group: "Liqueurs & amari", match: /chartreuse/i },
  { name: "Bénédictine", group: "Liqueurs & amari", match: /b[eé]n[eé]dictine/i },
  { name: "Absinthe", group: "Liqueurs & amari", match: /absinthe|herbsaint|pernod/i },
  { name: "Crème de cassis", group: "Liqueurs & amari", match: /cassis/i },
  { name: "Crème de cacao", group: "Liqueurs & amari", match: /cr[eè]me de cacao/i },
  { name: "Crème de menthe", group: "Liqueurs & amari", match: /cr[eè]me de menthe/i },
  { name: "Cherry Heering", group: "Liqueurs & amari", match: /cherry heering/i },
  { name: "Elderflower", group: "Liqueurs & amari", match: /elderflower/i },
  { name: "Irish cream", group: "Liqueurs & amari", match: /irish cream/i },
  { name: "Fernet", group: "Liqueurs & amari", match: /fernet/i },
  { name: "Amaro", group: "Liqueurs & amari", match: /amaro|averna/i },
  { name: "Drambuie", group: "Liqueurs & amari", match: /drambuie/i },
  { name: "Galliano", group: "Liqueurs & amari", match: /galliano/i },
  { name: "Falernum", group: "Liqueurs & amari", match: /falernum/i },

  // Wine, vermouth & sparkling
  { name: "Sweet vermouth", group: "Wine, vermouth & bubbles", match: /sweet vermouth/i },
  { name: "Dry vermouth", group: "Wine, vermouth & bubbles", match: /dry vermouth/i },
  { name: "Blanc vermouth", group: "Wine, vermouth & bubbles", match: /blanc vermouth/i },
  { name: "Lillet", group: "Wine, vermouth & bubbles", match: /lillet|cocchi americano/i },
  { name: "Sherry", group: "Wine, vermouth & bubbles", match: /sherry/i },
  { name: "Champagne & prosecco", group: "Wine, vermouth & bubbles", match: /champagne|prosecco|sparkling wine/i },

  // Bitters
  { name: "Angostura bitters", group: "Bitters", match: /angostura/i },
  { name: "Peychaud's bitters", group: "Bitters", match: /peychaud/i },
  { name: "Orange bitters", group: "Bitters", match: /orange bitters/i },

  // Sweeteners & syrups
  { name: "Honey", group: "Sweeteners & syrups", match: /honey/i },
  { name: "Agave syrup", group: "Sweeteners & syrups", match: /agave syrup|agave nectar/i },
  { name: "Grenadine", group: "Sweeteners & syrups", match: /grenadine/i },
  { name: "Orgeat", group: "Sweeteners & syrups", match: /orgeat/i },

  // Mixers
  { name: "Soda water", group: "Mixers", match: /soda water|club soda/i },
  { name: "Tonic water", group: "Mixers", match: /tonic/i },
  { name: "Ginger beer", group: "Mixers", match: /ginger beer/i },
  { name: "Cola", group: "Mixers", match: /\bcola\b|coca-cola/i },
  { name: "Grapefruit soda", group: "Mixers", match: /grapefruit soda/i },
  { name: "Coffee & espresso", group: "Mixers", match: /espresso|brewed coffee|hot coffee/i },

  // Fresh, dairy & other
  { name: "Mint", group: "Fresh, dairy & other", match: /\bmint\b/i },
  { name: "Basil", group: "Fresh, dairy & other", match: /basil/i },
  { name: "Cucumber", group: "Fresh, dairy & other", match: /cucumber/i },
  { name: "Ginger", group: "Fresh, dairy & other", match: /ginger(?! beer| ale)/i },
  { name: "Egg white", group: "Fresh, dairy & other", match: /egg white/i },
  { name: "Cream", group: "Fresh, dairy & other", match: /heavy cream/i },
  { name: "Coconut", group: "Fresh, dairy & other", match: /coconut/i },
  { name: "Worcestershire & hot sauce", group: "Fresh, dairy & other", match: /worcestershire|hot sauce/i },
];

/** Names of the filterable ingredients in a recipe's ingredient list. */
export function ingredientTags(ingredients) {
  const items = ingredients.map((i) => i.item);
  return INGREDIENTS.filter((ing) => items.some((item) => ing.match.test(item) && !ing.not?.test(item))).map(
    (ing) => ing.name
  );
}

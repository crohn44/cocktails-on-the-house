// The "What can I make?" page. Users tick what's in their bar from PANTRY, and a recipe counts as
// makeable when every line of it is covered. Each ingredient line in a recipe becomes a requirement:
//
//   - lines matching STAPLES (sugar, simple syrup, ice, water, salt...) are assumed to be on hand;
//   - lines marked optional or "to garnish", or listing garnishes, are skipped;
//   - "A or B" lines are satisfied by either (e.g. "Bourbon or rye whiskey");
//   - other lines need every pantry item they mention (e.g. "Vodka, gin, white rum" needs all three).
//
// Text in parentheses is ignored, so "Gin (London dry or Old Tom)" just needs gin. OVERRIDES handles
// the few lines the rules get wrong. The tests check that every recipe line is understood, so adding
// a drink with a new ingredient means adding a PANTRY entry for it.

export const PANTRY = [
  // Spirits
  { id: "gin", name: "Gin", group: "Spirits", match: /\bgin\b/i },
  { id: "vodka", name: "Vodka", group: "Spirits", match: /vodka/i },
  { id: "white-rum", name: "White rum", group: "Spirits", match: /(white|light) rum/i },
  { id: "dark-rum", name: "Aged or dark rum", group: "Spirits", match: /(aged|dark|gold|jamaican|demerara|151-proof) .*rum|aged rum|jamaican rum/i, not: /aged white rum/i },
  { id: "rhum-agricole", name: "Rhum agricole", group: "Spirits", match: /agricole/i },
  { id: "tequila", name: "Tequila", group: "Spirits", match: /tequila/i },
  { id: "mezcal", name: "Mezcal", group: "Spirits", match: /mezcal/i },
  { id: "bourbon", name: "Bourbon", group: "Spirits", match: /bourbon/i },
  { id: "rye", name: "Rye whiskey", group: "Spirits", match: /\brye\b/i },
  { id: "scotch", name: "Scotch", group: "Spirits", match: /scotch|islay/i },
  { id: "irish-whiskey", name: "Irish whiskey", group: "Spirits", match: /irish whiskey/i },
  { id: "japanese-whisky", name: "Japanese whisky", group: "Spirits", match: /japanese whisky/i },
  { id: "brandy", name: "Cognac or brandy", group: "Spirits", match: /cognac|\bbrandy\b/i, not: /apple brandy|peach brandy/i },
  { id: "applejack", name: "Applejack or apple brandy", group: "Spirits", match: /applejack|apple brandy/i },
  { id: "pisco", name: "Pisco", group: "Spirits", match: /pisco/i },
  { id: "cachaca", name: "Cachaça", group: "Spirits", match: /cacha[cç]a/i },

  // Liqueurs & amari
  { id: "orange-liqueur", name: "Orange liqueur (Cointreau, triple sec, curaçao)", group: "Liqueurs & amari", match: /cointreau|triple sec|cura[cç]ao|grand marnier/i },
  { id: "campari", name: "Campari", group: "Liqueurs & amari", match: /campari/i },
  { id: "aperol", name: "Aperol", group: "Liqueurs & amari", match: /aperol/i },
  { id: "select", name: "Select Aperitivo", group: "Liqueurs & amari", match: /select aperitivo/i },
  { id: "suze", name: "Suze", group: "Liqueurs & amari", match: /suze/i },
  { id: "maraschino", name: "Maraschino liqueur", group: "Liqueurs & amari", match: /maraschino liqueur/i },
  { id: "coffee-liqueur", name: "Coffee liqueur", group: "Liqueurs & amari", match: /coffee liqueur/i },
  { id: "green-chartreuse", name: "Green Chartreuse", group: "Liqueurs & amari", match: /green chartreuse/i },
  { id: "yellow-chartreuse", name: "Yellow Chartreuse", group: "Liqueurs & amari", match: /yellow chartreuse/i },
  { id: "benedictine", name: "Bénédictine", group: "Liqueurs & amari", match: /b[eé]n[eé]dictine/i },
  { id: "absinthe", name: "Absinthe (or Herbsaint, Pernod)", group: "Liqueurs & amari", match: /absinthe|herbsaint|pernod/i },
  { id: "cassis", name: "Crème de cassis", group: "Liqueurs & amari", match: /cassis/i },
  { id: "cacao", name: "Crème de cacao", group: "Liqueurs & amari", match: /cr[eè]me de cacao/i },
  { id: "menthe", name: "Crème de menthe", group: "Liqueurs & amari", match: /cr[eè]me de menthe/i },
  { id: "violette", name: "Crème de violette", group: "Liqueurs & amari", match: /violette/i },
  { id: "blackberry-liqueur", name: "Blackberry liqueur (crème de mûre)", group: "Liqueurs & amari", match: /m[uû]re|blackberry liqueur/i },
  { id: "cherry-heering", name: "Cherry Heering", group: "Liqueurs & amari", match: /cherry heering/i },
  { id: "elderflower", name: "Elderflower liqueur", group: "Liqueurs & amari", match: /elderflower/i },
  { id: "irish-cream", name: "Irish cream", group: "Liqueurs & amari", match: /irish cream/i },
  { id: "fernet", name: "Fernet-Branca", group: "Liqueurs & amari", match: /fernet/i },
  { id: "amaro", name: "Amaro (Averna, Nonino)", group: "Liqueurs & amari", match: /amaro|averna/i },
  { id: "amaretto", name: "Amaretto", group: "Liqueurs & amari", match: /amaretto/i },
  { id: "drambuie", name: "Drambuie", group: "Liqueurs & amari", match: /drambuie/i },
  { id: "galliano", name: "Galliano", group: "Liqueurs & amari", match: /galliano/i },
  { id: "falernum", name: "Falernum", group: "Liqueurs & amari", match: /falernum/i },
  { id: "licor-43", name: "Licor 43", group: "Liqueurs & amari", match: /licor 43/i },
  { id: "limoncello", name: "Limoncello", group: "Liqueurs & amari", match: /limoncello/i },
  { id: "midori", name: "Midori", group: "Liqueurs & amari", match: /midori/i },
  { id: "banana-liqueur", name: "Banana liqueur", group: "Liqueurs & amari", match: /banana liqueur/i },
  { id: "passion-fruit-liqueur", name: "Passion fruit liqueur", group: "Liqueurs & amari", match: /passion fruit liqueur/i },
  { id: "sour-apple", name: "Sour apple liqueur", group: "Liqueurs & amari", match: /sour apple/i },
  { id: "peach-schnapps", name: "Peach schnapps", group: "Liqueurs & amari", match: /peach schnapps/i },
  { id: "peach-brandy", name: "Peach brandy", group: "Liqueurs & amari", match: /peach brandy/i },
  { id: "pimms", name: "Pimm's No. 1", group: "Liqueurs & amari", match: /pimm/i },

  // Wine, vermouth & bubbles
  { id: "sweet-vermouth", name: "Sweet vermouth", group: "Wine, vermouth & bubbles", match: /sweet vermouth/i },
  { id: "dry-vermouth", name: "Dry vermouth", group: "Wine, vermouth & bubbles", match: /dry vermouth/i },
  { id: "blanc-vermouth", name: "Blanc vermouth", group: "Wine, vermouth & bubbles", match: /blanc vermouth/i },
  { id: "lillet", name: "Lillet Blanc", group: "Wine, vermouth & bubbles", match: /lillet|cocchi americano/i },
  { id: "sherry", name: "Sherry", group: "Wine, vermouth & bubbles", match: /sherry/i },
  { id: "sparkling", name: "Champagne or prosecco", group: "Wine, vermouth & bubbles", match: /champagne|prosecco|sparkling wine/i },
  { id: "red-wine", name: "Dry red wine", group: "Wine, vermouth & bubbles", match: /red wine/i },

  // Bitters
  { id: "angostura", name: "Angostura bitters", group: "Bitters", match: /angostura/i },
  { id: "peychauds", name: "Peychaud's bitters", group: "Bitters", match: /peychaud/i },
  { id: "orange-bitters", name: "Orange bitters", group: "Bitters", match: /orange bitters/i },

  // Juice & fruit
  { id: "lime", name: "Limes", group: "Juice & fruit", match: /\blime\b/i, not: /lemon-lime/i },
  { id: "lemon", name: "Lemons", group: "Juice & fruit", match: /\blemon\b|sour mix/i, not: /lemon-lime/i },
  { id: "orange", name: "Oranges or orange juice", group: "Juice & fruit", match: /orange juice|orange slice|^orange$/i },
  { id: "grapefruit", name: "Grapefruit juice", group: "Juice & fruit", match: /grapefruit(?! soda)/i },
  { id: "pineapple", name: "Pineapple juice", group: "Juice & fruit", match: /pineapple/i },
  { id: "cranberry", name: "Cranberry juice", group: "Juice & fruit", match: /cranberry/i },
  { id: "passion-fruit", name: "Passion fruit", group: "Juice & fruit", match: /passion fruit/i, not: /liqueur/i },
  { id: "tomato", name: "Tomato juice", group: "Juice & fruit", match: /tomato juice/i },
  { id: "clamato", name: "Clamato", group: "Juice & fruit", match: /clamato/i },
  { id: "mandarin", name: "Mandarins", group: "Juice & fruit", match: /mandarin/i },
  { id: "peach", name: "White peach purée", group: "Juice & fruit", match: /peach pur[eé]e/i },
  { id: "strawberries", name: "Strawberries", group: "Juice & fruit", match: /strawberr/i },
  { id: "raspberries", name: "Raspberries", group: "Juice & fruit", match: /raspberries/i },
  { id: "banana", name: "Bananas", group: "Juice & fruit", match: /banana/i, not: /liqueur/i },
  { id: "cherries", name: "Cocktail cherries", group: "Juice & fruit", match: /maraschino cherry/i },

  // Syrups & sweeteners (plain sugar and simple syrup are staples)
  { id: "honey", name: "Honey", group: "Syrups & sweeteners", match: /honey/i },
  { id: "agave", name: "Agave syrup", group: "Syrups & sweeteners", match: /agave syrup/i },
  { id: "grenadine", name: "Grenadine", group: "Syrups & sweeteners", match: /grenadine/i },
  { id: "orgeat", name: "Orgeat", group: "Syrups & sweeteners", match: /orgeat/i },
  { id: "raspberry-syrup", name: "Raspberry syrup", group: "Syrups & sweeteners", match: /raspberry syrup/i },
  { id: "vanilla-syrup", name: "Vanilla syrup", group: "Syrups & sweeteners", match: /vanilla syrup/i },
  { id: "caramel-syrup", name: "Caramel syrup", group: "Syrups & sweeteners", match: /caramel syrup/i },
  { id: "cream-of-coconut", name: "Cream of coconut", group: "Syrups & sweeteners", match: /cream of coconut/i },

  // Mixers
  { id: "soda-water", name: "Soda water", group: "Mixers", match: /soda water|club soda/i },
  { id: "tonic", name: "Tonic water", group: "Mixers", match: /tonic/i },
  { id: "ginger-beer", name: "Ginger beer", group: "Mixers", match: /ginger beer/i },
  { id: "ginger-ale", name: "Ginger ale", group: "Mixers", match: /ginger ale/i },
  { id: "cola", name: "Cola", group: "Mixers", match: /\bcola\b/i },
  { id: "lemon-lime-soda", name: "Lemon-lime soda", group: "Mixers", match: /lemon-lime soda/i },
  { id: "grapefruit-soda", name: "Grapefruit soda", group: "Mixers", match: /grapefruit soda/i },
  { id: "coffee", name: "Coffee or espresso", group: "Mixers", match: /espresso|brewed coffee|hot coffee/i },

  // Fresh, dairy & other
  { id: "mint", name: "Fresh mint", group: "Fresh, dairy & other", match: /\bmint\b/i },
  { id: "basil", name: "Fresh basil", group: "Fresh, dairy & other", match: /basil/i },
  { id: "cucumber", name: "Cucumber", group: "Fresh, dairy & other", match: /cucumber/i },
  { id: "ginger", name: "Fresh ginger", group: "Fresh, dairy & other", match: /ginger(?! beer| ale)/i },
  { id: "jalapeno", name: "Jalapeños", group: "Fresh, dairy & other", match: /jalape[nñ]o/i },
  { id: "eggs", name: "Eggs", group: "Fresh, dairy & other", match: /egg white/i },
  { id: "cream", name: "Heavy cream", group: "Fresh, dairy & other", match: /heavy cream|whipped cream/i },
  { id: "olives", name: "Olives", group: "Fresh, dairy & other", match: /olive/i },
  { id: "onions", name: "Cocktail onions", group: "Fresh, dairy & other", match: /cocktail onion/i },
  { id: "cinnamon", name: "Cinnamon", group: "Fresh, dairy & other", match: /cinnamon/i },
  { id: "hot-sauce", name: "Hot sauce", group: "Fresh, dairy & other", match: /hot sauce/i },
  { id: "worcestershire", name: "Worcestershire sauce", group: "Fresh, dairy & other", match: /worcestershire/i },
  { id: "horseradish", name: "Horseradish", group: "Fresh, dairy & other", match: /horseradish/i },
  { id: "orange-flower-water", name: "Orange flower water", group: "Fresh, dairy & other", match: /orange flower water/i },
  { id: "wood-chips", name: "Wood chips for smoking", group: "Fresh, dairy & other", match: /wood chips/i },
];

// Assumed to be in every kitchen, so they never stop a recipe from showing.
export const STAPLES = ["Sugar and simple syrup", "Ice", "Water", "Salt and pepper"];
const STAPLE_LINE =
  /^(rich )?simple syrup|^(brown |superfine )?sugar|sugar cube|demerara syrup|cane syrup|^(crushed )?ice$|^ice\b|^(hot )?water$|salt\b|pepper$/i;

// Lines the general rules get wrong, mapped straight to their requirements (each inner array is
// one requirement that any of its items satisfies).
const OVERRIDES = {
  "White or gold rum": [["white-rum", "dark-rum"]],
  "Donn's Mix (2 parts grapefruit juice to 1 part cinnamon syrup)": [["grapefruit"], ["cinnamon"]],
};

const matches = (text) => PANTRY.filter((p) => p.match.test(text) && !p.not?.test(text)).map((p) => p.id);

/**
 * Turns a recipe's ingredient list into requirements: an array of alternatives arrays, where each
 * requirement is met by having any one of its pantry ids. Lines nobody could parse come back in
 * `unknown` (the tests fail if there are any).
 */
export function recipeNeeds(ingredients) {
  const needs = [];
  const unknown = [];
  for (const { amount = "", item } of ingredients) {
    if (/optional/i.test(`${amount} ${item}`) || /^garnish|to garnish/i.test(item)) continue;
    if (OVERRIDES[item]) {
      needs.push(...OVERRIDES[item]);
      continue;
    }
    const text = item.replace(/\([^)]*\)/g, "").trim();
    const parts = text.split(/\s+or\s+/i);
    if (parts.length > 1) {
      // Either alternative will do; a staple alternative means it's always covered.
      if (parts.some((part) => STAPLE_LINE.test(part.trim()) && !matches(part).length)) continue;
      const ids = [...new Set(parts.flatMap(matches))];
      if (ids.length) needs.push(ids);
      else unknown.push(item);
      continue;
    }
    const ids = matches(text);
    if (ids.length) ids.forEach((id) => needs.push([id]));
    else if (!STAPLE_LINE.test(text)) unknown.push(item);
  }
  // The same need can come from several lines (e.g. a drink with three dark rums).
  const unique = [...new Map(needs.map((ids) => [[...ids].sort().join("|"), ids])).values()];
  return { needs: unique, unknown };
}

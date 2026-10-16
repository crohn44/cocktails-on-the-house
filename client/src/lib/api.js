async function request(method, path, body) {
  const res = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  me: () => request("GET", "/api/auth/me"),
  register: (email, displayName, password) => request("POST", "/api/auth/register", { email, displayName, password }),
  login: (email, password) => request("POST", "/api/auth/login", { email, password }),
  logout: () => request("POST", "/api/auth/logout"),

  cocktails: (params = {}) => {
    // Array values (e.g. several ingredients) become repeated parameters.
    const qs = new URLSearchParams(
      Object.entries(params).flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => [k, x]) : v ? [[k, v]] : []))
    ).toString();
    return request("GET", `/api/cocktails${qs ? `?${qs}` : ""}`);
  },
  cocktail: (slug) => request("GET", `/api/cocktails/${encodeURIComponent(slug)}`),
  rate: (slug, stars, review) => request("PUT", `/api/cocktails/${encodeURIComponent(slug)}/rating`, { stars, review }),
  unrate: (slug) => request("DELETE", `/api/cocktails/${encodeURIComponent(slug)}/rating`),
  rateVariation: (slug, variation, stars) =>
    request("PUT", `/api/cocktails/${encodeURIComponent(slug)}/variations/${encodeURIComponent(variation)}/rating`, { stars }),
  unrateVariation: (slug, variation) =>
    request("DELETE", `/api/cocktails/${encodeURIComponent(slug)}/variations/${encodeURIComponent(variation)}/rating`),
  pantry: () => request("GET", "/api/pantry"),
  myRatings: () => request("GET", "/api/me/ratings"),
};

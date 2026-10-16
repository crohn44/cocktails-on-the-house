// A minimal client-side router (history API). Keeps the app dependency-free.
// Swap for react-router later if the app grows; the API below is similar.
import { createContext, useContext, useEffect, useState } from "react";

const RouterContext = createContext(null);

export function Router({ children }) {
  const [location, setLocation] = useState(() => ({
    pathname: window.location.pathname,
    search: window.location.search,
  }));

  useEffect(() => {
    const onPop = () => setLocation({ pathname: window.location.pathname, search: window.location.search });
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = (to, { replace = false, scroll = true } = {}) => {
    const url = new URL(to, window.location.origin);
    window.history[replace ? "replaceState" : "pushState"]({}, "", url);
    setLocation({ pathname: url.pathname, search: url.search });
    if (scroll) window.scrollTo(0, 0);
  };

  return <RouterContext.Provider value={{ location, navigate }}>{children}</RouterContext.Provider>;
}

export const useLocation = () => useContext(RouterContext).location;
export const useNavigate = () => useContext(RouterContext).navigate;
export const useSearchParams = () => new URLSearchParams(useLocation().search);

/** Returns params if `pattern` (e.g. "/drinks/:slug") matches the path, else null. */
export function matchPath(pattern, pathname) {
  const keys = [];
  const re = new RegExp(
    "^" + pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), "([^/]+)")) + "/?$"
  );
  const m = pathname.match(re);
  if (!m) return null;
  return Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
}

/** Renders the first route whose path matches. routes = [{ path, element: (params) => JSX }] */
export function Routes({ routes, fallback }) {
  const { pathname } = useLocation();
  for (const r of routes) {
    const params = matchPath(r.path, pathname);
    if (params) return r.element(params);
  }
  return fallback;
}

export function Link({ to, children, onClick, ...rest }) {
  const navigate = useNavigate();
  return (
    <a
      href={to}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

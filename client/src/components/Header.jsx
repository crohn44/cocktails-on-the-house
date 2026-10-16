import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "../lib/router.jsx";
import { useAuth } from "../lib/auth.jsx";

export default function Header() {
  const { user, logout } = useAuth();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const next = encodeURIComponent(pathname + search);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="brand">
          <svg viewBox="0 0 64 64" width="30" height="30" aria-hidden="true">
            <path d="M12 14h40L32 36z" fill="#c41e3a" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
            <path d="M32 36v14M22 51h20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <circle cx="46" cy="13" r="5" fill="currentColor" />
          </svg>
          <span>
            Cocktails <em>on the</em> House
          </span>
        </Link>
        <HeaderSearch />
        <nav className="nav">
          <Link to="/" className={`nav-home ${pathname === "/" ? "active" : ""}`}>
            Home
          </Link>
          <Link to="/rankings" className={pathname === "/rankings" ? "active" : ""}>
            Rankings
          </Link>
          <Link to="/my-bar" className={`nav-bar ${pathname === "/my-bar" ? "active" : ""}`}>
            My bar
          </Link>
          {user ? (
            <>
              <Link to="/me" className={pathname === "/me" ? "active" : ""}>
                My ratings
              </Link>
              <span className="nav-user" title={user.email}>
                {user.displayName}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={async () => {
                  await logout();
                  if (pathname === "/me") navigate("/");
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to={`/login?next=${next}`} className="nav-signin">
                Sign in
              </Link>
              <Link to={`/register?next=${next}`} className="btn btn-primary btn-sm">
                Join
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

/** Search lives in the header; it filters the Rankings page through the ?q= URL parameter. */
function HeaderSearch() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const onRankings = pathname === "/rankings";
  const urlQ = onRankings ? new URLSearchParams(search).get("q") ?? "" : "";
  const [value, setValue] = useState(urlQ);

  // Follow the URL (back/forward, leaving the Rankings page).
  useEffect(() => setValue(urlQ), [urlQ]);

  const go = (q) => {
    const params = new URLSearchParams(onRankings ? search : "");
    if (q.trim()) params.set("q", q);
    else params.delete("q");
    const qs = params.toString();
    navigate(`/rankings${qs ? `?${qs}` : ""}`, { replace: onRankings, scroll: !onRankings });
  };

  return (
    <form
      className="header-search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        go(value);
      }}
    >
      <input
        type="search"
        className="input"
        placeholder="Search cocktails…"
        aria-label="Search cocktails"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          go(e.target.value);
        }}
      />
    </form>
  );
}

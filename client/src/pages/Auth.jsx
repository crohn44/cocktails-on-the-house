import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth.jsx";
import { Link, useNavigate, useSearchParams } from "../lib/router.jsx";

/** Sign-in and registration share one component; `mode` is "login" or "register". */
export default function Auth({ mode }) {
  const { login, register, user } = useAuth();
  const navigate = useNavigate();
  const params = useSearchParams();
  const rawNext = params.get("next") || "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  const isRegister = mode === "register";

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = `${isRegister ? "Create account" : "Sign in"} · Cocktails on the House`;
    setError(null);
  }, [isRegister]);

  useEffect(() => {
    if (user) goNext();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  function goNext() {
    navigate(next, { replace: true });
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (isRegister) await register(email, displayName, password);
      else await login(email, password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  const other = isRegister ? "/login" : "/register";
  return (
    <div className="container auth-wrap">
      <form className="card auth" onSubmit={submit}>
        <h1>{isRegister ? "Join the bar" : "Welcome back"}</h1>
        <p className="muted">
          {isRegister ? "Create an account to rate and review cocktails." : "Sign in to rate and review cocktails."}
        </p>

        <label className="field">
          <span>Email</span>
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {isRegister && (
          <label className="field">
            <span>Display name</span>
            <input
              className="input"
              autoComplete="nickname"
              required
              minLength={2}
              maxLength={40}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <span className="muted small">Shown next to your reviews.</span>
          </label>
        )}
        <label className="field">
          <span>Password</span>
          <input
            className="input"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            required
            minLength={isRegister ? 8 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {isRegister && <span className="muted small">At least 8 characters.</span>}
        </label>

        {error && <p className="alert">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "One moment…" : isRegister ? "Create account" : "Sign in"}
        </button>
        <p className="muted small center">
          {isRegister ? "Already have an account? " : "New here? "}
          <Link to={`${other}?next=${encodeURIComponent(next)}`}>{isRegister ? "Sign in" : "Create an account"}</Link>
        </p>
      </form>
    </div>
  );
}

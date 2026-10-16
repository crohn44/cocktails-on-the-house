import { Link } from "../lib/router.jsx";

export default function NotFound() {
  return (
    <div className="container page center">
      <h1>We're fresh out of that one.</h1>
      <p className="muted">The page you're looking for isn't on the menu.</p>
      <Link className="btn btn-primary" to="/rankings">
        Back to the rankings
      </Link>
    </div>
  );
}

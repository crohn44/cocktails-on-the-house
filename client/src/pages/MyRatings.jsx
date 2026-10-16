import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { Link, useNavigate } from "../lib/router.jsx";
import CocktailArt from "../components/CocktailArt.jsx";
import { Stars } from "../components/Stars.jsx";

export default function MyRatings() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [ratings, setRatings] = useState(null);

  useEffect(() => {
    document.title = "My ratings · Cocktails on the House";
    if (loading) return;
    if (!user) return navigate("/login?next=/me", { replace: true });
    api.myRatings().then((d) => setRatings(d.ratings));
  }, [user, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="container page">
      <h1>My ratings</h1>
      {ratings && ratings.length === 0 && (
        <p className="empty">
          You haven't rated anything yet. <Link to="/rankings">Browse the rankings</Link> and pick a favorite.
        </p>
      )}
      <ul className="my-ratings">
        {ratings?.map((r) => (
          <li key={r.slug}>
            <Link to={`/drinks/${r.slug}`} className="card my-rating">
              <CocktailArt cocktail={r} size="sm" />
              <span>
                <strong>{r.name}</strong>
                <Stars value={r.stars} size={16} />
                {r.review && <span className="muted block clamp">{r.review}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

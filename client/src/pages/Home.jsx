import { useEffect } from "react";
import { Link } from "../lib/router.jsx";

export default function Home() {
  useEffect(() => {
    document.title = "Cocktails on the House · The best cocktails, ranked by you";
  }, []);

  return (
    <section className="hero hero-home">
      <div className="container">
        <p className="eyebrow">The people's bar menu</p>
        <h1>
          The best cocktails,
          <br />
          <em>ranked by the people who drink them.</em>
        </h1>
        <p className="lede">
          Cocktails on the House is a community-ranked bar menu. Rate any drink out of five stars, leave a review if you
          like, and watch every rating move the list. No critics, no sponsors, just what people actually enjoy.
        </p>
        <div className="hero-actions">
          <Link to="/rankings" className="btn btn-primary">
            See the rankings →
          </Link>
          <Link to="/my-bar" className="btn btn-ghost">
            What can I make?
          </Link>
        </div>

        <ul className="how-it-works">
          <li>
            <strong>Browse</strong>
            <span className="muted">Search and filter the full menu by spirit, rating, or name.</span>
          </li>
          <li>
            <strong>Rate</strong>
            <span className="muted">Sign up, give a drink one to five stars, and add a review.</span>
          </li>
          <li>
            <strong>Rank</strong>
            <span className="muted">A weighted average keeps the list fair, so one lucky vote can't top it.</span>
          </li>
        </ul>
      </div>
    </section>
  );
}

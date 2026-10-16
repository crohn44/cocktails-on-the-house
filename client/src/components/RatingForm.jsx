import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { StarInput } from "./Stars.jsx";

const MAX = 2000;

export default function RatingForm({ slug, existing, onSaved }) {
  const [stars, setStars] = useState(existing?.stars ?? 0);
  const [review, setReview] = useState(existing?.review ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    setStars(existing?.stars ?? 0);
    setReview(existing?.review ?? "");
  }, [existing?.stars, existing?.review]);

  const dirty = stars !== (existing?.stars ?? 0) || review.trim() !== (existing?.review ?? "");

  async function save(e) {
    e.preventDefault();
    if (!stars) return setError("Pick a star rating first.");
    setBusy(true);
    setError(null);
    try {
      await api.rate(slug, stars, review);
      await onSaved();
      setNotice(existing ? "Rating updated." : "Thanks! Your rating is in.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Remove your rating and review for this drink?")) return;
    setBusy(true);
    setError(null);
    try {
      await api.unrate(slug);
      await onSaved();
      setStars(0);
      setReview("");
      setNotice("Your rating was removed.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="rating-form" onSubmit={save}>
      <h3>{existing ? "Your rating" : "Rate this drink"}</h3>
      <StarInput value={stars} onChange={(n) => (setStars(n), setNotice(null))} />
      <label className="field">
        <span>
          Review <span className="muted">(optional)</span>
        </span>
        <textarea
          className="input"
          rows={4}
          maxLength={MAX}
          placeholder="How did you make it? What did you love (or not)?"
          value={review}
          onChange={(e) => (setReview(e.target.value), setNotice(null))}
        />
        <span className="muted small counter">
          {review.length}/{MAX}
        </span>
      </label>
      {error && <p className="alert">{error}</p>}
      {notice && !dirty && <p className="success">{notice}</p>}
      <div className="row">
        <button className="btn btn-primary" disabled={busy || !stars || (existing && !dirty)}>
          {busy ? "Saving…" : existing ? "Update rating" : "Submit rating"}
        </button>
        {existing && (
          <button type="button" className="btn btn-ghost" onClick={remove} disabled={busy}>
            Remove
          </button>
        )}
      </div>
    </form>
  );
}

import { useEffect, useRef, useState } from "react";

/**
 * "Ingredients" button that opens a panel of grouped checkboxes. Counts show how many of the
 * current results contain each ingredient; picking several narrows to drinks with all of them.
 */
export default function IngredientFilter({ options = [], selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [find, setFind] = useState("");
  const wrap = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => !wrap.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = (name) =>
    onChange(selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name]);

  const term = find.trim().toLowerCase();
  const groups = [];
  for (const opt of options) {
    if (term && !opt.name.toLowerCase().includes(term)) continue;
    let g = groups.find((x) => x.name === opt.group);
    if (!g) groups.push((g = { name: opt.group, items: [] }));
    g.items.push(opt);
  }

  return (
    <div className="ing-filter sort" ref={wrap}>
      <span id="ing-filter-label">Ingredients</span>
      <button
        type="button"
        className={`input ing-toggle ${selected.length ? "on" : ""}`}
        aria-labelledby="ing-filter-label ing-filter-value"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
      >
        <span id="ing-filter-value">{selected.length ? `${selected.length} ingredient${selected.length === 1 ? "" : "s"}` : "Any ingredient"}</span>
      </button>
      {open && (
        <div className="ing-panel" role="dialog" aria-label="Filter by ingredient">
          <div className="ing-panel-head">
            <input
              type="search"
              className="input"
              placeholder="Find an ingredient…"
              aria-label="Find an ingredient"
              value={find}
              onChange={(e) => setFind(e.target.value)}
              autoFocus={window.matchMedia("(pointer: fine)").matches} // don't pop up a phone keyboard
            />
            {selected.length > 0 && (
              <button type="button" className="link-btn small" onClick={() => onChange([])}>
                Clear all
              </button>
            )}
          </div>
          <p className="muted small ing-hint">Shows drinks that contain every ingredient you pick.</p>
          <div className="ing-groups">
            {groups.map((g) => (
              <fieldset key={g.name}>
                <legend>{g.name}</legend>
                {g.items.map((i) => {
                  const checked = selected.includes(i.name);
                  const disabled = !checked && i.count === 0;
                  return (
                    <label key={i.name} className={`ing-option ${disabled ? "disabled" : ""}`}>
                      <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggle(i.name)} />
                      <span>{i.name}</span>
                      <span className="ing-count">{i.count}</span>
                    </label>
                  );
                })}
              </fieldset>
            ))}
            {groups.length === 0 && <p className="muted small">No ingredients match “{find}”.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

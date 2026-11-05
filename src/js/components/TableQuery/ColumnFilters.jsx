import React, { useEffect, useId, useRef, useState } from "react";
import { isCivilDate, normalizeAmount } from "../../utils/tableQuery";

/** Choix unique ; la première option « Tous » retire le filtre. */
export const SelectFilter = ({
  label,
  value,
  options,
  onChange,
  allLabel = "Tous",
  disabled = false,
}) => {
  const id = useId();
  return (
    <div className="column-filter">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

const RANGE_ERRORS = {
  date: "Saisissez des dates valides, le début avant la fin.",
  amount: "Saisissez des montants positifs, le minimum sous le maximum.",
};

/**
 * Deux bornes inclusives. Une date s'applique dès qu'elle est complète ; un
 * montant au départ du champ ou sur Entrée, pour ne pas lancer une requête à
 * chaque chiffre. Une saisie invalide n'est pas appliquée et l'erreur est
 * reliée aux deux champs.
 */
const civil = (value) => value.split("-").reverse().join("/");
const decimal = (value) => value.replace(".", ",");

/** Résumé affiché sur le bouton d'une plage compacte. */
export const rangeSummary = (kind, from, to) => {
  const show = kind === "date" ? civil : decimal;
  if (from && to) return `${show(from)} – ${show(to)}`;
  if (from) return kind === "date" ? `Dès le ${show(from)}` : `≥ ${show(from)}`;
  if (to) return kind === "date" ? `Jusqu’au ${show(to)}` : `≤ ${show(to)}`;
  return kind === "date" ? "Toutes" : "Tous";
};

/**
 * Dans un en-tête, une plage tient sur un bouton de la taille des autres
 * filtres ; ses deux champs s'ouvrent dans une petite fenêtre. Échap ou un
 * clic à l'extérieur la ferment ; Échap rend le focus au bouton.
 */
const CompactRange = ({ label, kind, from, to, disabled, children }) => {
  const [open, setOpen] = useState(false);
  const root = useRef(null),
    button = useRef(null),
    popup = useRef(null);
  const id = useId();
  useEffect(() => {
    if (!open) return undefined;
    popup.current?.querySelector("input")?.focus();
    const outside = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);
  const summary = rangeSummary(kind, from, to);
  return (
    <div
      ref={root}
      className="column-filter column-filter--compact"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          button.current?.focus();
        }
      }}
      onBlur={(event) => {
        if (open && !root.current?.contains(event.relatedTarget))
          setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        className="column-filter__summary"
        aria-expanded={open}
        aria-controls={`${id}-popup`}
        aria-label={`${label} : ${summary}`}
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        <span>{summary}</span>
        <span className="column-filter__caret" aria-hidden="true" />
      </button>
      <div
        ref={popup}
        id={`${id}-popup`}
        className="column-filter__popup"
        hidden={!open}
      >
        {children}
      </div>
    </div>
  );
};

export const RangeFilter = ({ compact = false, ...props }) =>
  compact ? (
    <CompactRange {...props}>
      <RangeFields {...props} />
    </CompactRange>
  ) : (
    <RangeFields {...props} />
  );

const RangeFields = ({ label, kind, from, to, onChange, disabled = false }) => {
  const id = useId();
  const [draft, setDraft] = useState({ from, to });
  const [error, setError] = useState("");
  useEffect(() => {
    setDraft({ from, to });
    setError("");
  }, [from, to]);
  const normalize = (value) =>
    value === ""
      ? ""
      : kind === "amount"
      ? normalizeAmount(value)
      : isCivilDate(value)
      ? value
      : null;
  const apply = (next) => {
    const a = normalize(next.from),
      b = normalize(next.to);
    const reversed =
      a &&
      b &&
      (kind === "amount" ? Number(a) > Number(b) : String(a) > String(b));
    if (a === null || b === null || reversed) {
      setError(RANGE_ERRORS[kind]);
      return;
    }
    setError("");
    if (a !== from || b !== to) onChange({ from: a, to: b });
  };
  const field = (bound, text) => (
    <div className="column-filter__bound">
      <label htmlFor={`${id}-${bound}`}>
        <span className="column-filter__hidden">{label} </span>
        {text}
      </label>
      <input
        id={`${id}-${bound}`}
        type={kind === "date" ? "date" : "text"}
        inputMode={kind === "amount" ? "decimal" : undefined}
        autoComplete="off"
        value={draft[bound]}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => {
          const next = { ...draft, [bound]: event.target.value };
          setDraft(next);
          if (kind === "date") apply(next);
        }}
        onBlur={() => kind === "amount" && apply(draft)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && kind === "amount") {
            event.preventDefault();
            apply(draft);
          }
        }}
      />
    </div>
  );
  return (
    <fieldset className="column-filter column-filter--range">
      <legend>{label}</legend>
      <div className="column-filter__bounds">
        {field("from", kind === "date" ? "du" : "min")}
        {field("to", kind === "date" ? "au" : "max")}
      </div>
      {error && (
        <p id={`${id}-error`} className="column-filter__error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
};

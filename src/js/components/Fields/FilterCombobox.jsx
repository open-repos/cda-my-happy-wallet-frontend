import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useAnchoredPopup } from "../../hooks/useAnchoredPopup";
import { usePaginatedOptions } from "../../hooks/usePaginatedOptions";
import { highlightMatch } from "../../utils/filterOptions";
import "../../../css/FilterCombobox.css";

const sameValue = (a, b) => String(a.value) === String(b.value);
const values = (count) => `${count} valeur${count > 1 ? "s" : ""}`;
const chosen = (count) =>
  count === 0
    ? "aucune valeur choisie"
    : `${count} valeur${count > 1 ? "s choisies" : " choisie"}`;
/** Distance to the bottom (px) at which the next page is requested. */
const LOAD_MORE_THRESHOLD = 48;

const Highlighted = ({ label, query }) => {
  const parts = highlightMatch(label, query);
  if (!parts) return label;
  return (
    <>
      {parts[0]}
      <mark>{parts[1]}</mark>
      {parts[2]}
    </>
  );
};

/** Editable combobox with paginated suggestions (#360).
 *
 * `loadOptions({query, cursor, limit, signal})` returns the API envelope
 * `{data: [{value, label}], meta: {hasNext, nextCursor}}`. Only values from the
 * list are applied: free text only searches, unless `freeText` (single choice)
 * applies the typed text itself (#377). `value` is an option or `null`,
 * or an array of options with `multiple`. See docs/web-filter-combobox.md. */
export const FilterCombobox = ({
  id,
  label,
  hideLabel = false,
  placeholder = "Rechercher…",
  value,
  onChange,
  loadOptions,
  multiple = false,
  freeText = false,
  maxLength,
  pageSize = 10,
  debounceMs = 250,
  disabled = false,
  className = "",
}) => {
  const generated = useId().replace(/:/g, "");
  const inputId = id || `filter-${generated}`;
  const listId = `${inputId}-list`;
  const summaryId = `${inputId}-summary`;
  const optionId = (index) => `${listId}-option-${index}`;
  const root = useRef(null),
    anchor = useRef(null),
    input = useRef(null),
    popup = useRef(null);
  const selected = multiple ? value ?? [] : value ? [value] : [];
  const valueLabel = multiple ? "" : value?.label ?? "";
  const [text, setText] = useState(valueLabel);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [announcement, setAnnouncement] = useState("");
  const source = usePaginatedOptions({ loadOptions, pageSize, debounceMs });
  const { options, status, hasNext, revision, lastAdded, query } = source;
  const { search, ensureLoaded, loadMore, retry, cancel, reset } = source;
  const activeOption =
    active >= 0 && active < options.length ? options[active] : null;
  const isSelected = (option) => selected.some((s) => sameValue(s, option));

  const hide = () => {
    setOpen(false);
    setActive(-1);
    cancel();
  };
  // `freeText` (single choice only, #377): the typed text is itself a value.
  const typesValue = freeText && !multiple;
  // Last label applied. Synchronised only when the parent's value changes: a
  // router may deliver it in a transition, after renders such as `hide()`
  // that would otherwise reset it and let a following blur apply it twice.
  const committed = useRef(valueLabel);
  useEffect(() => {
    committed.current = valueLabel;
  }, [valueLabel]);
  /** Applies the typed text as `{ value, label }`, or `null` once emptied. */
  const commitText = () => {
    const typed = text.trim();
    if (typed !== text) setText(typed);
    if (typed === committed.current) return;
    committed.current = typed;
    onChange(typed ? { value: typed, label: typed } : null);
    setAnnouncement(typed ? `Filtre appliqué : ${typed}` : "Filtre retiré");
    reset("");
  };
  /** Leaving the field: a single value shows its label again and the next
   * opening lists the first values. With `freeText`, the typed text is
   * applied instead. Escape (`cancel`) always restores the label. */
  const dismiss = ({ cancel = false } = {}) => {
    hide();
    if (typesValue && !cancel) {
      commitText();
      return;
    }
    if (!multiple && text !== valueLabel) {
      setText(valueLabel);
      reset("");
    }
  };
  const show = (activeFirst) => {
    if (disabled) return;
    setOpen(true);
    if (activeFirst) setActive(0);
    if (status === "ready" && options.length) announceCount();
    ensureLoaded();
  };
  const placement = useAnchoredPopup({
    open,
    anchor,
    root,
    onDismiss: dismiss,
  });

  useEffect(() => {
    if (multiple) return;
    setText(valueLabel);
    reset("");
  }, [multiple, valueLabel, reset]);
  useEffect(() => {
    if (disabled) hide();
  }, [disabled]);
  // Keep a pending keyboard position only while the next page is loading.
  useEffect(() => {
    if (status !== "loading" && active >= options.length)
      setActive(options.length - 1);
  }, [status, active, options.length]);

  function announceCount() {
    setAnnouncement(
      `${values(options.length)}${hasNext ? ", d’autres disponibles" : ""}`
    );
  }
  const announced = useRef(revision);
  useEffect(() => {
    if (revision === announced.current) return;
    announced.current = revision;
    if (!open) return;
    if (status === "error")
      setAnnouncement("Chargement impossible. Flèche bas pour réessayer.");
    else if (options.length === 0)
      setAnnouncement("Aucune valeur ne correspond");
    else if (options.length === lastAdded) announceCount();
    else if (lastAdded > 0)
      setAnnouncement(
        `${values(lastAdded)} de plus, ${options.length} affichées${
          hasNext ? "" : ", fin de liste"
        }`
      );
    // announceCount reads the same values as the dependencies below.
  }, [revision, open, status, options.length, lastAdded, hasNext]);

  useLayoutEffect(() => {
    if (open && activeOption)
      document
        .getElementById(optionId(active))
        ?.scrollIntoView?.({ block: "nearest" });
  }, [open, active, activeOption, placement.maxHeight]);
  // A first page shorter than the popup cannot be scrolled: load the next one.
  useLayoutEffect(() => {
    const element = popup.current;
    if (
      open &&
      status === "ready" &&
      hasNext &&
      element?.clientHeight > 0 &&
      element.scrollHeight <= element.clientHeight
    )
      loadMore();
  }, [open, status, hasNext, options.length, loadMore]);

  const announceToggle = (option, removed, count) =>
    setAnnouncement(
      `Valeur ${removed ? "retirée" : "ajoutée"} : ${option.label}. ${
        chosen(count).charAt(0).toUpperCase() + chosen(count).slice(1)
      }`
    );
  const toggle = (option) => {
    const removed = isSelected(option);
    const next = removed
      ? selected.filter((s) => !sameValue(s, option))
      : [...selected, option];
    onChange(next);
    announceToggle(option, removed, next.length);
  };
  const choose = (option, index) => {
    if (multiple) {
      toggle(option);
      setActive(index);
    } else {
      onChange(option);
      setText(option.label);
      hide();
      reset("");
    }
    input.current?.focus();
  };
  const clearText = () => {
    setText("");
    reset("");
    if (open) ensureLoaded();
  };
  const clear = () => {
    clearText();
    committed.current = "";
    if (multiple && selected.length) onChange([]);
    if (!multiple && value) {
      onChange(null);
      setAnnouncement("Filtre retiré");
    }
    input.current?.focus();
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    const last = options.length - 1;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) show(true);
      else if (active < last) setActive(active + 1);
      else if (status === "error") {
        retry();
        setActive(last + 1);
      } else if (hasNext && options.length > 0) {
        // Scrolling may already be loading the next page: keep the move
        // pending until it arrives.
        loadMore();
        setActive(last + 1);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) show(false);
      else setActive(Math.max(0, Math.min(active, options.length) - 1));
    } else if (e.key === "Enter") {
      if (open && activeOption) {
        e.preventDefault();
        choose(activeOption, active);
      } else if (typesValue) {
        e.preventDefault();
        hide();
        commitText();
      }
    } else if (e.key === "Escape") {
      const clears = !open && (text || (!multiple && value));
      if (!open && !clears) return;
      e.preventDefault();
      e.stopPropagation();
      if (open) dismiss({ cancel: true });
      else if (multiple) clearText();
      else clear();
    } else if (e.key === "Tab" && (open || typesValue)) {
      // With `freeText`, Tab may stay inside (on the clear button): apply now.
      dismiss();
    }
  };
  const onScroll = (e) => {
    const element = e.currentTarget;
    if (
      element.scrollTop + element.clientHeight >=
      element.scrollHeight - LOAD_MORE_THRESHOLD
    )
      loadMore();
  };

  const summary =
    multiple && selected.length
      ? `${chosen(selected.length)} : ${selected
          .map((s) => s.label)
          .join(", ")}`
      : "";
  const ready = status === "ready";
  return (
    <div
      ref={root}
      className={`filter-combobox${className ? ` ${className}` : ""}`}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) dismiss();
      }}
    >
      <label
        htmlFor={inputId}
        className={
          hideLabel
            ? "filter-combobox__visually-hidden"
            : "filter-combobox__label"
        }
      >
        {label}
      </label>
      <div ref={anchor} className="filter-combobox__control">
        <input
          ref={input}
          id={inputId}
          type="text"
          role="combobox"
          className="filter-combobox__input"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={
            open && activeOption ? optionId(active) : undefined
          }
          aria-describedby={summary ? summaryId : undefined}
          autoComplete="off"
          spellCheck={false}
          maxLength={maxLength}
          placeholder={placeholder}
          value={text}
          disabled={disabled}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setActive(-1);
            // A repeated message (two empty searches) must be announced again.
            setAnnouncement("");
            search(e.target.value);
          }}
          onKeyDown={onKeyDown}
          onClick={() => {
            if (!open) show(false);
          }}
        />
        <span className="filter-combobox__buttons">
          {!disabled && (text || selected.length > 0) && (
            <button
              type="button"
              className="filter-combobox__icon"
              aria-label="Effacer le filtre"
              onClick={clear}
            >
              <span aria-hidden="true">✕</span>
            </button>
          )}
          <button
            type="button"
            className="filter-combobox__icon"
            tabIndex={-1}
            aria-label={
              open ? "Masquer les suggestions" : "Afficher les suggestions"
            }
            disabled={disabled}
            onClick={() => {
              if (open) hide();
              else show(false);
              input.current?.focus();
            }}
          >
            <span aria-hidden="true">⌄</span>
          </button>
        </span>
      </div>
      {summary && (
        <span id={summaryId} hidden>
          {summary}
        </span>
      )}
      {multiple && selected.length > 0 && (
        <ul
          className="filter-combobox__chips"
          aria-label={`${label} : valeurs choisies`}
        >
          {selected.map((option) => (
            <li key={String(option.value)} className="filter-combobox__chip">
              <span className="filter-combobox__chip-label">
                {option.label}
              </span>
              <button
                type="button"
                aria-label={`Retirer ${option.label}`}
                disabled={disabled}
                onClick={() => {
                  toggle(option);
                  input.current?.focus();
                }}
              >
                <span aria-hidden="true">✕</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <div
          ref={popup}
          className="filter-combobox__popup"
          style={placement}
          onScroll={onScroll}
          // Keep the focus in the field: options are chosen by click only.
          onPointerDown={(e) => e.preventDefault()}
        >
          <ul
            id={listId}
            role="listbox"
            aria-label={label}
            aria-multiselectable={multiple || undefined}
            className="filter-combobox__list"
          >
            {options.map((option, index) => (
              <li
                key={String(option.value)}
                id={optionId(index)}
                role="option"
                aria-selected={isSelected(option)}
                className={`filter-combobox__option${
                  index === active ? " filter-combobox__option--active" : ""
                }`}
                onClick={() => choose(option, index)}
              >
                <span className="filter-combobox__option-label">
                  <Highlighted label={option.label} query={query} />
                </span>
                <span aria-hidden="true" className="filter-combobox__check">
                  {isSelected(option) ? "✓" : ""}
                </span>
              </li>
            ))}
          </ul>
          {status === "loading" && (
            <p className="filter-combobox__status">
              <span className="filter-combobox__spinner" aria-hidden="true" />
              Chargement…
            </p>
          )}
          {status === "error" && (
            <p className="filter-combobox__status filter-combobox__status--error">
              <span>Chargement impossible</span>
              <button
                type="button"
                onClick={() => {
                  retry();
                  input.current?.focus();
                }}
              >
                Réessayer
              </button>
            </p>
          )}
          {ready && options.length === 0 && (
            <p className="filter-combobox__status">
              Aucune valeur ne correspond
            </p>
          )}
          {ready && options.length > 0 && !hasNext && (
            <p className="filter-combobox__status">
              Fin de liste · {values(options.length)}
            </p>
          )}
        </div>
      )}
      <p role="status" className="filter-combobox__visually-hidden">
        {announcement}
      </p>
    </div>
  );
};

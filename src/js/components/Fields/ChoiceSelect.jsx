import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import "../../../css/ChoiceSelect.css";

/** Icon listbox, kept inside the parent dialog's DOM/focus scope.
 * Values follow the existing form event API; choosing never submits a form.
 */
export const ChoiceSelect = ({
  id,
  name,
  form,
  options,
  renderOption = (option) => option.label,
  value,
  onChange,
  disabled = false,
  "aria-label": label,
  "aria-invalid": invalid = false,
  "aria-describedby": describedBy,
}) => {
  const generated = useId();
  const controlId = id || `choice-${generated}`;
  const listId = `${controlId}-list`;
  const root = useRef(null),
    trigger = useRef(null),
    list = useRef(null);
  const [open, setOpen] = useState(false),
    [active, setActive] = useState(0);
  const [placement, setPlacement] = useState({});
  const prefix = useRef({ text: "", time: 0 });
  const selected = Math.max(
    0,
    options.findIndex((c) => String(c.value) === String(value ?? ""))
  );
  const close = (restore = false) => {
    setOpen(false);
    if (restore) trigger.current?.focus();
  };
  const show = () => {
    if (!disabled) {
      setActive(selected);
      setOpen(true);
    }
  };
  const choose = (index) => {
    if (disabled) return;
    const next = String(options[index].value);
    onChange({
      target: { name, value: next },
      currentTarget: { name, value: next },
    });
    close(true);
  };
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);
  useLayoutEffect(() => {
    if (!open) return;
    const position = () => {
      const rect = trigger.current.getBoundingClientRect();
      const viewport = window.visualViewport;
      const top = viewport?.offsetTop || 0,
        left = viewport?.offsetLeft || 0;
      const height = viewport?.height || window.innerHeight;
      const width = viewport?.width || window.innerWidth;
      const below = top + height - rect.bottom - 8,
        above = rect.top - top - 8;
      const down = below >= Math.min(240, above);
      const maxHeight = Math.max(44, Math.min(320, down ? below : above));
      setPlacement({
        position: "fixed",
        left: Math.max(
          left + 8,
          Math.min(
            rect.left,
            left + width - Math.min(rect.width, width - 16) - 8
          )
        ),
        width: Math.min(rect.width, width - 16),
        maxHeight,
        ...(down
          ? { top: rect.bottom + 4 }
          : { bottom: window.innerHeight - rect.top + 4 }),
      });
    };
    position();
    const outside = (e) => {
      if (!root.current?.contains(e.target)) close();
    };
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    window.visualViewport?.addEventListener("resize", position);
    window.visualViewport?.addEventListener("scroll", position);
    document.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      window.visualViewport?.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("scroll", position);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open]);
  useEffect(() => {
    if (open)
      list.current?.children[active]?.scrollIntoView?.({ block: "nearest" });
  }, [open, active]);
  const keyboard = (e) => {
    if (disabled) return;
    if (e.key === "Escape" && open) {
      e.preventDefault();
      e.stopPropagation();
      close(true);
      return;
    }
    if (e.key === "Tab") {
      close();
      return;
    }
    if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      if (!open) {
        show();
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        choose(active);
        return;
      }
      setActive((index) =>
        e.key === "Home"
          ? 0
          : e.key === "End"
          ? options.length - 1
          : (index + (e.key === "ArrowDown" ? 1 : -1) + options.length) %
            options.length
      );
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const now = Date.now();
      prefix.current = {
        text:
          (now - prefix.current.time < 700 ? prefix.current.text : "") +
          e.key.toLocaleLowerCase("fr"),
        time: now,
      };
      const index = options.findIndex((c) =>
        c.label.toLocaleLowerCase("fr").startsWith(prefix.current.text)
      );
      if (!open) setOpen(true);
      if (index >= 0) setActive(index);
    }
  };
  return (
    <span
      ref={root}
      className="choice-select"
      onKeyDown={keyboard}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) close();
      }}
    >
      <input
        type="hidden"
        name={name}
        value={value ?? ""}
        form={form}
        disabled={disabled}
      />
      <button
        ref={trigger}
        id={controlId}
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-option-${active}` : undefined}
        aria-invalid={invalid}
        aria-describedby={[`${controlId}-value`, describedBy]
          .filter(Boolean)
          .join(" ")}
        disabled={disabled}
        className="choice-select__trigger"
        onClick={() => (open ? close() : show())}
      >
        <span id={`${controlId}-value`} className="choice-select__content">
          {renderOption(options[selected])}
        </span>
        <span aria-hidden="true">⌄</span>
      </button>
      {open && (
        <span
          ref={list}
          id={listId}
          role="listbox"
          aria-label={label}
          className="choice-select__list"
          style={placement}
        >
          {options.map((category, index) => (
            <span
              key={category.value}
              id={`${listId}-option-${index}`}
              role="option"
              aria-selected={index === selected}
              className={`choice-select__option${
                index === active ? " choice-select__option--active" : ""
              }`}
              onPointerDown={(e) => {
                if (e.pointerType === "mouse") e.preventDefault();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                choose(index);
              }}
            >
              <span className="choice-select__content">
                {renderOption(category)}
              </span>
              <span aria-hidden="true">{index === selected ? "✓" : ""}</span>
            </span>
          ))}
        </span>
      )}
    </span>
  );
};

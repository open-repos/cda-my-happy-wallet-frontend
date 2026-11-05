import React, { useState } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FilterCombobox } from "../../src/js/components/Fields/FilterCombobox";
import { createArrayOptionSource } from "../../src/js/utils/filterOptions";

const LABELS = Array.from({ length: 25 }, (_, i) => `Valeur ${i + 1}`);
const OPTIONS = LABELS.map((label, i) => ({ value: i + 1, label }));
const flush = () => act(async () => {});

/** Pilote : garde la valeur comme le ferait l'écran appelant. */
const Harness = ({
  initial,
  onChange = () => {},
  onParentKeyDown,
  ...props
}) => {
  const [value, setValue] = useState(initial);
  return (
    <div onKeyDown={onParentKeyDown}>
      <FilterCombobox
        label="Filtrer par titre"
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange(next);
        }}
        {...props}
      />
      <button type="button">Après</button>
    </div>
  );
};
const setup = (props = {}) => {
  const loadOptions = vi.fn(createArrayOptionSource(OPTIONS));
  const onChange = vi.fn();
  const onParentKeyDown = vi.fn();
  render(
    <Harness
      initial={props.multiple ? [] : null}
      loadOptions={loadOptions}
      onChange={onChange}
      onParentKeyDown={onParentKeyDown}
      {...props}
    />
  );
  return {
    loadOptions,
    onChange,
    onParentKeyDown,
    input: screen.getByRole("combobox"),
  };
};
const options = () =>
  within(screen.getByRole("listbox")).queryAllByRole("option");
const status = () => screen.getByRole("status");
const openWithArrow = async (input) => {
  input.focus();
  fireEvent.keyDown(input, { key: "ArrowDown" });
  await flush();
};

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("FilterCombobox (#360)", () => {
  it("expose un combobox éditable relié à sa liste", async () => {
    const { input } = setup();
    expect(input).toHaveAccessibleName("Filtrer par titre");
    expect(input).toHaveAttribute("aria-autocomplete", "list");
    expect(input).toHaveAttribute("aria-expanded", "false");
    await openWithArrow(input);
    expect(input).toHaveAttribute("aria-expanded", "true");
    const list = screen.getByRole("listbox", { name: "Filtrer par titre" });
    expect(input).toHaveAttribute("aria-controls", list.id);
    expect(options()).toHaveLength(10);
    expect(input).toHaveAttribute("aria-activedescendant", options()[0].id);
    expect(status()).toHaveTextContent("10 valeurs, d’autres disponibles");
  });

  it("navigue avec les flèches, choisit avec Entrée et ferme avec Échap", async () => {
    const { input, onChange, onParentKeyDown } = setup();
    await openWithArrow(input);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input).toHaveAttribute("aria-activedescendant", options()[1].id);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(OPTIONS[1]);
    expect(input).toHaveValue("Valeur 2");
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveFocus();
    fireEvent.keyDown(input, { key: "ArrowDown" });
    await flush();
    onParentKeyDown.mockClear();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(onParentKeyDown).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(input).toHaveValue("");
  });

  it("filtre la saisie après temporisation et met en évidence la partie saisie", async () => {
    const { input, loadOptions } = setup();
    input.focus();
    fireEvent.change(input, { target: { value: "valeur 2" } });
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Chargement…")).toBeVisible();
    await act(async () => vi.advanceTimersByTime(250));
    await flush();
    expect(loadOptions).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: "valeur 2", cursor: null })
    );
    expect(options().map((o) => o.textContent)).toEqual([
      "Valeur 2",
      "Valeur 20",
      "Valeur 21",
      "Valeur 22",
      "Valeur 23",
      "Valeur 24",
      "Valeur 25",
    ]);
    expect(options()[0].querySelector("mark")).toHaveTextContent("Valeur 2");
    expect(screen.getByText("Fin de liste · 7 valeurs")).toBeVisible();
  });

  it("n'applique pas un texte libre et rétablit la valeur choisie en quittant", async () => {
    const { input, onChange } = setup({ initial: OPTIONS[0] });
    expect(input).toHaveValue("Valeur 1");
    input.focus();
    fireEvent.change(input, { target: { value: "inconnu" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.focusOut(input, { relatedTarget: screen.getByText("Après") });
    expect(input).toHaveValue("Valeur 1");
  });

  it("rouvre sur les premières valeurs et rétablit le libellé avec Échap", async () => {
    const { input, onChange } = setup({ initial: OPTIONS[0] });
    await openWithArrow(input);
    expect(options()).toHaveLength(10);
    expect(options()[0]).toHaveAttribute("aria-selected", "true");
    fireEvent.change(input, { target: { value: "inconnu" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input).toHaveValue("Valeur 1");
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "ArrowDown" });
    await flush();
    expect(options()).toHaveLength(10);
    expect(status()).toHaveTextContent("10 valeurs, d’autres disponibles");
  });

  it("charge la suite au bas de la liste et au clavier, sans doublon", async () => {
    const { input, loadOptions } = setup();
    await openWithArrow(input);
    for (let i = 0; i < 9; i += 1)
      fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveAttribute("aria-activedescendant", options()[9].id);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getByText("Chargement…")).toBeVisible();
    await flush();
    expect(options()).toHaveLength(20);
    expect(input).toHaveAttribute("aria-activedescendant", options()[10].id);
    expect(status()).toHaveTextContent("10 valeurs de plus, 20 affichées");
    const popup = screen.getByRole("listbox").parentElement;
    Object.defineProperties(popup, {
      scrollHeight: { configurable: true, value: 900 },
      clientHeight: { configurable: true, value: 300 },
      scrollTop: { configurable: true, value: 560 },
    });
    fireEvent.scroll(popup);
    await flush();
    expect(options()).toHaveLength(25);
    expect(new Set(options().map((o) => o.textContent)).size).toBe(25);
    expect(status()).toHaveTextContent("fin de liste");
    fireEvent.scroll(popup);
    expect(loadOptions).toHaveBeenCalledTimes(3);
  });

  it("garde le déplacement clavier quand la suite est déjà en chargement", async () => {
    const { input } = setup();
    await openWithArrow(input);
    for (let i = 0; i < 9; i += 1)
      fireEvent.keyDown(input, { key: "ArrowDown" });
    const popup = screen.getByRole("listbox").parentElement;
    Object.defineProperties(popup, {
      scrollHeight: { configurable: true, value: 460 },
      clientHeight: { configurable: true, value: 300 },
      scrollTop: { configurable: true, value: 160 },
    });
    fireEvent.scroll(popup);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    await flush();
    expect(options()).toHaveLength(20);
    expect(input).toHaveAttribute("aria-activedescendant", options()[10].id);
  });

  it("affiche les états vide et erreur, et réessaie au clavier", async () => {
    let fail = true;
    const base = createArrayOptionSource(OPTIONS);
    const loadOptions = vi.fn((request) =>
      request.cursor && fail ? Promise.reject(new Error("500")) : base(request)
    );
    render(<Harness initial={null} loadOptions={loadOptions} />);
    const input = screen.getByRole("combobox");
    await openWithArrow(input);
    for (let i = 0; i < 10; i += 1)
      fireEvent.keyDown(input, { key: "ArrowDown" });
    await flush();
    expect(screen.getByText("Chargement impossible")).toBeVisible();
    expect(status()).toHaveTextContent(
      "Chargement impossible. Flèche bas pour réessayer."
    );
    expect(options()).toHaveLength(10);
    fail = false;
    fireEvent.keyDown(input, { key: "ArrowDown" });
    await flush();
    expect(options()).toHaveLength(20);
    fireEvent.change(input, { target: { value: "zzz" } });
    await act(async () => vi.advanceTimersByTime(250));
    await flush();
    expect(screen.getByRole("listbox").parentElement).toHaveTextContent(
      "Aucune valeur ne correspond"
    );
    expect(status()).toHaveTextContent("Aucune valeur ne correspond");
    expect(input).not.toHaveAttribute("aria-activedescendant");
  });

  it("réessaie avec le bouton sans perdre le focus du champ", async () => {
    const loadOptions = vi
      .fn()
      .mockRejectedValueOnce(new Error("500"))
      .mockImplementation(createArrayOptionSource(OPTIONS));
    render(<Harness initial={null} loadOptions={loadOptions} />);
    const input = screen.getByRole("combobox");
    await openWithArrow(input);
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    await flush();
    expect(options()).toHaveLength(10);
  });

  it("efface le filtre avec le bouton dédié", async () => {
    const { input, onChange } = setup({ initial: OPTIONS[3] });
    fireEvent.click(screen.getByRole("button", { name: "Effacer le filtre" }));
    expect(onChange).toHaveBeenCalledWith(null);
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
    expect(
      screen.queryByRole("button", { name: "Effacer le filtre" })
    ).not.toBeInTheDocument();
  });

  it("ferme la liste avec Tab sans choisir", async () => {
    const { input, onChange } = setup();
    await openWithArrow(input);
    fireEvent.keyDown(input, { key: "Tab" });
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(onChange).not.toHaveBeenCalled();
  });

  describe("choix multiple", () => {
    it("coche plusieurs valeurs sans fermer la liste", async () => {
      const { input, onChange } = setup({ multiple: true });
      await openWithArrow(input);
      expect(screen.getByRole("listbox")).toHaveAttribute(
        "aria-multiselectable",
        "true"
      );
      fireEvent.keyDown(input, { key: "Enter" });
      fireEvent.keyDown(input, { key: "ArrowDown" });
      fireEvent.click(options()[2]);
      expect(onChange).toHaveBeenLastCalledWith([OPTIONS[0], OPTIONS[2]]);
      expect(input).toHaveAttribute("aria-expanded", "true");
      expect(input).toHaveFocus();
      expect(options()[0]).toHaveAttribute("aria-selected", "true");
      expect(options()[1]).toHaveAttribute("aria-selected", "false");
      expect(options()[2]).toHaveAttribute("aria-selected", "true");
      expect(status()).toHaveTextContent(
        "Valeur ajoutée : Valeur 3. 2 valeurs choisies"
      );
      expect(input).toHaveAccessibleDescription(
        "2 valeurs choisies : Valeur 1, Valeur 3"
      );
      fireEvent.keyDown(input, { key: "ArrowUp" });
      fireEvent.keyDown(input, { key: "ArrowUp" });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(onChange).toHaveBeenLastCalledWith([OPTIONS[2]]);
      expect(status()).toHaveTextContent(
        "Valeur retirée : Valeur 1. 1 valeur choisie"
      );
    });

    it("retire une valeur choisie depuis son étiquette", () => {
      const { input, onChange } = setup({
        multiple: true,
        initial: [OPTIONS[0], OPTIONS[4]],
      });
      const chips = screen.getByRole("list", {
        name: "Filtrer par titre : valeurs choisies",
      });
      expect(within(chips).getAllByRole("listitem")).toHaveLength(2);
      fireEvent.click(
        within(chips).getByRole("button", { name: "Retirer Valeur 5" })
      );
      expect(onChange).toHaveBeenLastCalledWith([OPTIONS[0]]);
      expect(input).toHaveFocus();
    });

    it("garde la saisie après un choix et efface tout avec le bouton", async () => {
      const { input, onChange } = setup({ multiple: true });
      input.focus();
      fireEvent.change(input, { target: { value: "valeur 1" } });
      await act(async () => vi.advanceTimersByTime(250));
      await flush();
      fireEvent.keyDown(input, { key: "ArrowDown" });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(input).toHaveValue("valeur 1");
      fireEvent.click(
        screen.getByRole("button", { name: "Effacer le filtre" })
      );
      expect(onChange).toHaveBeenLastCalledWith([]);
      expect(input).toHaveValue("");
    });
  });
});

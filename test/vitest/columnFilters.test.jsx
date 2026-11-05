import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import {
  RangeFilter,
  SelectFilter,
} from "../../src/js/components/TableQuery/ColumnFilters";
import { TableQueryPanel } from "../../src/js/components/TableQuery/TableQueryPanel";

afterEach(cleanup);

it("applique un montant au départ du champ ou sur Entrée, normalisé, et refuse min > max", () => {
  const onChange = vi.fn();
  render(
    <RangeFilter
      label="Filtrer par montant"
      kind="amount"
      from=""
      to=""
      onChange={onChange}
    />
  );
  const min = screen.getByLabelText("Filtrer par montant min");
  const max = screen.getByLabelText("Filtrer par montant max");
  fireEvent.change(min, { target: { value: "12,5" } });
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.blur(min);
  expect(onChange).toHaveBeenLastCalledWith({ from: "12.50", to: "" });
  fireEvent.change(max, { target: { value: "3" } });
  fireEvent.keyDown(max, { key: "Enter" });
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Saisissez des montants positifs, le minimum sous le maximum."
  );
  expect(max).toHaveAttribute("aria-invalid", "true");
  expect(max).toHaveAccessibleDescription(
    "Saisissez des montants positifs, le minimum sous le maximum."
  );
  fireEvent.change(max, { target: { value: "abc" } });
  fireEvent.blur(max);
  expect(onChange).toHaveBeenCalledTimes(1);
  fireEvent.change(max, { target: { value: "" } });
  fireEvent.blur(max);
  expect(screen.queryByRole("alert")).toBeNull();
});

it("applique une plage de dates complète et signale une plage inversée", () => {
  const onChange = vi.fn();
  render(
    <RangeFilter
      label="Filtrer par date"
      kind="date"
      from=""
      to="2026-10-10"
      onChange={onChange}
    />
  );
  fireEvent.change(screen.getByLabelText("Filtrer par date du"), {
    target: { value: "2026-10-01" },
  });
  expect(onChange).toHaveBeenLastCalledWith({
    from: "2026-10-01",
    to: "2026-10-10",
  });
  fireEvent.change(screen.getByLabelText("Filtrer par date du"), {
    target: { value: "2026-11-01" },
  });
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Saisissez des dates valides, le début avant la fin."
  );
});

it("retire un filtre de choix avec l'option Tous", () => {
  const onChange = vi.fn();
  render(
    <SelectFilter
      label="Filtrer par type"
      value="ENTREE"
      options={[
        { value: "DEPENSE", label: "Dépense" },
        { value: "ENTREE", label: "Entrée" },
      ]}
      onChange={onChange}
    />
  );
  fireEvent.change(screen.getByLabelText("Filtrer par type"), {
    target: { value: "" },
  });
  expect(onChange).toHaveBeenCalledWith("");
});

it("ouvre le panneau, propose l'ordre par défaut et efface les filtres", () => {
  const onSortChange = vi.fn(),
    onOrderChange = vi.fn(),
    onClear = vi.fn();
  const panel = (props) => (
    <TableQueryPanel
      sortOptions={[
        { value: "date", label: "Date" },
        { value: "amount", label: "Montant" },
      ]}
      sortValue=""
      orderValue="asc"
      defaultSortLabel="Par défaut (plus récentes d’abord)"
      onSortChange={onSortChange}
      onOrderChange={onOrderChange}
      activeFilters={0}
      onClear={onClear}
      {...props}
    >
      <label>
        Filtre mobile <input />
      </label>
    </TableQueryPanel>
  );
  const { rerender } = render(panel());
  const toggle = screen.getByRole("button", { name: "Trier et filtrer" });
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(
    screen.queryByRole("button", { name: "Effacer les filtres" })
  ).toBeNull();
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("group", { name: "Tri et filtres" })).toBeVisible();
  expect(screen.getByLabelText("Filtre mobile")).toBeVisible();
  // Sans tri choisi, l'ordre ne s'applique pas.
  expect(screen.getByLabelText("Ordre du tri")).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Trier par"), {
    target: { value: "amount" },
  });
  expect(onSortChange).toHaveBeenCalledWith("amount");
  rerender(panel({ sortValue: "amount", activeFilters: 2 }));
  fireEvent.change(screen.getByLabelText("Ordre du tri"), {
    target: { value: "desc" },
  });
  expect(onOrderChange).toHaveBeenCalledWith("desc");
  fireEvent.change(screen.getByLabelText("Trier par"), {
    target: { value: "" },
  });
  expect(onSortChange).toHaveBeenLastCalledWith(null);
  expect(
    screen.getByRole("button", { name: "Trier et filtrer (2 filtres)" })
  ).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Effacer les filtres" }));
  expect(onClear).toHaveBeenCalledTimes(1);
});

it("résume une plage compacte sur un bouton et ouvre ses bornes dans une fenêtre", () => {
  const onChange = vi.fn();
  render(
    <RangeFilter
      compact
      label="Filtrer par date"
      kind="date"
      from="2026-10-01"
      to="2026-10-31"
      onChange={onChange}
    />
  );
  const button = screen.getByRole("button", {
    name: "Filtrer par date : 01/10/2026 – 31/10/2026",
  });
  expect(button).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByLabelText("Filtrer par date du")).not.toBeVisible();
  fireEvent.click(button);
  expect(button).toHaveAttribute("aria-expanded", "true");
  const from = screen.getByLabelText("Filtrer par date du");
  expect(from).toBeVisible();
  expect(from).toHaveFocus();
  fireEvent.keyDown(from, { key: "Escape" });
  expect(button).toHaveAttribute("aria-expanded", "false");
  expect(button).toHaveFocus();
});

it("résume les bornes partielles", async () => {
  const { rangeSummary } = await import(
    "../../src/js/components/TableQuery/ColumnFilters"
  );
  expect(rangeSummary("amount", "12.50", "")).toBe("≥ 12,50");
  expect(rangeSummary("amount", "", "100.00")).toBe("≤ 100,00");
  expect(rangeSummary("amount", "", "")).toBe("Tous");
  expect(rangeSummary("date", "", "2026-10-31")).toBe("Jusqu’au 31/10/2026");
  expect(rangeSummary("date", "2026-10-01", "")).toBe("Dès le 01/10/2026");
});

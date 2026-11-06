import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CompactMoneyList } from "../../src/js/components/CompactOperations/CompactMoneyList";
afterEach(cleanup);
const rows = [
  {
    id: "one",
    title: "Courses du quotidien",
    kind: "expense",
    amount: "42,50 €",
    date: "24/10/2026",
    category: { name: "Alimentation et courses de la famille" },
  },
  {
    id: "two",
    title: "Remboursement transport",
    kind: "income",
    amount: "120,00 €",
    date: "23/10/2026",
    category: { name: "Transport" },
  },
];
const props = {
  rows,
  label: "Opérations",
  renderActions: (r) => <button>Modifier {r.title}</button>,
  renderDetails: (r) => <p>{r.category.name}</p>,
  renderEditor: (r) => (
    <tr>
      <td>Édition {r.title}</td>
    </tr>
  ),
};
it("renders sortable headers with aria-sort on the sorted column only, and filters under their name (#361)", () => {
  const onSort = vi.fn();
  render(
    <CompactMoneyList
      {...props}
      sortHeaders={{
        date: { ariaSort: "descending", label: "Date, trié", onSort },
        amount: { ariaSort: "none", label: "Montant, non trié", onSort },
      }}
      filters={{ title: <input aria-label="Filtrer par libellé" /> }}
      toolbar={<p>Barre de tri</p>}
    />
  );
  expect(screen.getByText("Barre de tri")).toBeVisible();
  const date = screen.getByRole("columnheader", { name: /Date/ });
  expect(date).toHaveAttribute("aria-sort", "descending");
  const amount = screen.getByRole("columnheader", { name: /Montant/ });
  expect(amount).not.toHaveAttribute("aria-sort");
  expect(
    screen.getByRole("columnheader", { name: /Libellé/ })
  ).not.toHaveAttribute("aria-sort");
  fireEvent.click(
    within(amount).getByRole("button", { name: "Montant, non trié" })
  );
  expect(onSort).toHaveBeenCalledTimes(1);
  // Une colonne sans tri garde un simple libellé.
  expect(
    within(screen.getByRole("columnheader", { name: /Catégorie/ })).queryByRole(
      "button"
    )
  ).toBeNull();
  expect(
    within(
      screen.getByRole("columnheader", { name: /Libellé/ })
    ).getByLabelText("Filtrer par libellé")
  ).toBeVisible();
  fireEvent.click(
    screen.getByRole("button", { name: "Courses du quotidien", exact: true })
  );
  expect(
    screen.getByText("Alimentation et courses de la famille", { selector: "p" })
  ).toBeVisible();
});
it("announces an empty filtered result without hiding the headers", () => {
  render(
    <CompactMoneyList
      {...props}
      rows={[]}
      emptyMessage="Aucune opération ne correspond à ces filtres."
    />
  );
  expect(screen.getByRole("status")).toHaveTextContent(
    "Aucune opération ne correspond à ces filtres."
  );
  expect(screen.getAllByRole("columnheader")).toHaveLength(6);
});
it("freezes the editing row's slot until explicit completion even when sorted input changes", () => {
  const sortHeaders = {
    title: { ariaSort: "ascending", label: "Libellé, trié", onSort: vi.fn() },
  };
  const { rerender } = render(
    <CompactMoneyList {...props} sortHeaders={sortHeaders} editingId="two" />
  );
  rerender(
    <CompactMoneyList
      {...props}
      sortHeaders={sortHeaders}
      rows={[...rows].reverse()}
      editingId="two"
    />
  );
  const body = screen.getByRole("table").querySelector("tbody");
  expect(within(body).getAllByRole("row")[1]).toHaveTextContent(
    "Édition Remboursement transport"
  );
  // Le tri depuis l'en-tête attend la fin de l'édition.
  expect(screen.getByRole("button", { name: "Libellé, trié" })).toBeDisabled();
  rerender(<CompactMoneyList {...props} rows={[...rows].reverse()} />);
  expect(within(body).getAllByRole("row")[0]).toHaveTextContent(
    "Remboursement transport"
  );
});

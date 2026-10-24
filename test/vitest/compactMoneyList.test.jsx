import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
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
it("filters the loaded window by direction and title/category without fetching or losing details", () => {
  render(<CompactMoneyList {...props} />);
  fireEvent.click(screen.getByRole("button", { name: /^Entrées/ }));
  expect(
    screen.queryByRole("button", { name: "Courses du quotidien", exact: true })
  ).toBeNull();
  expect(
    screen.getByRole("button", { name: "Remboursement transport", exact: true })
  ).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: /^Tout/ }));
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "FAMILLE" },
  });
  expect(
    screen.getByRole("button", { name: "Courses du quotidien", exact: true })
  ).toBeVisible();
  expect(
    screen.queryByRole("button", {
      name: "Remboursement transport",
      exact: true,
    })
  ).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Courses du quotidien", exact: true })
  );
  expect(
    screen.getByText("Alimentation et courses de la famille", { selector: "p" })
  ).toBeVisible();
  expect(screen.getByText("1 sur 2 éléments chargés")).toBeVisible();
});
it("freezes the editing row's slot until explicit completion even when sorted input changes", () => {
  const { rerender } = render(<CompactMoneyList {...props} editingId="two" />);
  rerender(
    <CompactMoneyList {...props} rows={[...rows].reverse()} editingId="two" />
  );
  const body = screen.getByRole("table").querySelector("tbody");
  expect(within(body).getAllByRole("row")[1]).toHaveTextContent(
    "Édition Remboursement transport"
  );
  expect(screen.getByRole("button", { name: /^Entrées/ })).toBeDisabled();
  expect(screen.getByRole("searchbox")).toBeDisabled();
  rerender(<CompactMoneyList {...props} rows={[...rows].reverse()} />);
  expect(within(body).getAllByRole("row")[0]).toHaveTextContent(
    "Remboursement transport"
  );
});

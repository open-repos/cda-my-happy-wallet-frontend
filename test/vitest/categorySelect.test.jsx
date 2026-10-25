import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CategorySelect } from "../../src/js/components/Categories/CategorySelect";
vi.mock("../../src/js/components/Categories/categoryIconPack", () => ({
  useCategoryIconPack: () => ({
    pack: new Map([["solid:heart", [24, 24, "M0 0h24v24H0z"]]]),
  }),
}));
const categories = [
  {
    id: 1,
    name: "Ma catégorie personnelle très longue sans troncature",
    icon: "solid:heart",
    color: "#008866",
  },
  { id: 2, name: "Sans icône valide", icon: "solid:invalid", color: null },
];
describe("CategorySelect", () => {
  it("renders actual icons in selected field and open options, with fallback", () => {
    render(
      <CategorySelect categories={categories} value="1" onChange={vi.fn()} />
    );
    const field = screen.getByRole("combobox", { name: "Catégorie" });
    expect(field.querySelector("svg")).not.toBeNull();
    fireEvent.click(field);
    const options = within(screen.getByRole("listbox")).getAllByRole("option");
    expect(options[1]).toHaveTextContent(categories[0].name);
    expect(options[1].querySelector("svg")).not.toBeNull();
    expect(options[2].querySelector(".category-swatch")).not.toBeNull();
    expect(options[1]).toHaveAttribute("aria-selected", "true");
  });
  it("supports keyboard, typeahead, escape, focus and never submits on selection", () => {
    const change = vi.fn(),
      submit = vi.fn(),
      parentKey = vi.fn();
    render(
      <form onSubmit={submit} onKeyDown={parentKey}>
        <CategorySelect categories={categories} value="1" onChange={change} />
      </form>
    );
    const field = screen.getByRole("combobox");
    field.focus();
    fireEvent.keyDown(field, { key: "ArrowDown" });
    fireEvent.keyDown(field, { key: "End" });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(change).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ name: "categoryId", value: "2" }),
      })
    );
    expect(submit).not.toHaveBeenCalled();
    expect(field).toHaveFocus();
    fireEvent.click(field);
    parentKey.mockClear();
    fireEvent.keyDown(field, { key: "Escape" });
    expect(parentKey).not.toHaveBeenCalled();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(field).toHaveFocus();
    fireEvent.keyDown(field, { key: "s" });
    expect(field.getAttribute("aria-activedescendant")).toContain("option-2");
  });
  it("retains an unavailable selection, exposes invalid/disabled state and form value", () => {
    const { rerender } = render(
      <CategorySelect
        id="c"
        categories={[]}
        value="8"
        disabled
        aria-invalid
        aria-describedby="err"
        onChange={vi.fn()}
      />
    );
    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.getByRole("combobox")).toHaveAttribute(
      "aria-invalid",
      "true"
    );
    expect(document.querySelector('input[name="categoryId"]')).toHaveValue("8");
    rerender(
      <CategorySelect
        id="c"
        categories={[]}
        value="8"
        currentCategory={{ id: 8, name: "Ancienne catégorie" }}
        onChange={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole("combobox"));
    expect(
      screen.getByRole("option", { name: /Ancienne catégorie/ })
    ).toHaveAttribute("aria-selected", "true");
  });
});

afterEach(cleanup);

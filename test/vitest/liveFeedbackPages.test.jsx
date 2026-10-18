import React from "react";
import { cleanup, render, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ListeOperations from "../../src/js/pages/ListeOperations";
import Categories from "../../src/js/pages/Categories";
import Objectifs from "../../src/js/pages/Objectifs";
import Calendrier from "../../src/js/pages/Calendrier";
import { FinancialGoalsSection } from "../../src/js/components/FinancialGoals/FinancialGoalsSection";
import { useOneOffOperations } from "../../src/js/hooks/useOneOffOperations";
import { useCategories } from "../../src/js/hooks/useCategories";
import { useMonthlyEvents } from "../../src/js/hooks/useMonthlyEvents";
import { useFinancialGoals } from "../../src/js/hooks/useFinancialGoals";
import { useBudgetCalendar } from "../../src/js/hooks/useBudgetCalendar";

vi.mock("../../src/js/hooks/useOneOffOperations", () => ({
  useOneOffOperations: vi.fn(),
}));
vi.mock("../../src/js/hooks/useCategories", () => ({ useCategories: vi.fn() }));
vi.mock("../../src/js/hooks/useMonthlyEvents", () => ({
  useMonthlyEvents: vi.fn(),
}));
vi.mock("../../src/js/hooks/useFinancialGoals", () => ({
  useFinancialGoals: vi.fn(),
}));
vi.mock("../../src/js/hooks/useBudgetCalendar", () => ({
  useBudgetCalendar: vi.fn(),
}));

const empty = {
  status: "success",
  mutationStatus: "idle",
  message: "",
  operations: [],
  categories: [],
  events: [],
  occurrences: [],
  goals: [],
  pending: [],
  summary: null,
  summaryStatus: "loading",
  operationsStatus: "success",
};
const cases = [
  ["operations", ListeOperations, useOneOffOperations, ".operations-container"],
  ["categories", Categories, useCategories, ".categories-container"],
  ["events", Objectifs, useMonthlyEvents, ".monthly-events-page"],
  [
    "financial goals",
    FinancialGoalsSection,
    useFinancialGoals,
    ".goals-section",
  ],
  ["calendar", Calendrier, useBudgetCalendar, ".calendrier-container"],
];
const feedback = (hook, text, error = false) => ({
  ...empty,
  mutationStatus: error ? "error" : "success",
  message:
    hook === useBudgetCalendar
      ? { text, tone: error ? "error" : "info" }
      : text,
});
beforeEach(() => {
  for (const [, , hook] of cases) hook.mockReturnValue(feedback(hook, ""));
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("page feedback announcements", () => {
  it.each(cases)(
    "keeps the %s live regions mounted through success, error and reset",
    (_name, Page, hook, selector) => {
      const { container, rerender } = render(<Page />, {
        wrapper: MemoryRouter,
      });
      // Only this page's own announcements; Objectifs also embeds goals.
      const root = container.querySelector(selector);
      const status = root.querySelector(
        ":scope > .live-feedback[role='status']"
      );
      const alert = root.querySelector(":scope > .live-feedback[role='alert']");
      expect(status).toBeInTheDocument();
      expect(alert).toBeInTheDocument();
      expect(status).toBeEmptyDOMElement();
      expect(alert).toBeEmptyDOMElement();
      expect(status).not.toHaveAttribute("hidden");
      expect(status).not.toHaveAttribute("aria-hidden");
      expect(status).toHaveAttribute("aria-atomic", "true");

      hook.mockReturnValue(feedback(hook, "Modification enregistrée."));
      rerender(<Page />);
      expect(status).toHaveTextContent("Modification enregistrée.");
      expect(alert).toBeEmptyDOMElement();

      hook.mockReturnValue(feedback(hook, "Veuillez réessayer.", true));
      rerender(<Page />);
      expect(alert).toHaveTextContent("Veuillez réessayer.");
      expect(status).toBeEmptyDOMElement();
      expect(within(root).getByText("Veuillez réessayer.")).toBe(alert);

      hook.mockReturnValue(feedback(hook, ""));
      rerender(<Page />);
      // Retaining the initial DOM nodes is essential to announce later text changes.
      expect(status).toBeInTheDocument();
      expect(alert).toBeInTheDocument();
      expect(status).toBeEmptyDOMElement();
      expect(alert).toBeEmptyDOMElement();
    }
  );
});

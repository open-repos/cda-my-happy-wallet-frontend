import { screen, waitFor } from "@testing-library/react";
import { expect } from "vitest";

/** Régions live présentes avant le changement d'état à tester (#164). */
export const captureLiveRegions = () => [
  ...screen.queryAllByRole("status"),
  ...screen.queryAllByRole("alert"),
];

/**
 * Attend que `text` soit annoncé dans une région `role` qui existait déjà,
 * vide, avant le changement d'état : la preuve qu'elle était observée.
 */
export const expectAnnouncedIn = async (captured, role, text) => {
  await waitFor(() => {
    const region = screen
      .getAllByRole(role)
      .find((element) => element.textContent === text);
    expect(region, `${role} « ${text} »`).toBeDefined();
    expect(captured).toContain(region);
  });
};

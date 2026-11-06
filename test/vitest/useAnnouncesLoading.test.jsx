import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAnnouncesLoading } from "../../src/js/hooks/useAnnouncesLoading";

const renderStatus = (status, key = "2026-10") =>
  renderHook((props) => useAnnouncesLoading(props.status, props.key), {
    initialProps: { status, key },
  });

describe("useAnnouncesLoading (#171)", () => {
  it("announces a first loading, not the refreshes of displayed data", () => {
    const { result, rerender } = renderStatus("loading");
    expect(result.current).toBe(true);

    rerender({ status: "success", key: "2026-10" });
    expect(result.current).toBe(false);
    // Actualisation après modification, invalidate() ou retour sur l'onglet.
    rerender({ status: "loading", key: "2026-10" });
    expect(result.current).toBe(false);
  });

  it("announces again for another view or after a failure", () => {
    const { result, rerender } = renderStatus("success");
    rerender({ status: "loading", key: "2026-11" });
    expect(result.current).toBe(true);

    rerender({ status: "success", key: "2026-11" });
    rerender({ status: "error", key: "2026-11" });
    rerender({ status: "loading", key: "2026-11" });
    expect(result.current).toBe(true);
  });

  it("treats an unopened future month and paging as displayed", () => {
    const { result, rerender } = renderStatus("loading");
    rerender({ status: "future", key: "2026-10" });
    rerender({ status: "loading", key: "2026-10" });
    expect(result.current).toBe(false);

    rerender({ status: "loading", key: "2026-12" });
    rerender({ status: "success", key: "2026-12" });
    rerender({ status: "paging", key: "2026-12" });
    rerender({ status: "loading", key: "2026-12" });
    expect(result.current).toBe(false);
  });

  it("does not count the previous view's success under a new key", () => {
    const { result, rerender } = renderStatus("loading", "2026-10:null");
    rerender({ status: "success", key: "2026-10:null" });
    // Jour choisi : la clé change avant que la requête ne démarre.
    rerender({ status: "success", key: "2026-10:2026-10-12" });
    rerender({ status: "loading", key: "2026-10:2026-10-12" });
    expect(result.current).toBe(true);
  });

  it("announces again after the section was hidden (idle)", () => {
    const { result, rerender } = renderStatus("loading", "2026-10:true");
    rerender({ status: "success", key: "2026-10:true" });
    // Simulation désactivée puis réactivée sur le même mois.
    rerender({ status: "idle", key: "2026-10:false" });
    rerender({ status: "loading", key: "2026-10:true" });
    expect(result.current).toBe(true);
  });
});

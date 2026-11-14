import { describe, expect, it, vi } from "vitest";

import {
  createIdempotencyKey,
  describeWriteFailure,
  nextTransferAttempt,
  runVaultWrite,
} from "@/src/features/vault/domain/vaultWrite";

const refusal = (status: number, code: string | null = null) =>
  Object.assign(new Error("refused"), { status, code });

describe("vault write outcome (#419)", () => {
  it("confirms a write whose views were refreshed", async () => {
    const refresh = vi.fn().mockResolvedValue(true);
    expect(await runVaultWrite(async () => undefined, refresh)).toEqual({
      status: "saved",
      refreshed: true,
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("keeps a saved write apart from a failed refresh", async () => {
    expect(
      await runVaultWrite(
        async () => undefined,
        () => Promise.reject(new Error("offline")),
      ),
    ).toEqual({ status: "saved", refreshed: false });
    expect(
      await runVaultWrite(
        async () => undefined,
        async () => false,
      ),
    ).toEqual({ status: "saved", refreshed: false });
  });

  it("reports a refusal with its code, without refreshing", async () => {
    const refresh = vi.fn();
    expect(
      await runVaultWrite(
        () => Promise.reject(refusal(409, "ACCOUNT_ARCHIVED")),
        refresh,
      ),
    ).toEqual({ status: "refused", code: "ACCOUNT_ARCHIVED" });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("marks a lost answer or a server failure as uncertain", async () => {
    const lost = () => Promise.reject(new TypeError("Network request failed"));
    expect(await runVaultWrite(lost, vi.fn())).toEqual({
      status: "uncertain",
    });
    expect(
      await runVaultWrite(() => Promise.reject(refusal(503)), vi.fn()),
    ).toEqual({ status: "uncertain" });
  });

  it("explains the failure to the user", () => {
    expect(
      describeWriteFailure({ status: "refused", code: "BALANCE_LIMIT" }),
    ).toBe("Le solde maximal autorisé serait dépassé.");
    expect(describeWriteFailure({ status: "refused", code: null })).toBe(
      "L’enregistrement a échoué. Vérifiez les valeurs puis réessayez.",
    );
    expect(describeWriteFailure({ status: "uncertain" })).toMatch(
      /^Le résultat de l’enregistrement est incertain\./,
    );
  });
});

describe("transfer attempts (#419)", () => {
  const draft = {
    direction: "deposit" as const,
    amount: "150",
    date: "2026-11-11",
  };

  it("creates one key per attempt", () => {
    const keys = ["manual:first001", "manual:second02"];
    const key = () => keys.shift() ?? "";
    const first = nextTransferAttempt(null, draft, "2026-11-11", key);
    const second = nextTransferAttempt(null, draft, "2026-11-11", key);
    expect(first.ok && first.value.idempotencyKey).toBe("manual:first001");
    expect(second.ok && second.value.idempotencyKey).toBe("manual:second02");
  });

  it("resumes an uncertain attempt with the same body and the same key", () => {
    const key = vi.fn(() => "manual:first001");
    const first = nextTransferAttempt(null, draft, "2026-11-11", key);
    if (!first.ok) throw new Error("expected a valid attempt");

    // Les champs ont pu changer à l'écran : la reprise les ignore.
    const resumed = nextTransferAttempt(
      first.value,
      { direction: "withdraw", amount: "9", date: "2026-11-01" },
      "2026-11-12",
      key,
    );

    expect(resumed).toEqual({ ok: true, value: first.value });
    expect(key).toHaveBeenCalledTimes(1);
  });

  it("generates keys accepted by the API, without a crypto module", () => {
    const keys = new Set(
      Array.from({ length: 200 }, () => createIdempotencyKey()),
    );
    expect(keys.size).toBe(200);
    keys.forEach((key) => expect(key).toMatch(/^manual:[A-Za-z0-9_-]{16,90}$/));
  });
});

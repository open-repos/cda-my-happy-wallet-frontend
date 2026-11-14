import { describe, expect, it, vi } from "vitest";

import {
  HttpVaultGateway,
  VaultRequestError,
} from "@/src/features/vault/infrastructure/HttpVaultGateway";
import {
  currentAccount,
  currentMovement,
  savingsAccount,
  savingsMovement,
  vaultPage,
} from "@/src/features/vault/testing/vaultFixtures";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const client = (...responses: Response[]) => {
  const request =
    vi.fn<(path: string, init?: RequestInit) => Promise<Response>>();
  responses.forEach((response) => request.mockResolvedValueOnce(response));
  return { request };
};
const sent = (http: ReturnType<typeof client>, call = 0) => {
  const [path, init] = http.request.mock.calls[call];
  return {
    path,
    method: init?.method,
    body: JSON.parse(String(init?.body)) as unknown,
  };
};

describe("HttpVaultGateway reads (#419)", () => {
  it("pages the savings accounts with the opaque cursor", async () => {
    const http = client(
      json(vaultPage([savingsAccount()], "next")),
      json(vaultPage([{ ...savingsAccount(), id: 2 }])),
    );
    const gateway = new HttpVaultGateway(http);

    const first = await gateway.accounts(null);
    const second = await gateway.accounts("a b");

    expect(first.meta.nextCursor).toBe("next");
    expect(second.data[0].id).toBe(2);
    expect(http.request).toHaveBeenNthCalledWith(
      1,
      "/savings-accounts?limit=20",
    );
    expect(http.request).toHaveBeenNthCalledWith(
      2,
      "/savings-accounts?limit=20&cursor=a+b",
    );
  });

  it("reads one account and its movements", async () => {
    const http = client(
      json({ data: savingsAccount() }),
      json(vaultPage([savingsMovement()])),
    );
    const gateway = new HttpVaultGateway(http);

    expect((await gateway.account(1)).balanceMinorUnits).toBe(243000);
    expect((await gateway.movements(1, null)).data[0].reason).toBe("MANUAL");
    expect(http.request).toHaveBeenNthCalledWith(1, "/savings-accounts/1");
    expect(http.request).toHaveBeenNthCalledWith(
      2,
      "/savings-accounts/1/movements?limit=20",
    );
  });

  it("reads the available budget and its movements by month and currency", async () => {
    const http = client(
      json({ data: currentAccount() }),
      json(vaultPage([currentMovement()], "p2")),
    );
    const gateway = new HttpVaultGateway(http);

    expect((await gateway.current("2026-11", "EUR")).balanceMinorUnits).toBe(
      124760,
    );
    const page = await gateway.currentMovements("2026-11", "EUR", null);
    expect(page.data[0].key).toBe("OPERATION:7");
    expect(http.request).toHaveBeenNthCalledWith(
      1,
      "/accounts/current?month=2026-11&currency=EUR",
    );
    expect(http.request).toHaveBeenNthCalledWith(
      2,
      "/accounts/current/movements?month=2026-11&currency=EUR&limit=20",
    );
  });

  it("refuses an unreadable body and reports the HTTP status", async () => {
    await expect(
      new HttpVaultGateway(client(json({ data: { id: 1 } }))).account(1),
    ).rejects.toThrow();
    await expect(
      new HttpVaultGateway(client(json({}, 503))).accounts(null),
    ).rejects.toMatchObject({ status: 503, code: null });
  });
});

describe("HttpVaultGateway writes (#419)", () => {
  it("creates, renames, archives and links with the documented bodies", async () => {
    const http = client(
      json({ data: savingsAccount() }, 201),
      json({ data: savingsAccount() }),
      json({ data: savingsAccount() }),
      json({ data: savingsAccount() }),
    );
    const gateway = new HttpVaultGateway(http);

    await gateway.create({
      name: "Projet maison",
      currency: "EUR",
      initialBalanceMinorUnits: 200000,
    });
    await gateway.rename(1, "Maison");
    await gateway.archive(1);
    await gateway.linkGoal(1, 3);

    expect(sent(http, 0)).toEqual({
      path: "/savings-accounts",
      method: "POST",
      body: {
        name: "Projet maison",
        currency: "EUR",
        initialBalanceMinorUnits: 200000,
      },
    });
    expect(sent(http, 1)).toEqual({
      path: "/savings-accounts/1",
      method: "PATCH",
      body: { name: "Maison" },
    });
    expect(sent(http, 2)).toEqual({
      path: "/savings-accounts/1",
      method: "PATCH",
      body: { archived: true },
    });
    expect(sent(http, 3)).toEqual({
      path: "/savings-accounts/1/goal",
      method: "PUT",
      body: { goalId: 3 },
    });
  });

  it("sends a manual transfer with its idempotency key", async () => {
    const http = client(json({ data: savingsMovement() }, 201));

    await new HttpVaultGateway(http).transfer(1, {
      direction: "TO_SAVINGS",
      amountMinorUnits: 15000,
      operationDate: "2026-11-11",
      idempotencyKey: "manual:abc12345",
    });

    expect(sent(http)).toEqual({
      path: "/savings-accounts/1/transfers",
      method: "POST",
      body: {
        direction: "TO_SAVINGS",
        amountMinorUnits: 15000,
        operationDate: "2026-11-11",
        reason: "MANUAL",
        idempotencyKey: "manual:abc12345",
      },
    });
  });

  it("treats an acknowledged write as done even when its body is unreadable", async () => {
    const unreadable = new Response("<html>", { status: 201 });
    await expect(
      new HttpVaultGateway(client(unreadable)).transfer(1, {
        direction: "TO_SAVINGS",
        amountMinorUnits: 15000,
        operationDate: "2026-11-11",
        idempotencyKey: "manual:abc12345",
      }),
    ).resolves.toBeUndefined();
  });

  it("exposes the stable refusal code of the API", async () => {
    const refused = json(
      { error: { details: { code: "INSUFFICIENT_SAVINGS" } } },
      409,
    );
    const failure = await new HttpVaultGateway(client(refused))
      .transfer(1, {
        direction: "FROM_SAVINGS",
        amountMinorUnits: 999999,
        operationDate: "2026-11-11",
        idempotencyKey: "manual:abc12345",
      })
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(VaultRequestError);
    expect(failure).toMatchObject({
      status: 409,
      code: "INSUFFICIENT_SAVINGS",
    });
  });
});

import {
  CollectionPage,
  parseCollectionPage,
} from "@/src/features/operations/domain/oneOffOperation";
import {
  CurrentAccount,
  CurrentMovement,
  NewAccount,
  SavingsAccount,
  SavingsMovement,
  TransferAttempt,
  parseCurrentAccount,
  parseCurrentMovement,
  parseSavingsAccount,
  parseSavingsMovement,
} from "@/src/features/vault/domain/vault";

export interface VaultHttpClient {
  request(path: string, init?: RequestInit): Promise<Response>;
}

type Cursor = string | null;

export interface VaultGateway {
  accounts(cursor: Cursor): Promise<CollectionPage<SavingsAccount>>;
  account(id: number): Promise<SavingsAccount>;
  movements(
    id: number,
    cursor: Cursor,
  ): Promise<CollectionPage<SavingsMovement>>;
  current(month: string, currency: string): Promise<CurrentAccount>;
  currentMovements(
    month: string,
    currency: string,
    cursor: Cursor,
  ): Promise<CollectionPage<CurrentMovement>>;
  create(account: NewAccount): Promise<void>;
  rename(id: number, name: string): Promise<void>;
  archive(id: number): Promise<void>;
  linkGoal(id: number, goalId: number): Promise<void>;
  transfer(id: number, attempt: TransferAttempt): Promise<void>;
}

/** Refus HTTP ; `code` est le code stable `error.details.code` de l'API. */
export class VaultRequestError extends Error {
  public constructor(
    public readonly status: number,
    public readonly code: string | null,
  ) {
    super("Vault request failed");
    this.name = "VaultRequestError";
  }
}

const LIMIT = "20";
const paged = (params: Record<string, string>, cursor: Cursor) =>
  new URLSearchParams({
    ...params,
    limit: LIMIT,
    ...(cursor ? { cursor } : {}),
  }).toString();

const refusal = async (response: Response) => {
  const body: unknown = await response.json().catch(() => null);
  const code = (body as { error?: { details?: { code?: unknown } } } | null)
    ?.error?.details?.code;
  return new VaultRequestError(
    response.status,
    typeof code === "string" ? code : null,
  );
};

/** Coffre via `/v1`, mêmes routes que le Web (#395). */
export class HttpVaultGateway implements VaultGateway {
  public constructor(private readonly httpClient: VaultHttpClient) {}

  public async accounts(cursor: Cursor) {
    return parseCollectionPage(
      await this.get(`/savings-accounts?${paged({}, cursor)}`),
      parseSavingsAccount,
    );
  }

  public async account(id: number) {
    return parseSavingsAccount(await this.getData(`/savings-accounts/${id}`));
  }

  public async movements(id: number, cursor: Cursor) {
    return parseCollectionPage(
      await this.get(`/savings-accounts/${id}/movements?${paged({}, cursor)}`),
      parseSavingsMovement,
    );
  }

  public async current(month: string, currency: string) {
    return parseCurrentAccount(
      await this.getData(
        `/accounts/current?${new URLSearchParams({ month, currency }).toString()}`,
      ),
    );
  }

  public async currentMovements(
    month: string,
    currency: string,
    cursor: Cursor,
  ) {
    return parseCollectionPage(
      await this.get(
        `/accounts/current/movements?${paged({ month, currency }, cursor)}`,
      ),
      parseCurrentMovement,
    );
  }

  public create(account: NewAccount) {
    return this.write("POST", "/savings-accounts", {
      name: account.name,
      currency: account.currency,
      initialBalanceMinorUnits: account.initialBalanceMinorUnits,
    });
  }

  public rename(id: number, name: string) {
    return this.write("PATCH", `/savings-accounts/${id}`, { name });
  }

  public archive(id: number) {
    return this.write("PATCH", `/savings-accounts/${id}`, { archived: true });
  }

  public linkGoal(id: number, goalId: number) {
    return this.write("PUT", `/savings-accounts/${id}/goal`, { goalId });
  }

  public transfer(id: number, attempt: TransferAttempt) {
    return this.write("POST", `/savings-accounts/${id}/transfers`, {
      direction: attempt.direction,
      amountMinorUnits: attempt.amountMinorUnits,
      operationDate: attempt.operationDate,
      reason: "MANUAL",
      idempotencyKey: attempt.idempotencyKey,
    });
  }

  private async get(path: string): Promise<unknown> {
    const response = await this.httpClient.request(path);
    if (!response.ok) throw await refusal(response);
    return response.json();
  }

  private async getData(path: string): Promise<unknown> {
    const payload = await this.get(path);
    return typeof payload === "object" && payload !== null && "data" in payload
      ? payload.data
      : null;
  }

  /**
   * Une réponse 2xx clôt l'écriture, même illisible : son corps n'est pas
   * lu, les soldes sont relus sur le serveur par l'appelant.
   */
  private async write(method: string, path: string, body: unknown) {
    const response = await this.httpClient.request(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw await refusal(response);
  }
}

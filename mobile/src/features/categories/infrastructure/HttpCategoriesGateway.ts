import {
  CategoryDraft,
  CategoryErrorCode,
  toCategoryPayload,
} from "@/src/features/categories/domain/categoryDraft";
import {
  OperationCategory,
  parseCategory,
} from "@/src/features/operations/domain/oneOffOperation";
import {
  HttpOneOffOperationsGateway,
  OperationsHttpClient,
} from "@/src/features/operations/infrastructure/HttpOneOffOperationsGateway";

export interface CategoriesGateway {
  listAll(): Promise<OperationCategory[]>;
  create(draft: CategoryDraft): Promise<OperationCategory>;
  update(id: number, draft: CategoryDraft): Promise<OperationCategory>;
  remove(id: number): Promise<void>;
}

/** Refus de l'API avec son code stable (`error.details.code`). */
export class CategoryRequestError extends Error {
  public constructor(
    public readonly status: number,
    public readonly code: CategoryErrorCode,
  ) {
    super("Category request failed");
    this.name = "CategoryRequestError";
  }
}

const assertId = (id: number) => {
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid category id");
};

const requestError = async (response: Response) => {
  const body = (await response.json().catch(() => null)) as {
    error?: { details?: { code?: unknown } };
  } | null;
  const code = body?.error?.details?.code;
  return new CategoryRequestError(
    response.status,
    typeof code === "string"
      ? code
      : response.status === 404
        ? "CATEGORY_NOT_FOUND"
        : null,
  );
};

export class HttpCategoriesGateway implements CategoriesGateway {
  private readonly operations: HttpOneOffOperationsGateway;

  public constructor(private readonly httpClient: OperationsHttpClient) {
    this.operations = new HttpOneOffOperationsGateway(httpClient);
  }

  public listAll(): Promise<OperationCategory[]> {
    return this.operations.listAllCategories();
  }

  public create(draft: CategoryDraft): Promise<OperationCategory> {
    return this.save("/operation-categories", "POST", draft);
  }

  public async update(
    id: number,
    draft: CategoryDraft,
  ): Promise<OperationCategory> {
    assertId(id);
    return this.save(`/operation-categories/${id}`, "PUT", draft);
  }

  public async remove(id: number): Promise<void> {
    assertId(id);
    const response = await this.httpClient.request(
      `/operation-categories/${id}`,
      { method: "DELETE" },
    );
    if (!response.ok) throw await requestError(response);
  }

  private async save(
    path: string,
    method: "POST" | "PUT",
    draft: CategoryDraft,
  ): Promise<OperationCategory> {
    const response = await this.httpClient.request(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toCategoryPayload(draft)),
    });
    if (!response.ok) throw await requestError(response);
    const payload = (await response.json()) as { data?: unknown } | null;
    return parseCategory(payload?.data);
  }
}

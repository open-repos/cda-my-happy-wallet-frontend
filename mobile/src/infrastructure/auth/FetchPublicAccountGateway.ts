import {
  PublicAccountError,
  PublicAccountGateway,
  RegistrationDraft,
  normalizeEmail,
} from "@/src/features/auth/account/PublicAccountGateway";

type FetchImplementation = typeof fetch;

export class FetchPublicAccountGateway implements PublicAccountGateway {
  private readonly apiBaseUrl: string;

  public constructor(
    apiBaseUrl: string,
    private readonly fetchImplementation: FetchImplementation = (...args) =>
      fetch(...args),
  ) {
    this.apiBaseUrl = apiBaseUrl.replace(/\/+$/, "");
  }

  public register(draft: RegistrationDraft): Promise<void> {
    return this.post("/users/register", {
      firstname: draft.firstname.trim(),
      lastname: draft.lastname.trim(),
      email: normalizeEmail(draft.email),
      password: draft.password,
      confirmpassword: draft.confirmpassword,
    });
  }

  public requestPasswordReset(email: string): Promise<void> {
    return this.post("/users/reset-password", { email: normalizeEmail(email) });
  }

  private async post(
    path: string,
    body: Record<string, string>,
  ): Promise<void> {
    let response: Response;
    try {
      response = await this.fetchImplementation(`${this.apiBaseUrl}${path}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch {
      throw new PublicAccountError("network");
    }

    if (response.ok) {
      return;
    }
    if (response.status === 400 || response.status === 422) {
      throw new PublicAccountError("validation", response.status);
    }
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("Retry-After"));
      throw new PublicAccountError(
        "rate_limited",
        response.status,
        Number.isFinite(retryAfter) ? retryAfter : undefined,
      );
    }
    throw new PublicAccountError("http", response.status);
  }
}

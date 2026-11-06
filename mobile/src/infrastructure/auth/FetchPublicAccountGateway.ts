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

  public verifyPasswordResetToken(token: string): Promise<void> {
    // Le cookie httpOnly posé ici est relu par POST /users/new-password.
    return this.send(`/users/reset-password/${encodeURIComponent(token)}`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
  }

  public setNewPassword(
    password: string,
    confirmPassword: string,
  ): Promise<void> {
    return this.post(
      "/users/new-password",
      { password, confirmPassword },
      { credentials: "include" },
    );
  }

  private post(
    path: string,
    body: Record<string, string>,
    options: Pick<RequestInit, "credentials"> = {},
  ): Promise<void> {
    return this.send(path, {
      method: "POST",
      ...options,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  private async send(path: string, init: RequestInit): Promise<void> {
    let response: Response;
    try {
      response = await this.fetchImplementation(
        `${this.apiBaseUrl}${path}`,
        init,
      );
    } catch {
      // L'erreur d'origine peut contenir l'URL, donc le jeton : non relayée.
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

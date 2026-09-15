import {
  AuthCredentials,
  AuthGateway,
  AuthGatewayError,
  AuthSession,
  AuthUser,
} from "@/src/features/auth/session/AuthGateway";

type FetchImplementation = typeof fetch;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asPositiveNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;

const parseAuthSession = (value: unknown): AuthSession => {
  if (!isRecord(value) || value.success !== true || !isRecord(value.payload)) {
    throw new AuthGatewayError("invalid_response");
  }

  const payload = value.payload;
  const user = payload.user;
  const accessTokenExpiresIn = asPositiveNumber(payload.accessTokenExpiresIn);
  const refreshTokenExpiresIn = asPositiveNumber(payload.refreshTokenExpiresIn);

  if (
    !isRecord(user) ||
    typeof user.email !== "string" ||
    typeof payload.accessToken !== "string" ||
    payload.accessToken.length === 0 ||
    accessTokenExpiresIn == null ||
    typeof payload.refreshToken !== "string" ||
    payload.refreshToken.length === 0 ||
    refreshTokenExpiresIn == null
  ) {
    throw new AuthGatewayError("invalid_response");
  }

  return {
    user: user as AuthUser,
    accessToken: payload.accessToken,
    accessTokenExpiresIn,
    refreshToken: payload.refreshToken,
    refreshTokenExpiresIn,
  };
};

export class FetchAuthGateway implements AuthGateway {
  private readonly apiBaseUrl: string;

  public constructor(
    apiBaseUrl: string,
    private readonly fetchImplementation: FetchImplementation = (...args) =>
      fetch(...args),
  ) {
    this.apiBaseUrl = apiBaseUrl.replace(/\/+$/, "");
  }

  public createSession(credentials: AuthCredentials): Promise<AuthSession> {
    return this.requestSession("/auth/native/sessions", { ...credentials });
  }

  public refreshSession(refreshToken: string): Promise<AuthSession> {
    return this.requestSession("/auth/native/sessions/refresh", {
      refreshToken,
    });
  }

  public async revokeSession(refreshToken: string): Promise<void> {
    const response = await this.request("/auth/native/sessions/revoke", {
      refreshToken,
    });

    if (response.status !== 204) {
      throw this.toResponseError(response);
    }
  }

  private async requestSession(
    path: string,
    body: Record<string, unknown>,
  ): Promise<AuthSession> {
    const response = await this.request(path, body);
    if (!response.ok) {
      throw this.toResponseError(response);
    }

    try {
      return parseAuthSession(await response.json());
    } catch (error) {
      if (error instanceof AuthGatewayError) {
        throw error;
      }
      throw new AuthGatewayError("invalid_response");
    }
  }

  private async request(
    path: string,
    body: Record<string, unknown>,
  ): Promise<Response> {
    try {
      return await this.fetchImplementation(`${this.apiBaseUrl}${path}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch {
      throw new AuthGatewayError("network");
    }
  }

  private toResponseError(response: Response): AuthGatewayError {
    if (response.status === 401) {
      return new AuthGatewayError("unauthorized", response.status);
    }
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("Retry-After"));
      return new AuthGatewayError(
        "rate_limited",
        response.status,
        Number.isFinite(retryAfter) ? retryAfter : undefined,
      );
    }
    return new AuthGatewayError("http", response.status);
  }
}

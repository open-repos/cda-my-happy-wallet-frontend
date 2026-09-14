export type AuthCredentials = {
  email: string;
  password: string;
};

export type AuthUser = Record<string, unknown> & {
  email: string;
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresIn: number;
};

export type AuthGatewayErrorKind =
  | "unauthorized"
  | "rate_limited"
  | "network"
  | "invalid_response"
  | "http";

export class AuthGatewayError extends Error {
  public constructor(
    public readonly kind: AuthGatewayErrorKind,
    public readonly status?: number,
    public readonly retryAfterSeconds?: number,
  ) {
    super(`Authentication request failed: ${kind}`);
    this.name = "AuthGatewayError";
  }
}

export const isUnauthorizedAuthError = (error: unknown): boolean =>
  error instanceof AuthGatewayError && error.kind === "unauthorized";

export interface AuthGateway {
  createSession(credentials: AuthCredentials): Promise<AuthSession>;
  refreshSession(refreshToken: string): Promise<AuthSession>;
  revokeSession(refreshToken: string): Promise<void>;
}

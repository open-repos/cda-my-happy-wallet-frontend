import {
  AuthCredentials,
  AuthGateway,
  AuthSession,
  AuthUser,
  isUnauthorizedAuthError,
} from "./AuthGateway";
import { SessionVault } from "./SessionVault";

type ActiveSession = {
  user: AuthUser;
  accessToken: string;
  accessTokenExpiresAt: number;
};

export type AuthSessionState =
  | { status: "restoring" }
  | { status: "anonymous" }
  | { status: "unavailable" }
  | ({ status: "authenticated" } & ActiveSession)
  | ({ status: "refreshing" } & ActiveSession);

type SessionListener = (state: AuthSessionState) => void;

export class AuthSessionManager {
  private state: AuthSessionState = { status: "restoring" };
  private readonly listeners = new Set<SessionListener>();
  private refreshFlight: Promise<string> | null = null;

  public constructor(
    private readonly authGateway: AuthGateway,
    private readonly sessionVault: SessionVault,
    private readonly now: () => number = () => Date.now(),
  ) {}

  public getSnapshot(): AuthSessionState {
    return this.state;
  }

  public subscribe(listener: SessionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public getAccessToken(): string | null {
    return this.state.status === "authenticated" ||
      this.state.status === "refreshing"
      ? this.state.accessToken
      : null;
  }

  public async bootstrap(): Promise<void> {
    this.publish({ status: "restoring" });
    let refreshToken: string | null;

    try {
      refreshToken = await this.sessionVault.readRefreshToken();
    } catch (error) {
      this.publish({ status: "unavailable" });
      throw error;
    }

    if (refreshToken == null) {
      this.publish({ status: "anonymous" });
      return;
    }

    await this.startRefresh(refreshToken);
  }

  public async signIn(credentials: AuthCredentials): Promise<void> {
    const session = await this.authGateway.createSession(credentials);

    try {
      await this.sessionVault.writeRefreshToken(session.refreshToken);
    } catch (error) {
      try {
        await this.authGateway.revokeSession(session.refreshToken);
      } catch {
        // The local write error remains authoritative for the caller.
      }
      this.publish({ status: "anonymous" });
      throw error;
    }

    this.publishAuthenticated(session);
  }

  public refreshAccessToken(): Promise<string> {
    return this.startRefresh();
  }

  public async signOut(): Promise<void> {
    let refreshToken: string | null = null;

    try {
      refreshToken = await this.sessionVault.readRefreshToken();
      if (refreshToken != null) {
        await this.authGateway.revokeSession(refreshToken);
      }
    } catch {
      // Local logout must complete even when reading or revoking fails.
    }

    try {
      await this.sessionVault.clearRefreshToken();
    } finally {
      this.publish({ status: "anonymous" });
    }
  }

  private startRefresh(refreshToken?: string): Promise<string> {
    if (this.refreshFlight != null) {
      return this.refreshFlight;
    }

    const flight = this.rotateSession(refreshToken);
    this.refreshFlight = flight;
    void flight.then(
      () => this.clearRefreshFlight(flight),
      () => this.clearRefreshFlight(flight),
    );

    return flight;
  }

  private async rotateSession(knownRefreshToken?: string): Promise<string> {
    const previousSession = this.getActiveSession();
    const refreshToken =
      knownRefreshToken ?? (await this.sessionVault.readRefreshToken());

    if (refreshToken == null) {
      this.publish({ status: "anonymous" });
      throw new Error("No refresh token is available");
    }

    if (previousSession != null) {
      this.publish({ status: "refreshing", ...previousSession });
    }

    try {
      const session = await this.authGateway.refreshSession(refreshToken);
      await this.sessionVault.writeRefreshToken(session.refreshToken);
      this.publishAuthenticated(session);
      return session.accessToken;
    } catch (error) {
      if (isUnauthorizedAuthError(error)) {
        try {
          await this.sessionVault.clearRefreshToken();
        } finally {
          this.publish({ status: "anonymous" });
        }
      } else if (previousSession != null) {
        this.publish({ status: "authenticated", ...previousSession });
      } else {
        this.publish({ status: "unavailable" });
      }
      throw error;
    }
  }

  private publishAuthenticated(session: AuthSession): void {
    this.publish({
      status: "authenticated",
      user: session.user,
      accessToken: session.accessToken,
      accessTokenExpiresAt: this.now() + session.accessTokenExpiresIn * 1000,
    });
  }

  private getActiveSession(): ActiveSession | null {
    return this.state.status === "authenticated" ||
      this.state.status === "refreshing"
      ? {
          user: this.state.user,
          accessToken: this.state.accessToken,
          accessTokenExpiresAt: this.state.accessTokenExpiresAt,
        }
      : null;
  }

  private publish(state: AuthSessionState): void {
    this.state = state;
    this.listeners.forEach((listener) => listener(state));
  }

  private clearRefreshFlight(flight: Promise<string>): void {
    if (this.refreshFlight === flight) {
      this.refreshFlight = null;
    }
  }
}

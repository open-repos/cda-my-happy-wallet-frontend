import { AuthCredentials, AuthGateway, AuthSession } from "../AuthGateway";

const notConfigured = (): never => {
  throw new Error("FakeAuthGateway response is not configured");
};

export class FakeAuthGateway implements AuthGateway {
  public readonly createCalls: AuthCredentials[] = [];
  public readonly refreshCalls: string[] = [];
  public readonly revokeCalls: string[] = [];

  public createImplementation: (
    credentials: AuthCredentials,
  ) => Promise<AuthSession> = async () => notConfigured();

  public refreshImplementation: (refreshToken: string) => Promise<AuthSession> =
    async () => notConfigured();

  public revokeImplementation: (refreshToken: string) => Promise<void> =
    async () => undefined;

  public async createSession(
    credentials: AuthCredentials,
  ): Promise<AuthSession> {
    this.createCalls.push(credentials);
    return this.createImplementation(credentials);
  }

  public async refreshSession(refreshToken: string): Promise<AuthSession> {
    this.refreshCalls.push(refreshToken);
    return this.refreshImplementation(refreshToken);
  }

  public async revokeSession(refreshToken: string): Promise<void> {
    this.revokeCalls.push(refreshToken);
    return this.revokeImplementation(refreshToken);
  }
}

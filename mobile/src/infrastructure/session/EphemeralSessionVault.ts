import { SessionVault } from "@/src/features/auth/session/SessionVault";

export class EphemeralSessionVault implements SessionVault {
  private refreshToken: string | null = null;

  public async readRefreshToken(): Promise<string | null> {
    return this.refreshToken;
  }

  public async writeRefreshToken(refreshToken: string): Promise<void> {
    this.refreshToken = refreshToken;
  }

  public async clearRefreshToken(): Promise<void> {
    this.refreshToken = null;
  }
}

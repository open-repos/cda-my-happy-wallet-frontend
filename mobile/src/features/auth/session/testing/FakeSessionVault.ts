import { SessionVault } from "../SessionVault";

export class FakeSessionVault implements SessionVault {
  public readCount = 0;
  public writtenTokens: string[] = [];
  public clearCount = 0;

  public constructor(private refreshToken: string | null = null) {}

  public async readRefreshToken(): Promise<string | null> {
    this.readCount += 1;
    return this.refreshToken;
  }

  public async writeRefreshToken(refreshToken: string): Promise<void> {
    this.writtenTokens.push(refreshToken);
    this.refreshToken = refreshToken;
  }

  public async clearRefreshToken(): Promise<void> {
    this.clearCount += 1;
    this.refreshToken = null;
  }
}

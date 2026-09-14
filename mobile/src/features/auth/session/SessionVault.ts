export interface SessionVault {
  readRefreshToken(): Promise<string | null>;
  writeRefreshToken(refreshToken: string): Promise<void>;
  clearRefreshToken(): Promise<void>;
}

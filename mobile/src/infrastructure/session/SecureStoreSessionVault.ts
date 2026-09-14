import * as SecureStore from "expo-secure-store";
import { SecureStoreOptions } from "expo-secure-store";

import { SessionVault } from "@/src/features/auth/session/SessionVault";

export const REFRESH_TOKEN_STORAGE_KEY =
  "my-happy-wallet.auth.refresh-token.v1";

const secureStoreOptions: SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  keychainService: "com.andriacapai.myhappywallet.session",
  requireAuthentication: false,
};

export interface SecureStoreDriver {
  getItemAsync(
    key: string,
    options?: SecureStoreOptions,
  ): Promise<string | null>;
  setItemAsync(
    key: string,
    value: string,
    options?: SecureStoreOptions,
  ): Promise<void>;
  deleteItemAsync(key: string, options?: SecureStoreOptions): Promise<void>;
}

export class SecureStoreSessionVault implements SessionVault {
  public constructor(
    private readonly secureStore: SecureStoreDriver = SecureStore,
  ) {}

  public readRefreshToken(): Promise<string | null> {
    return this.secureStore.getItemAsync(
      REFRESH_TOKEN_STORAGE_KEY,
      secureStoreOptions,
    );
  }

  public async writeRefreshToken(refreshToken: string): Promise<void> {
    if (refreshToken.trim().length === 0 || refreshToken.length > 4096) {
      throw new Error("Refresh token cannot be stored");
    }

    await this.secureStore.setItemAsync(
      REFRESH_TOKEN_STORAGE_KEY,
      refreshToken,
      secureStoreOptions,
    );
  }

  public clearRefreshToken(): Promise<void> {
    return this.secureStore.deleteItemAsync(
      REFRESH_TOKEN_STORAGE_KEY,
      secureStoreOptions,
    );
  }
}

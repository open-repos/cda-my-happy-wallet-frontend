import { environment } from "@/src/config/environment";
import { AuthSessionManager } from "@/src/features/auth/session/AuthSessionManager";
import { FetchAuthGateway } from "@/src/infrastructure/auth/FetchAuthGateway";
import { AuthorizedHttpClient } from "@/src/infrastructure/http/AuthorizedHttpClient";
import { EphemeralSessionVault } from "@/src/infrastructure/session/EphemeralSessionVault";
import { SecureStoreSessionVault } from "@/src/infrastructure/session/SecureStoreSessionVault";
import { Platform } from "react-native";

export interface AuthRuntime {
  sessionManager: AuthSessionManager;
  httpClient: AuthorizedHttpClient;
}

export const createAuthRuntime = (): AuthRuntime => {
  const sessionVault =
    Platform.OS === "web"
      ? new EphemeralSessionVault()
      : new SecureStoreSessionVault();
  const sessionManager = new AuthSessionManager(
    new FetchAuthGateway(environment.apiBaseUrl),
    sessionVault,
  );

  return {
    sessionManager,
    httpClient: new AuthorizedHttpClient(
      environment.apiBaseUrl,
      sessionManager,
    ),
  };
};

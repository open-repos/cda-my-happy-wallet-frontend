import { environment } from "@/src/config/environment";
import { AuthSessionManager } from "@/src/features/auth/session/AuthSessionManager";
import { FetchAuthGateway } from "@/src/infrastructure/auth/FetchAuthGateway";
import { AuthorizedHttpClient } from "@/src/infrastructure/http/AuthorizedHttpClient";
import { SecureStoreSessionVault } from "@/src/infrastructure/session/SecureStoreSessionVault";

export interface AuthRuntime {
  sessionManager: AuthSessionManager;
  httpClient: AuthorizedHttpClient;
}

export const createAuthRuntime = (): AuthRuntime => {
  const sessionManager = new AuthSessionManager(
    new FetchAuthGateway(environment.apiBaseUrl),
    new SecureStoreSessionVault(),
  );

  return {
    sessionManager,
    httpClient: new AuthorizedHttpClient(
      environment.apiBaseUrl,
      sessionManager,
    ),
  };
};

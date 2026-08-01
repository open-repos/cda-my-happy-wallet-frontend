import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import {
  AuthRuntime,
  createAuthRuntime,
} from "@/src/composition/createAuthRuntime";
import { AuthCredentials } from "@/src/features/auth/session/AuthGateway";
import { AuthSessionState } from "@/src/features/auth/session/AuthSessionManager";
import { AuthorizedHttpClient } from "@/src/infrastructure/http/AuthorizedHttpClient";

interface AuthContextValue {
  state: AuthSessionState;
  httpClient: AuthorizedHttpClient;
  restore(): Promise<void>;
  signIn(credentials: AuthCredentials): Promise<void>;
  signOut(): Promise<void>;
}

interface AuthProviderProps extends PropsWithChildren {
  runtime?: AuthRuntime;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children, runtime }: AuthProviderProps) => {
  const [authRuntime] = useState(() => runtime ?? createAuthRuntime());
  const { sessionManager } = authRuntime;

  const subscribe = useCallback(
    (listener: () => void) => sessionManager.subscribe(listener),
    [sessionManager],
  );
  const getSnapshot = useCallback(
    () => sessionManager.getSnapshot(),
    [sessionManager],
  );
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const restore = useCallback(
    () => sessionManager.bootstrap(),
    [sessionManager],
  );
  const signIn = useCallback(
    (credentials: AuthCredentials) => sessionManager.signIn(credentials),
    [sessionManager],
  );
  const signOut = useCallback(() => sessionManager.signOut(), [sessionManager]);

  useEffect(() => {
    void restore().catch(() => undefined);
  }, [restore]);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      httpClient: authRuntime.httpClient,
      restore,
      signIn,
      signOut,
    }),
    [authRuntime.httpClient, restore, signIn, signOut, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context == null) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export interface AuthorizedSession {
  getAccessToken(): string | null;
  refreshAccessToken(): Promise<string>;
}

export class AuthenticationRequiredError extends Error {
  public constructor() {
    super("An authenticated session is required");
    this.name = "AuthenticationRequiredError";
  }
}

type FetchImplementation = typeof fetch;

export class AuthorizedHttpClient {
  private readonly apiBaseUrl: string;

  public constructor(
    apiBaseUrl: string,
    private readonly session: AuthorizedSession,
    private readonly fetchImplementation: FetchImplementation = (...args) =>
      fetch(...args),
  ) {
    this.apiBaseUrl = apiBaseUrl.replace(/\/+$/, "");
  }

  public async request(
    path: string,
    init: RequestInit = {},
  ): Promise<Response> {
    const accessToken = this.session.getAccessToken();
    if (accessToken == null) {
      throw new AuthenticationRequiredError();
    }

    const response = await this.dispatch(path, init, accessToken);
    if (response.status !== 401) {
      return response;
    }

    const refreshedAccessToken = await this.session.refreshAccessToken();
    return this.dispatch(path, init, refreshedAccessToken);
  }

  private dispatch(
    path: string,
    init: RequestInit,
    accessToken: string,
  ): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${accessToken}`);

    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return this.fetchImplementation(`${this.apiBaseUrl}${normalizedPath}`, {
      ...init,
      headers,
    });
  }
}

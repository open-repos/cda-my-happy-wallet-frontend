const SESSION_REFRESH_LOCK = "mhw-session-refresh";
const SESSION_REFRESH_LOCK_WAIT_MS = 15000;

// Tabs share the rotating refresh cookie: a renewal sent while another is in
// flight presents a rotated token, which the server revokes as a replay. The
// browser sends the latest cookie once the lock is granted.
export const runWithSessionRefreshLock = async (
  task,
  locks = globalThis.navigator?.locks
) => {
  if (locks == null) {
    return task();
  }

  let started = false;
  try {
    return await locks.request(
      SESSION_REFRESH_LOCK,
      { signal: AbortSignal.timeout(SESSION_REFRESH_LOCK_WAIT_MS) },
      () => {
        started = true;
        return task();
      }
    );
  } catch (error) {
    if (started) {
      throw error;
    }
    return task();
  }
};

export const createRefreshTokenHandler = ({
  store,
  decodeToken,
  createRefreshAction,
  getStoredUser,
  now = () => Date.now(),
  runExclusive = runWithSessionRefreshLock,
}) => {
  let refreshInFlight = null;

  return async (request) => {
    const user = store?.getState()?.auth?.user;
    const accessToken = user?.payload?.accessToken;

    if (!accessToken) {
      return request;
    }

    request.headers.Authorization = `Bearer ${accessToken}`;

    const decodedToken = decodeToken(accessToken);
    const isExpired = decodedToken.exp * 1000 < now();

    if (!isExpired) {
      return request;
    }

    const body = {
      grant_type: "refresh_token",
      email: user.payload.user.email,
    };

    if (refreshInFlight == null) {
      refreshInFlight = Promise.resolve(
        runExclusive(() =>
          store.dispatch(createRefreshAction({ body, accessToken }))
        )
      ).finally(() => {
        refreshInFlight = null;
      });
    }

    await refreshInFlight;

    const refreshedUser = store?.getState()?.auth?.user;
    if (refreshedUser == null) {
      getStoredUser("user");
      throw new Error("Session renewal failed");
    }

    const refreshedAccessToken = refreshedUser.payload.accessToken;
    request.headers.Authorization = `Bearer ${refreshedAccessToken}`;
    request.withCredentials = true;

    return request;
  };
};

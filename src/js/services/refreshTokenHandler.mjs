export const createRefreshTokenHandler = ({
  store,
  decodeToken,
  createRefreshAction,
  getStoredUser,
  now = () => Date.now(),
}) => {
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

    await store.dispatch(createRefreshAction({ body, accessToken }));

    const refreshedUser = store?.getState()?.auth?.user;
    if (refreshedUser == null) {
      getStoredUser("user");
      return request;
    }

    const refreshedAccessToken = refreshedUser.payload.accessToken;
    request.headers.Authorization = `Bearer ${refreshedAccessToken}`;
    request.withCredentials = true;

    return request;
  };
};

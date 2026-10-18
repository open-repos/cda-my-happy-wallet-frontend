import assert from "assert";
import { createRefreshTokenHandler } from "../src/js/services/refreshTokenHandler.mjs";

const createRequest = () => ({ headers: {} });

const createStore = (initialUser, onDispatch = async () => {}) => {
  let user = initialUser;

  return {
    getState: () => ({ auth: { user } }),
    dispatch: async (action) => {
      const nextUser = await onDispatch(action);
      if (nextUser !== undefined) {
        user = nextUser;
      }
      return action;
    },
  };
};

const createUser = (accessToken) => ({
  payload: {
    accessToken,
    user: {
      email: "user@example.com",
    },
  },
});

const refreshAction = (payload) => ({
  type: "auth/renewAccessToken",
  payload,
});

const noUserStore = createStore(null);
const noUserHandler = createRefreshTokenHandler({
  store: noUserStore,
  decodeToken: () => ({ exp: 0 }),
  createRefreshAction: refreshAction,
  getStoredUser: () => null,
});
const noUserRequest = createRequest();

assert.strictEqual(await noUserHandler(noUserRequest), noUserRequest);
assert.deepStrictEqual(noUserRequest.headers, {});

let validTokenDispatchCount = 0;
const validTokenStore = createStore(
  createUser("valid.access.token"),
  async () => {
    validTokenDispatchCount += 1;
  }
);
const validTokenHandler = createRefreshTokenHandler({
  store: validTokenStore,
  decodeToken: () => ({ exp: 200 }),
  createRefreshAction: refreshAction,
  getStoredUser: () => null,
  now: () => 100000,
});
const validTokenRequest = createRequest();

await validTokenHandler(validTokenRequest);

assert.strictEqual(
  validTokenRequest.headers.Authorization,
  "Bearer valid.access.token"
);
assert.strictEqual(validTokenDispatchCount, 0);

let dispatchedRefreshAction;
const refreshedUser = createUser("refreshed.access.token");
const expiredTokenStore = createStore(
  createUser("expired.access.token"),
  async (action) => {
    dispatchedRefreshAction = action;
    return refreshedUser;
  }
);
const expiredTokenHandler = createRefreshTokenHandler({
  store: expiredTokenStore,
  decodeToken: () => ({ exp: 50 }),
  createRefreshAction: refreshAction,
  getStoredUser: () => null,
  now: () => 100000,
});
const expiredTokenRequest = createRequest();

await expiredTokenHandler(expiredTokenRequest);

assert.deepStrictEqual(dispatchedRefreshAction, {
  type: "auth/renewAccessToken",
  payload: {
    body: {
      grant_type: "refresh_token",
      email: "user@example.com",
    },
    accessToken: "expired.access.token",
  },
});
assert.strictEqual(
  expiredTokenRequest.headers.Authorization,
  "Bearer refreshed.access.token"
);
assert.strictEqual(expiredTokenRequest.withCredentials, true);

let storageReadCount = 0;
const refusedRefreshStore = createStore(
  createUser("expired.access.token"),
  async () => null
);
const refusedRefreshHandler = createRefreshTokenHandler({
  store: refusedRefreshStore,
  decodeToken: () => ({ exp: 50 }),
  createRefreshAction: refreshAction,
  getStoredUser: () => {
    storageReadCount += 1;
    return null;
  },
  now: () => 100000,
});
const refusedRefreshRequest = createRequest();

await assert.rejects(
  refusedRefreshHandler(refusedRefreshRequest),
  /Session renewal failed/
);
assert.strictEqual(refusedRefreshRequest.withCredentials, undefined);
assert.strictEqual(storageReadCount, 1);

let concurrentDispatchCount = 0;
let releaseRefresh;
const refreshGate = new Promise((resolve) => {
  releaseRefresh = resolve;
});
const concurrentStore = createStore(
  createUser("expired.access.token"),
  async () => {
    concurrentDispatchCount += 1;
    await refreshGate;
    return createUser("shared.refreshed.access.token");
  }
);
const concurrentHandler = createRefreshTokenHandler({
  store: concurrentStore,
  decodeToken: (token) => ({
    exp: token === "expired.access.token" ? 50 : 200,
  }),
  createRefreshAction: refreshAction,
  getStoredUser: () => null,
  now: () => 100000,
});
const firstConcurrentRequest = createRequest();
const secondConcurrentRequest = createRequest();
const firstRefresh = concurrentHandler(firstConcurrentRequest);
const secondRefresh = concurrentHandler(secondConcurrentRequest);

await Promise.resolve();
assert.strictEqual(concurrentDispatchCount, 1);
releaseRefresh();
await Promise.all([firstRefresh, secondRefresh]);

assert.strictEqual(
  firstConcurrentRequest.headers.Authorization,
  "Bearer shared.refreshed.access.token"
);
assert.strictEqual(
  secondConcurrentRequest.headers.Authorization,
  "Bearer shared.refreshed.access.token"
);
assert.strictEqual(firstConcurrentRequest.withCredentials, true);
assert.strictEqual(secondConcurrentRequest.withCredentials, true);

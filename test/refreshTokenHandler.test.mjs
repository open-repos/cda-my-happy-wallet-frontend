import assert from "assert";
import {
  createRefreshTokenHandler,
  runWithSessionRefreshLock,
} from "../src/js/services/refreshTokenHandler.mjs";

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

// Browser tabs share the rotating cookie but not their in-memory state.
const createSharedLocks = () => {
  let tail = Promise.resolve();
  return {
    request: (_name, _options, task) => {
      const result = tail.then(() => task());
      tail = result.catch(() => {});
      return result;
    },
  };
};

const createRotatingServer = () => {
  const presented = [];
  let cookie = 0;
  let revoked = false;
  return {
    presented,
    isRevoked: () => revoked,
    renew: async () => {
      const sent = cookie;
      presented.push(sent);
      await new Promise((resolve) => setTimeout(resolve, 5));
      if (sent !== cookie) {
        revoked = true;
        return false;
      }
      cookie += 1;
      return true;
    },
  };
};

const createTab = (server, locks) => {
  const store = createStore(createUser("expired.access.token"), async () => {
    const renewed = await server.renew();
    return renewed ? createUser("renewed.access.token") : null;
  });
  return createRefreshTokenHandler({
    store,
    decodeToken: (token) => ({ exp: token.startsWith("expired") ? 0 : 200 }),
    createRefreshAction: refreshAction,
    getStoredUser: () => null,
    now: () => 100000,
    runExclusive: (task) => runWithSessionRefreshLock(task, locks),
  });
};

const server = createRotatingServer();
const locks = createSharedLocks();
const tabRequests = [createRequest(), createRequest()];
await Promise.all(
  [createTab(server, locks), createTab(server, locks)].map((tab, index) =>
    tab(tabRequests[index])
  )
);
assert.deepStrictEqual(server.presented, [0, 1]);
assert.strictEqual(server.isRevoked(), false);
for (const request of tabRequests) {
  assert.strictEqual(
    request.headers.Authorization,
    "Bearer renewed.access.token"
  );
}

// Without Web Locks, the renewal still runs.
assert.strictEqual(
  await runWithSessionRefreshLock(async () => "ran", null),
  "ran"
);

// A lock that cannot be acquired must not leave requests waiting forever.
let lockOptions;
assert.strictEqual(
  await runWithSessionRefreshLock(async () => "ran", {
    request: async (_name, options) => {
      lockOptions = options;
      throw new DOMException("Timed out", "TimeoutError");
    },
  }),
  "ran"
);
assert.ok(lockOptions.signal instanceof AbortSignal);

// A failure of the renewal itself is not retried outside the lock.
let failingRuns = 0;
await assert.rejects(
  runWithSessionRefreshLock(
    async () => {
      failingRuns += 1;
      throw new Error("renewal failed");
    },
    { request: async (_name, _options, task) => task() }
  ),
  /renewal failed/
);
assert.strictEqual(failingRuns, 1);

// Production wiring: without an injected runner, the handler takes the browser lock.
let lockRequests = 0;
const browserNavigator = Object.getOwnPropertyDescriptor(
  globalThis,
  "navigator"
);
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: {
    locks: {
      request: async (_name, _options, task) => {
        lockRequests += 1;
        return task();
      },
    },
  },
});
const wiredStore = createStore(createUser("expired.access.token"), async () =>
  createUser("renewed.access.token")
);
await createRefreshTokenHandler({
  store: wiredStore,
  decodeToken: () => ({ exp: 0 }),
  createRefreshAction: refreshAction,
  getStoredUser: () => null,
  now: () => 100000,
})(createRequest());
assert.strictEqual(lockRequests, 1);
if (browserNavigator) {
  Object.defineProperty(globalThis, "navigator", browserNavigator);
} else {
  delete globalThis.navigator;
}

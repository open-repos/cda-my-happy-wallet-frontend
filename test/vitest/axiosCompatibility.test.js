import axios, { AxiosHeaders } from "axios";
import { expect, it, vi } from "vitest";
import { createRefreshTokenHandler } from "../../src/js/services/refreshTokenHandler.mjs";

const user = (accessToken) => ({
  payload: { accessToken, user: { email: "synthetic@example.test" } },
});
const reply = (config) => ({
  config,
  data: { data: [] },
  headers: {},
  status: 200,
  statusText: "OK",
});
function clientFor(
  initialUser,
  renew = async () => user("renewed.synthetic.token")
) {
  let currentUser = initialUser;
  const dispatch = vi.fn(async () => {
    currentUser = await renew();
  });
  const adapter = vi.fn(async (config) => reply(config));
  const client = axios.create({
    baseURL: "http://127.0.0.1:4201/v1/",
    adapter,
  });
  client.interceptors.request.use(
    createRefreshTokenHandler({
      store: { getState: () => ({ auth: { user: currentUser } }), dispatch },
      decodeToken: (token) => ({ exp: token.startsWith("expired") ? 1 : 1000 }),
      createRefreshAction: (payload) => ({ type: "synthetic/renew", payload }),
      getStoredUser: () => null,
      now: () => 10_000,
    })
  );
  return { client, adapter, dispatch };
}

it("keeps anonymous requests anonymous while preserving cookie credentials", async () => {
  const { client, adapter, dispatch } = clientFor(null);
  await client.get("/operations", { withCredentials: true });
  const config = adapter.mock.calls[0][0];
  expect(config.headers).toBeInstanceOf(AxiosHeaders);
  expect(config.headers.get("Authorization")).toBeUndefined();
  expect(config.withCredentials).toBe(true);
  expect(dispatch).not.toHaveBeenCalled();
});

it("sets the current bearer on real AxiosHeaders without renewing a valid session", async () => {
  const { client, adapter, dispatch } = clientFor(
    user("valid.synthetic.token")
  );
  await client.get("/operations");
  expect(adapter.mock.calls[0][0].headers.get("authorization")).toBe(
    "Bearer valid.synthetic.token"
  );
  expect(dispatch).not.toHaveBeenCalled();
});

it("shares renewal between real Axios requests and sends the rotated bearer with credentials", async () => {
  let release;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  const { client, adapter, dispatch } = clientFor(
    user("expired.synthetic.token"),
    () => pending
  );
  const requests = Promise.all([
    client.get("/operations"),
    client.get("/goals"),
  ]);
  await vi.waitFor(() => expect(dispatch).toHaveBeenCalledTimes(1));
  expect(adapter).not.toHaveBeenCalled();
  release(user("renewed.synthetic.token"));
  await requests;
  expect(adapter).toHaveBeenCalledTimes(2);
  for (const [config] of adapter.mock.calls) {
    expect(config.headers.get("Authorization")).toBe(
      "Bearer renewed.synthetic.token"
    );
    expect(config.withCredentials).toBe(true);
  }
});

it("stops the original request if renewal fails", async () => {
  const { client, adapter } = clientFor(
    user("expired.synthetic.token"),
    async () => null
  );
  await expect(client.post("/operations", { amount: "42.50" })).rejects.toThrow(
    "Session renewal failed"
  );
  expect(adapter).not.toHaveBeenCalled();
});

it("preserves JSON decimal strings and explicit credentials for a financial write", async () => {
  const { client, adapter } = clientFor(user("valid.synthetic.token"));
  const data = {
    title: "Synthetic operation",
    amount: "42.50",
    currency: "EUR",
    categoryId: 4,
  };
  await client.post("/operations", data, { withCredentials: true });
  const config = adapter.mock.calls[0][0];
  expect(JSON.parse(config.data)).toEqual(data);
  expect(config.headers.get("Content-Type")).toBe("application/json");
  expect(config.url).toBe("/operations");
  expect(config.withCredentials).toBe(true);
});

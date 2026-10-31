import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../../src/utils/api";
import userService from "../../src/js/services/userService";

vi.mock("../../src/utils/api", () => ({ default: { post: vi.fn() } }));
vi.mock("../../src/utils/axiosHelper", () => ({ apiPrivate: {} }));

const USER_KEY = JSON.stringify("user");

describe("userService.logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    userService.pendingLogout = Promise.resolve();
  });

  it("revokes the server session with the cookies", async () => {
    api.post.mockResolvedValue({ status: 204 });

    await userService.logout();

    expect(api.post).toHaveBeenCalledWith(
      "/users/logout",
      {},
      expect.objectContaining({ withCredentials: true })
    );
  });

  it("sends a JSON body that the API's strict parser accepts", async () => {
    const { default: realApi } = await vi.importActual("../../src/utils/api");
    let sentBody;
    api.post.mockImplementation((url, data, config) =>
      realApi.post(url, data, {
        ...config,
        adapter: async (request) => {
          sentBody = request.data;
          return { status: 204, data: "", headers: {}, config: request };
        },
      })
    );

    await userService.logout();
    await userService.pendingLogout;

    expect(JSON.parse(sentBody)).toEqual({});
  });

  it("clears the local session without waiting for the server", async () => {
    localStorage.setItem(USER_KEY, "{}");
    api.post.mockReturnValue(new Promise(() => {}));

    await userService.logout();

    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });

  it("stays signed out when the server call fails", async () => {
    localStorage.setItem(USER_KEY, "{}");
    api.post.mockRejectedValue(new Error("Network Error"));

    await expect(userService.logout()).resolves.toBeUndefined();
    await expect(userService.pendingLogout).resolves.toBeUndefined();

    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });

  it("waits for a pending logout before signing in", async () => {
    let finishLogout;
    api.post.mockReturnValueOnce(
      new Promise((resolve) => {
        finishLogout = resolve;
      })
    );
    api.post.mockResolvedValueOnce({ data: {} });

    await userService.logout();
    const login = userService.login({ email: "a@example.com" });
    await Promise.resolve();
    expect(api.post).toHaveBeenCalledTimes(1);

    finishLogout({ status: 204 });
    await login;
    expect(api.post).toHaveBeenCalledTimes(2);
  });
});

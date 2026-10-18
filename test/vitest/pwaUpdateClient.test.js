import { afterEach, describe, expect, it, vi } from "vitest";
import { createPwaUpdates } from "../../src/js/pwa/updateClient.js";

const cleanups = [];
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};
function setup({
  controlled = true,
  waiting = true,
  enabled = true,
  secure = true,
  supported = true,
} = {}) {
  const old = {};
  const candidate = Object.assign(new EventTarget(), {
    state: "installed",
    postMessage: vi.fn((message, ports) => {
      ports[0].reply("0123456789abcdef");
    }),
  });
  const registration = Object.assign(new EventTarget(), {
    waiting: waiting ? candidate : null,
    installing: null,
    update: vi.fn(async () => {}),
  });
  const worker = Object.assign(new EventTarget(), {
    controller: controlled ? old : null,
    register: vi.fn(async () => registration),
  });
  const channels = [];
  class Channel {
    constructor() {
      this.port1 = { close: vi.fn() };
      this.port2 = { reply: (data) => this.port1.onmessage({ data }) };
      channels.push(this);
    }
  }
  const host = Object.assign(new EventTarget(), {
    document,
    navigator: { serviceWorker: supported ? worker : undefined, onLine: true },
    isSecureContext: secure,
    location: { reload: vi.fn() },
    MessageChannel: Channel,
    setTimeout: (...args) => setTimeout(...args),
    clearTimeout: (...args) => clearTimeout(...args),
  });
  const states = [];
  const client = createPwaUpdates({
    enabled,
    window: host,
    onState: (state) => states.push(state),
  });
  cleanups.push(() => client.dispose());
  return { client, host, worker, registration, candidate, states, channels };
}

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("explicit PWA updates", () => {
  it.each([{ enabled: false }, { secure: false }, { supported: false }])(
    "does nothing when disabled or insecure: %j",
    async (options) => {
      const { client, worker } = setup(options);
      client.start();
      await client.retry();
      await client.activate();
      client.reload();
      expect(worker.register).not.toHaveBeenCalled();
    }
  );

  it("waits for page load and registers only the same-origin public worker", async () => {
    vi.spyOn(document, "readyState", "get").mockReturnValue("loading");
    const { client, host, worker, states, candidate } = setup();
    client.start();
    client.start();
    expect(worker.register).not.toHaveBeenCalled();
    host.dispatchEvent(new Event("load"));
    host.dispatchEvent(new Event("load"));
    await flush();
    expect(worker.register).toHaveBeenCalledExactlyOnceWith("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
    expect(states.at(-1)).toEqual({ phase: "waiting", reason: null });
    expect(candidate.postMessage).not.toHaveBeenCalled();
  });

  it.each([
    "form",
    'div role="dialog"',
    'div aria-busy="true"',
    'div contenteditable="true"',
  ])("blocks activation while an editor is present: %s", async (tag) => {
    const { client, candidate, states } = setup();
    client.start();
    await flush();
    document.body.innerHTML = `<${tag}></${tag.split(" ")[0]}>`;
    await client.activate();
    expect(candidate.postMessage).not.toHaveBeenCalled();
    expect(states.at(-1)).toEqual({ phase: "waiting", reason: "editing" });
  });

  it("requires a separate explicit reload and checks editors again after activation", async () => {
    const { client, worker, host, states, channels } = setup();
    client.start();
    await flush();
    await client.activate();
    expect(states.at(-1).phase).toBe("applying");
    expect(channels[0].port1.close).toHaveBeenCalledOnce();
    worker.controller = {};
    worker.dispatchEvent(new Event("controllerchange"));
    expect(states.at(-1)).toEqual({ phase: "reload", reason: null });
    expect(host.location.reload).not.toHaveBeenCalled();
    document.body.innerHTML = "<form><input value='synthetic draft'></form>";
    client.reload();
    expect(host.location.reload).not.toHaveBeenCalled();
    expect(document.querySelector("input").value).toBe("synthetic draft");
    document.body.innerHTML = "";
    client.reload();
    expect(host.location.reload).toHaveBeenCalledOnce();
  });

  it("does not prompt a reload after first installation", async () => {
    const { client, worker, states, host } = setup({
      controlled: false,
      waiting: false,
    });
    client.start();
    await flush();
    worker.controller = {};
    worker.dispatchEvent(new Event("controllerchange"));
    client.reload();
    expect(states).toEqual([]);
    expect(host.location.reload).not.toHaveBeenCalled();
  });

  it("keeps offline activation pending and checks again after reconnecting", async () => {
    const { client, host, candidate, registration, states } = setup();
    client.start();
    await flush();
    host.navigator.onLine = false;
    await client.activate();
    expect(states.at(-1).reason).toBe("offline");
    expect(candidate.postMessage).not.toHaveBeenCalled();
    host.navigator.onLine = true;
    host.dispatchEvent(new Event("online"));
    await flush();
    expect(registration.update).toHaveBeenCalledOnce();
    expect(states.at(-1)).toEqual({ phase: "waiting", reason: null });
  });

  it("bounds an unanswered activation and closes its message channel", async () => {
    vi.useFakeTimers();
    const { client, candidate, states, channels } = setup();
    candidate.postMessage.mockImplementation(() => {});
    client.start();
    await flush();
    const activation = client.activate();
    await vi.advanceTimersByTimeAsync(5000);
    await activation;
    expect(states.at(-1).phase).toBe("error");
    expect(channels[0].port1.close).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("recovers when an acknowledged worker never takes control", async () => {
    vi.useFakeTimers();
    const { client, states } = setup();
    client.start();
    await flush();
    await client.activate();
    await vi.advanceTimersByTimeAsync(10000);
    expect(states.at(-1).phase).toBe("error");
    await client.retry();
    expect(states.at(-1).phase).toBe("waiting");
  });

  it("disposes listeners, deadlines and in-flight messages without further state updates", async () => {
    vi.useFakeTimers();
    const { client, candidate, worker, states, channels, host } = setup();
    candidate.postMessage.mockImplementation(() => {});
    client.start();
    await flush();
    const activation = client.activate();
    const count = states.length;
    client.dispose();
    await activation;
    worker.controller = {};
    worker.dispatchEvent(new Event("controllerchange"));
    await client.retry();
    client.reload();
    expect(states).toHaveLength(count);
    expect(channels[0].port1.close).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    expect(host.location.reload).not.toHaveBeenCalled();
  });

  it("reports generic registration failures and allows retrying without exposing errors", async () => {
    const { client, worker, registration, states } = setup();
    worker.register.mockRejectedValueOnce(new Error("synthetic-private-error"));
    client.start();
    await flush();
    expect(states.at(-1)).toEqual({ phase: "error", reason: null });
    await client.retry();
    expect(states.at(-1).phase).toBe("waiting");
    expect(worker.register).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(states)).not.toContain("synthetic-private");
    expect(registration.update).not.toHaveBeenCalled();
  });
});

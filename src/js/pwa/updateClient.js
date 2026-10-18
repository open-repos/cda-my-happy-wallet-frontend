const blockedByEditor = (document) =>
  !!document.querySelector(
    'form, [role="dialog"], [aria-busy="true"], [contenteditable="true"]'
  );

/** No persistence, automatic reload, credentials or private messages. */
export const createPwaUpdates = ({
  enabled = false,
  window: host = window,
  onState = () => {},
  canReload = () => !blockedByEditor(host.document),
} = {}) => {
  const worker = host.navigator.serviceWorker;
  const listeners = [];
  const candidates = new Set();
  let registration;
  let controller = worker?.controller;
  let disposed = false;
  let started = false;
  let checking = false;
  let registering = false;
  let activationTimeout;
  let cancelMessage;
  let state = { phase: "idle", reason: null };
  const listen = (target, event, listener, options) => {
    target.addEventListener(event, listener, options);
    listeners.push(() => target.removeEventListener(event, listener, options));
  };
  const emit = (phase, reason = null) => {
    if (disposed) return;
    state = { phase, reason };
    onState(state);
  };
  const inspect = () => {
    if (state.phase === "reload" || state.phase === "applying") return;
    if (registration?.waiting && worker.controller) emit("waiting");
  };
  const watchCandidate = () => {
    const candidate = registration.installing;
    if (!candidate || candidates.has(candidate)) return;
    candidates.add(candidate);
    let installed = candidate.state === "installed";
    listen(candidate, "statechange", () => {
      if (candidate.state === "installed") {
        installed = true;
        inspect();
      }
      if (
        candidate.state === "redundant" &&
        !installed &&
        state.phase !== "reload"
      )
        emit("error");
    });
  };
  const check = async () => {
    if (disposed || checking || !registration) return;
    if (host.navigator.onLine === false) {
      if (state.phase !== "idle") emit(state.phase, "offline");
      return;
    }
    checking = true;
    try {
      await registration.update();
      inspect();
    } catch {
      if (state.phase !== "reload") emit("error");
    } finally {
      checking = false;
    }
  };
  const register = async () => {
    if (!started || disposed || registering) return;
    registering = true;
    try {
      const result = await worker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
      if (disposed) return;
      registration = result;
      listen(registration, "updatefound", watchCandidate);
      watchCandidate();
      inspect();
    } catch {
      emit("error");
    } finally {
      registering = false;
    }
  };
  const start = () => {
    if (
      started ||
      disposed ||
      enabled !== true ||
      !worker ||
      !host.isSecureContext
    )
      return;
    started = true;
    listen(worker, "controllerchange", () => {
      const next = worker.controller;
      if (controller && next && next !== controller) {
        host.clearTimeout(activationTimeout);
        emit("reload");
      }
      controller = next;
    });
    listen(host, "online", () => {
      if (registration) void check();
      else void register();
    });
    listen(host.document, "visibilitychange", () => {
      if (host.document.visibilityState === "visible") void check();
    });
    if (host.document.readyState === "complete") void register();
    else listen(host, "load", () => void register(), { once: true });
  };
  const guard = () => {
    if (host.navigator.onLine === false) {
      emit(state.phase, "offline");
      return false;
    }
    if (!canReload()) {
      emit(state.phase, "editing");
      return false;
    }
    return true;
  };
  const activate = async () => {
    const waiting = registration?.waiting;
    if (disposed || state.phase !== "waiting" || !waiting || !guard()) return;
    emit("applying");
    let channel;
    let timer;
    try {
      const build = await new Promise((resolve, reject) => {
        cancelMessage = () => reject(new Error("Update cancelled"));
        channel = new host.MessageChannel();
        timer = host.setTimeout(
          () => reject(new Error("Update unavailable")),
          5000
        );
        channel.port1.onmessage = (event) => resolve(event.data);
        waiting.postMessage({ type: "ACTIVATE_PUBLIC_UPDATE" }, [
          channel.port2,
        ]);
      });
      if (!/^[a-f0-9]{16}$/.test(build))
        throw new Error("Invalid public build");
      // controllerchange announces readiness; never reload automatically, even
      // after an explicit activation or when another window activates a worker.
      if (!disposed && state.phase === "applying")
        activationTimeout = host.setTimeout(() => {
          if (state.phase === "applying") emit("error");
        }, 10000);
    } catch {
      if (state.phase !== "reload") emit("error");
    } finally {
      host.clearTimeout(timer);
      channel?.port1.close();
      cancelMessage = null;
    }
  };
  const reload = () => {
    if (!disposed && state.phase === "reload" && guard())
      host.location.reload();
  };
  return {
    start,
    activate,
    reload,
    retry: () =>
      started && !disposed ? (registration ? check() : register()) : undefined,
    dispose: () => {
      disposed = true;
      host.clearTimeout(activationTimeout);
      cancelMessage?.();
      listeners.splice(0).forEach((remove) => remove());
    },
  };
};

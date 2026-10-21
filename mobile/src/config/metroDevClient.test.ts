// Test exécuté par Vitest sous Node : il lit des fichiers du dépôt.
/// <reference types="node" />
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

// `adb reverse` relie le 127.0.0.1 de l'émulateur à celui de l'ordinateur :
// Metro doit écouter en IPv4. Dans Node 22, `localhost` se résout d'abord en
// `::1` et Metro n'écoutait plus qu'en IPv6 (#222).
describe("Metro development client (#222)", () => {
  it("makes Metro resolve localhost to IPv4 first", () => {
    expect(read("../../compose.dev-client.yml")).toMatch(
      /NODE_OPTIONS:\s*["']?--dns-result-order=ipv4first/,
    );
  });

  it("checks Metro on the IPv4 address the emulator reaches", () => {
    const script = read("../../scripts/start-android-dev.sh");
    expect(script).toContain('metro_status_url="http://127.0.0.1:8081/status"');
    // Attente de disponibilité sur IPv4 ; seul le contrôle de port déjà pris
    // garde localhost, pour détecter aussi un Metro IPv6 seul.
    expect(script.match(/"\$metro_status_url"/g)).toHaveLength(2);
    expect(script.match(/"\$metro_busy_url"/g)).toHaveLength(1);
  });

  it("documents the IPv4 option in the manual Metro command", () => {
    const manual = read("../../docs/android-development-build.md");
    const step = manual.slice(manual.indexOf("## 5. Demarrer Metro"));
    expect(
      step.slice(0, step.indexOf("```", step.indexOf("```") + 3)),
    ).toContain("-e NODE_OPTIONS=--dns-result-order=ipv4first");
  });
});

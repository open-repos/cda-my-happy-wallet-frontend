import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const html = readFileSync(
  resolve(import.meta.dirname, "../../public/offline.html"),
  "utf8"
);
const document = () => new DOMParser().parseFromString(html, "text/html");

describe("neutral offline document", () => {
  it("provides a French landmark, offline explanation and a safe retry destination", () => {
    const page = document();
    expect(page.documentElement.lang).toBe("fr");
    expect(page.title).toBe("Hors connexion — My Happy Wallet");
    expect(page.querySelectorAll("main")).toHaveLength(1);
    expect(page.querySelectorAll("h1")).toHaveLength(1);
    const main = page.querySelector("main");
    expect(
      page.getElementById(main.getAttribute("aria-labelledby")).textContent
    ).toBe("Vous êtes hors ligne");
    const link = page.querySelector("a");
    expect(link.getAttribute("href")).toBe("/");
    expect(link.textContent).toBe("Réessayer");
    expect(page.querySelector("svg").getAttribute("aria-hidden")).toBe("true");
  });

  it("needs no script, API, remote asset, form or session storage", () => {
    const page = document();
    expect(
      page.querySelectorAll(
        "script, iframe, img, link, object, embed, form, input, video, audio"
      )
    ).toHaveLength(0);
    expect(page.querySelectorAll("a")).toHaveLength(1);
    expect(page.querySelector('meta[http-equiv="refresh"]')).toBeNull();
    expect(html).not.toMatch(
      /localStorage|sessionStorage|indexedDB|document\.cookie|\/v1\/|url\(/i
    );
    expect(page.querySelectorAll("style")).toHaveLength(1);
    expect(page.querySelector("meta[charset]").getAttribute("charset")).toBe(
      "UTF-8"
    );
  });
});

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  APP_LINK_SCHEME,
  EMAIL_LINK_HOST,
  EMAIL_LINK_PATHS,
  resolveIncomingLink,
} from "./incomingLinks";

const webLink = (pathAndQuery: string) =>
  `https://${EMAIL_LINK_HOST}${pathAndQuery}`;

describe("resolveIncomingLink", () => {
  it.each([
    [webLink("/login?confirmation=already-used"), "already-used"],
    [webLink("/login?confirmation=invalid-or-expired"), "invalid-or-expired"],
    [webLink("/login?success=true&message=registrationok"), "confirmed"],
    ["myhappywallet://login?confirmation=already-used", "already-used"],
    ["myhappywallet:///login?message=registrationok", "confirmed"],
  ])("opens sign-in with the confirmation outcome of %s", (link, outcome) => {
    expect(resolveIncomingLink(link)).toBe(`/sign-in?confirmation=${outcome}`);
  });

  it("accepts the Web host in any case and a trailing slash", () => {
    expect(
      resolveIncomingLink(
        `https://${EMAIL_LINK_HOST.toUpperCase()}/login/?confirmation=already-used`,
      ),
    ).toBe("/sign-in?confirmation=already-used");
  });

  it("opens sign-in without feedback for an unknown outcome", () => {
    expect(resolveIncomingLink(webLink("/login?confirmation=bogus"))).toBe(
      "/sign-in",
    );
    expect(resolveIncomingLink(webLink("/login"))).toBe("/sign-in");
  });

  it("drops every parameter that is not a known confirmation outcome", () => {
    expect(
      resolveIncomingLink(
        webLink("/login?token=secret-value&confirmation=already-used&next=/x"),
      ),
    ).toBe("/sign-in?confirmation=already-used");
  });

  it("does not throw on malformed percent-encoding", () => {
    expect(resolveIncomingLink(webLink("/login?confirmation=%E0%A4%A"))).toBe(
      "/sign-in",
    );
  });

  it.each([
    webLink("/new-password?resetToken=secret-value"),
    "myhappywallet://new-password?resetToken=secret-value",
    "myhappywallet://calendar?resetToken=secret-value",
  ])(
    "sends an unsupported owned link to the start screen without its query: %s",
    (link) => {
      const resolved = resolveIncomingLink(link);

      expect(resolved).toBe("/");
      expect(resolved).not.toContain("secret-value");
    },
  );

  it("opens the start screen for the bare app scheme", () => {
    expect(resolveIncomingLink("myhappywallet://")).toBe("/");
  });

  it.each([
    "https://evil.example/login?confirmation=already-used",
    `https://${EMAIL_LINK_HOST}.evil.example/login?confirmation=already-used`,
    `https://${EMAIL_LINK_HOST}@evil.example/login?confirmation=already-used`,
    `https://${EMAIL_LINK_HOST}:8443/login?confirmation=already-used`,
    `http://${EMAIL_LINK_HOST}/login?confirmation=already-used`,
    "exp+my-happy-wallet://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A8081",
    "/sign-in",
    "/calendar",
  ])("leaves a link the app does not own unchanged: %s", (link) => {
    expect(resolveIncomingLink(link)).toBe(link);
  });
});

describe("native link configuration", () => {
  const appConfig = JSON.parse(
    readFileSync(new URL("../../app.json", import.meta.url), "utf8"),
  ) as {
    expo: {
      scheme: string;
      android: {
        intentFilters?: {
          action: string;
          autoVerify?: boolean;
          category: string[];
          data: { scheme: string; host: string; path?: string }[];
        }[];
      };
    };
  };

  it("declares the custom scheme handled by the resolver", () => {
    expect(appConfig.expo.scheme).toBe(APP_LINK_SCHEME);
  });

  it("claims exactly the supported email paths on the Web host for Android", () => {
    const filters = appConfig.expo.android.intentFilters ?? [];
    const claimed = filters.flatMap((filter) =>
      filter.data.map((data) => ({
        action: filter.action,
        autoVerify: filter.autoVerify ?? false,
        categories: [...filter.category].sort(),
        host: data.host,
        path: data.path,
        scheme: data.scheme,
      })),
    );

    expect(claimed).toEqual(
      EMAIL_LINK_PATHS.map((path) => ({
        action: "VIEW",
        // Pas de vérification App Links sans assetlinks.json publié (#30).
        autoVerify: false,
        categories: ["BROWSABLE", "DEFAULT"],
        host: EMAIL_LINK_HOST,
        path,
        scheme: "https",
      })),
    );
  });
});

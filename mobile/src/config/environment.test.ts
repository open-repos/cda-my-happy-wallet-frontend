import { describe, expect, it } from "vitest";

import { createEnvironment } from "./environment";
import { API_COMPATIBILITY } from "./versioning";

describe("createEnvironment", () => {
  it("uses the production API when no override is configured", () => {
    expect(API_COMPATIBILITY).toEqual({ major: 1, pathPrefix: "/v1" });
    expect(createEnvironment()).toEqual({
      apiOrigin: "https://api.myhappywallet.andriacapai.com",
      apiBaseUrl: "https://api.myhappywallet.andriacapai.com/v1",
    });
  });

  it.each([
    "http://127.0.0.1:4200",
    "http://10.0.2.2:4200/",
    "http://192.168.1.42:4200",
  ])("accepts a development origin reachable from Android: %s", (origin) => {
    expect(createEnvironment(origin)).toEqual({
      apiOrigin: origin.replace(/\/$/, ""),
      apiBaseUrl: `${origin.replace(/\/$/, "")}/v1`,
    });
  });

  it.each([
    "ftp://api.example.test",
    "https://user:password@api.example.test",
    "https://api.example.test/v1",
    "https://api.example.test?environment=test",
    "https://api.example.test#documentation",
  ])("rejects a value that is not an API origin: %s", (origin) => {
    expect(() => createEnvironment(origin)).toThrow("EXPO_PUBLIC_API_ORIGIN");
  });
});

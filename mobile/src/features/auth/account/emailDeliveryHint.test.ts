import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

import { describe, expect, it } from "vitest";

import {
  EMAIL_DELIVERY_HINT,
  withEmailDeliveryHint,
} from "./emailDeliveryHint";

const webHint = readFileSync(
  fileURLToPath(
    new URL(
      "../../../../../src/js/components/EmailDeliveryHint.jsx",
      import.meta.url,
    ),
  ),
  "utf8",
);

describe("email delivery hint (#388)", () => {
  it("reuses the exact Web wording (#362)", () => {
    const paragraph = /<p[^>]*>([\s\S]*?)<\/p>/.exec(webHint)?.[1] ?? "";
    expect(paragraph.replace(/\s+/g, " ").trim()).toBe(EMAIL_DELIVERY_HINT);
  });

  it("appends the hint after the confirmation message", () => {
    expect(withEmailDeliveryHint("Lien envoyé.")).toBe(
      `Lien envoyé.\n\n${EMAIL_DELIVERY_HINT}`,
    );
  });
});

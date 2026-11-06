import { expect, test } from "@playwright/test";

async function login(page, email) {
  await page.goto("/login");
  await page.getByPlaceholder("Entrez votre email").fill(email);
  await page
    .getByPlaceholder("Entrez mot de passe")
    .fill(process.env.E2E_PASSWORD);
  await page.getByRole("button", { name: "Connexion", exact: true }).click();
  await expect(page).toHaveURL(/\/(?:home|operations)$/);
  await page.waitForLoadState("networkidle");
}

const accessTokenExpiry = (page) =>
  page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem(JSON.stringify("user")));
    return JSON.parse(
      atob(
        stored.payload.accessToken
          .split(".")[1]
          .replace(/-/g, "+")
          .replace(/_/g, "/")
      )
    ).exp;
  });

// Without latency the requests reach the API one after the other and hide the race.
async function addLatency(context, page) {
  const session = await context.newCDPSession(page);
  await session.send("Network.enable");
  await session.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
}

async function openExpiredTabs(context) {
  const first = await context.newPage();
  await login(first, "desktop-multitab@example.com");
  const second = await context.newPage();
  await second.goto("/home");
  await second.waitForLoadState("networkidle");
  await addLatency(context, first);
  await addLatency(context, second);
  // Only the browser clock moves: the API keeps its real clock and cookie.
  await context.clock.setFixedTime(
    new Date(((await accessTokenExpiry(first)) + 1) * 1000)
  );
  return [first, second];
}

const recordRenewals = (context) => {
  const renewals = [];
  context.on("response", (response) => {
    if (
      new URL(response.url()).pathname === "/v1/token" &&
      response.request().method() === "POST"
    )
      renewals.push(response.status());
  });
  return renewals;
};

const expectSessionKept = async (context, renewals, tabs) => {
  await expect.poll(() => renewals.length).toBe(2);
  expect(renewals).toEqual([200, 200]);
  for (const tab of tabs) {
    await tab.waitForLoadState("networkidle");
    await expect(tab).not.toHaveURL(/\/login$/);
    expect(
      await tab.evaluate(() => localStorage.getItem(JSON.stringify("user")))
    ).not.toBeNull();
  }
  expect(
    (await context.cookies()).some((cookie) => cookie.name === "refresh_token")
  ).toBe(true);
};

const desktopOnly = (testInfo) =>
  test.skip(
    testInfo.project.name !== "desktop",
    "The race does not depend on the viewport"
  );

test("two tabs navigating together keep the session", async ({
  context,
}, testInfo) => {
  desktopOnly(testInfo);
  const renewals = recordRenewals(context);
  const tabs = await openExpiredTabs(context);
  await Promise.all(
    tabs.map((tab) =>
      tab
        .getByRole("navigation", { name: "Navigation principale" })
        .getByRole("link", { name: "Opérations", exact: true })
        .click()
    )
  );
  await expectSessionKept(context, renewals, tabs);
});

// Without the lock this scenario lost the session in only 2 runs out of 5: a
// pass alone proves little, the navigation scenario above is the sharp one.
test("two tabs reloading together keep the session", async ({
  context,
}, testInfo) => {
  desktopOnly(testInfo);
  const renewals = recordRenewals(context);
  const tabs = await openExpiredTabs(context);
  await Promise.all(tabs.map((tab) => tab.reload()));
  await expectSessionKept(context, renewals, tabs);
});

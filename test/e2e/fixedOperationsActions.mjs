// Les mêmes critères métier sont vérifiés dans le tableau et les lignes mobiles.
export const fixedOperationItem = (page, title) => {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return page
    .getByRole("article", { name: title, exact: true })
    .or(page.getByRole("row", { name: new RegExp(escaped) }));
};
export const openFixedActions = async (page, title) => {
  await fixedOperationItem(page, title).waitFor({ state: "visible" });
  const card = page.getByRole("article", { name: title, exact: true });
  if (await card.count()) {
    const details = card.locator("details").first();
    if (!(await details.evaluate((node) => node.open)))
      await details.locator("summary").first().click();
  }
};

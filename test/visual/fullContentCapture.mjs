/**
 * Full-page references must include content below a nested mobile scroll area.
 * Viewport docking is exercised separately by actionDesign.spec.js; this fixture
 * expands only the scroll container while taking the complete content reference.
 */
export const prepareFullContentCapture = async (page) => {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.querySelector(".protected-layout")?.scrollTo(0, 0);
  });
  if (page.viewportSize().width < 768) {
    await page.addStyleTag({
      content: `
        .quick-add-root { height: auto; }
        .quick-add-root .protected-layout { flex: none; overflow: visible; }
      `,
    });
  }
};

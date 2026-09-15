# Visual regression tests

The mobile Expo Web export is covered at 360×740, 768×1024, and 1440×900.
The reference screenshots cover sign-in, the populated dashboard and its
navigation, and populated one-off operations. HTTP requests are intercepted, so
the suite never uses an external API or real account.

The screen hierarchy follows the Figma wireframes `403:33767` and moodboard
`353:27068` from file `H3SgTwXZrsAh9nlp0SsGgV`, last verified locally on
2026-08-09. Screenshot baselines are versioned in the repository because Figma
asset URLs are temporary.

Run the suite from the parent workspace with its Playwright container:

```bash
docker compose -f docker-compose.agent.yml exec agent-playwright \
  bash -lc 'cd mobile && npm run test:visual'
```

After an intentional visual change, review every generated image before using
`npm run test:visual:update`. Never update screenshots merely to silence a
failure.

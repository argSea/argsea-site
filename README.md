# argsea-site

The argSea site/frontend — the "night harbor" redesign of argsea.com. Astro v5
static output with React islands, paired with the `argsea-site-api` backend.

## Develop

```bash
npm install
npm run dev      # local dev server (fixtures)
npm run build    # static build into dist/
npm run check    # astro check (types)
```

Content comes through one seam, `src/lib/api.ts`:

- `ARGSEA_API_URL` set (e.g. `http://localhost:8181`) — the build fetches
  published content from the Go API.
- unset — the build uses the checked-in fixtures under `src/data/fixtures/`,
  which mirror the API wire format exactly.

The design contract (tokens, per-page specs, approved copy) lives under
`design/design_handoff_argsea_portfolio/`. Agent operating contract: `AGENTS.md`.

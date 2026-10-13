# Neuroluv web

Next.js 16.3 application containing two route groups:

- `(user)` — the existing public Neuroluv website;
- `(ai)` — the AI aggregator under `/ai`.

The route groups do not change public URLs. The AI client talks only to the Nest API and never
receives provider, payment or Directus service credentials.

## Local start

Requirements: Node.js 24.15+, npm 11.19+, a running AI API at `http://localhost:4000/v1`, and a reachable
Directus instance.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000/ai`. Keep secrets out of variables prefixed with `NEXT_PUBLIC_`.
`NEXT_PUBLIC_AI_API_URL` must include the API prefix (`/v1`). For production use
`https://api.neuroluv.ru/v1`.

## Production CMS configuration

Set `NEXT_PUBLIC_DIRECTUS_URL=https://admin.neuroluv.ru` in both the build and runtime
environment. Next.js embeds `NEXT_PUBLIC_*` values when building; changing only a running
container's environment does not replace a value already compiled into the application.
When unset, the application and image configuration use the same production CMS default.
After changing this value, build a new image rather than restarting an old one.

Directus reads have a 10-second deadline per attempt and at most two retries for network/5xx
failures. Error logs include the CMS origin, never the authorization header. A reverse-proxy
`502` or plain `404 page not found` is an upstream/configuration failure, not a TypeScript
compilation error; investigate the logged origin and Directus health before changing content.

## Matomo analytics

The public Matomo tracker uses `https://metrika.neuroluv.ru/` and site ID `1`.
Neither value is a secret; no `.env` credentials are needed. Never put a Matomo dashboard
password or Reporting API `token_auth` into frontend code.

The tracker records the first page and Next.js client-side navigations, referrers and
campaign parameters. Searches in `/prompts`, `/news`, `/articles` and `/ai/prompts` use
`trackSiteSearch`; pagination of the same search does not count as a new search.
Authentication tokens, private generation queries and signed download URLs are excluded.
Yandex Metrika remains enabled independently.

Search engines are detected from the available referrer. Hidden organic keywords cannot
be recovered in JavaScript; configure Search Engine Keywords imports in the Matomo admin
panel with Search Console/Webmaster access if those reports are required.

## Quality checks

```bash
npm run typecheck
npm run lint
npm run build -- --experimental-build-mode compile
```

The compile-only build is useful when production Directus or the Nest API is intentionally
unavailable during CI. Before release, also run a normal production build in an environment that
can reach both services and complete the smoke checks from the server production runbook.

Development and production builds use Turbopack. The application uses native TypeScript 7;
`next build` runs its CLI for type checking. ESLint's Next configuration is kept in the private
`tooling/lint` npm workspace, with the TypeScript 6 API required by typescript-eslint. `npm ci`
installs both toolchains from the root lockfile. This workspace is development tooling only.
`@eslint/compat` adapts the current React/import/accessibility rules to ESLint 10.

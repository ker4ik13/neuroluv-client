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

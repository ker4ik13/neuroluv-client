# Neuroluv web

Next.js 16 application containing two route groups:

- `(user)` — the existing public Neuroluv website;
- `(ai)` — the AI aggregator under `/ai`.

The route groups do not change public URLs. The AI client talks only to the Nest API and never
receives provider, payment or Directus service credentials.

## Local start

Requirements: Node.js 22, npm 10, a running AI API at `http://localhost:4000/v1`, and a reachable
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
npx tsc --noEmit
npm run lint
npm run build -- --experimental-build-mode compile
```

The compile-only build is useful when production Directus or the Nest API is intentionally
unavailable during CI. Before release, also run a normal production build in an environment that
can reach both services and complete the smoke checks from the server production runbook.

<!-- markdownlint-disable MD014 -->
<!-- markdownlint-disable MD033 -->
<!-- markdownlint-disable MD041 -->
<!-- markdownlint-disable MD029 -->

<div align="center">

<img src="ui/public/metadata.jpg" alt="Pizza Pay" width="600" />

<h1>Pizza Pay</h1>

A white label implementation of PingPay for P2P point-of-sale pizza purchases.

</div>

## Quick Start

```bash
cp .env.example .env   # First time only — fill in secrets
bun install
bun run dev
```

- UI: http://localhost:3003
- API: http://localhost:3001

## How It Works

**Seller (cashier):**
1. Sign in (email or anonymous "open shop")
2. Enter an order name and USDC amount
3. A QR code is generated linking to `/pizza/<orderId>`
4. Wait — the screen updates to green when payment is confirmed

**Customer (payer):**
1. Scan the QR code
2. Select a token and chain to pay with
3. Get a deposit address, send the crypto
4. Both screens confirm payment in real time

## Routes

| Route | Auth | Purpose |
|---|---|---|
| `/` | No | Redirects to `/pizza` |
| `/login` | No | Email/password, sign-up, anonymous login |
| `/pizza` | **Yes** | Seller POS — create order, view QR, await payment |
| `/pizza/:orderId` | No | Customer payment page — token select, deposit, confirm |
| `/pizza/billy` | No | Pizza Boy Billy lore page (+ birthday easter egg on May 11) |

## API Endpoints

Defined in `api/src/contract.ts`, accessed via `apiClient` in the UI:

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /pizza/orders` | **Yes** | Create order + PingPay checkout session |
| `GET /pizza/orders/:id` | No | Fetch order + available tokens from PingPay |
| `POST /pizza/orders/:id/quote` | No | Exchange rate quote for a payer token/chain |
| `POST /pizza/orders/:id/prepare` | No | Lock payment, get deposit address |
| `POST /pizza/orders/:id/notify` | No | Manual "I've sent it" status check trigger |
| `GET /pizza/orders/:id/stream` | No | SSE stream of real-time payment status |
| `GET /pizza/orders/:id/status` | No | Polling fallback for payment status |
| `POST /webhooks/ping` | No (HMAC verified) | Receive PingPay webhook events |

## Environment Variables

```bash
# API
API_DATABASE_URL=          # PostgreSQL connection string
PINGPAY_API_URL=           # PingPay API base URL
PINGPAY_API_KEY=           # PingPay API key
PINGPAY_WEBHOOK_SECRET=    # PingPay webhook HMAC secret

# Auth plugin
AUTH_DATABASE_URL=         # PostgreSQL connection string (can share with API)
BETTER_AUTH_SECRET=        # Session encryption key
CORS_ORIGIN=               # Allowed origins (comma-separated)
```

## Architecture

Module Federation monorepo — host is remote, this repo contains UI, API, and auth plugin:

```
Host (remote)
  ↓                    ↓
ui/               api/ + plugins/auth/
React 19          oRPC + every-plugin + Better-Auth
TanStack Router   Drizzle ORM + PostgreSQL
```

- **`ui/`** — React 19 + TanStack Router (file-based) + TanStack Query + Tailwind CSS v4
- **`api/`** — oRPC contract, pizza order handlers, PingPay service, webhook verification
- **`plugins/auth/`** — Better-Auth with anonymous, email, and NEAR SIWN support

Runtime config lives in `bos.config.json`. Changing URLs there changes what loads — no rebuild needed.

## Build & Publish

```bash
bos build               # Build all packages
bos publish             # Publish config to registry
bos publish --deploy    # Build + deploy to Zephyr, then publish
```

## Quality

```bash
bun test        # Run all tests
bun typecheck   # Type check all packages
bun lint        # Lint with Biome
bun lint:fix    # Auto-fix lint issues
```

## Deployment

Uses Railway via Docker. The GHCR image is the deployable artifact:

- `ghcr.io/<repo>:latest` — production
- `ghcr.io/<repo>:staging` — staging
- `ghcr.io/<repo>:pr-<n>` — preview

Required runtime vars: `APP_ENV`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `HOST_DATABASE_URL`, `HOST_DATABASE_AUTH_TOKEN`, `CORS_ORIGIN`.

## License

MIT

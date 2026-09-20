# A Challenge

A Challenge is a responsive creative platform where creators discover weekly missions, submit image or video entries, vote and comment, earn badges, follow other creators, and manage boosts or a Creator Pass subscription.

## Architecture

- React 18, TypeScript, Vite, Tailwind CSS, and shadcn/ui
- React Router and TanStack Query
- Capacitor camera and push-notification integrations
- Supabase Auth, Postgres, Row Level Security, Storage, Realtime, and Edge Functions
- Stripe Checkout, Billing Portal, and signed webhooks in test mode
- Vercel hosting with SPA routing and production security headers

The browser uses only the Supabase publishable key. Privileged moderation, rewards, Stripe fulfilment, and AI operations run in Edge Functions with server-held secrets.

## Requirements

- Node.js 22.12 or newer (`.nvmrc` is included)
- npm 10 or newer
- Docker Desktop for the local Supabase stack and database permission tests
- Supabase CLI 2.117 or newer
- Deno 2.9 or newer for Edge Function type-checking

## Local setup

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Set these public frontend values in `.env.local`:

```dotenv
VITE_SUPABASE_PROJECT_ID=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_URL=
```

Never place `SUPABASE_SERVICE_ROLE_KEY`, Stripe secret keys, webhook secrets, or AI provider keys in a `VITE_` variable. Every `VITE_` value is bundled into browser code.

## Supabase

Link the intended project explicitly before applying migrations. The project configured in your local environment must match the project you link.

```sh
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase migration list --linked
npx supabase db push --linked
```

Deploy functions after the migration succeeds:

```sh
npx supabase functions deploy
```

Configure Edge Function secrets in Supabase:

```text
ALLOWED_ORIGINS=https://your-production-domain,https://your-preview-domain
STRIPE_SECRET_KEY=rk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CREATOR_PASS_PRICE_ID=price_...
STRIPE_SMALL_BOOST_PRICE_ID=price_...
STRIPE_MEDIUM_BOOST_PRICE_ID=price_...
STRIPE_LARGE_BOOST_PRICE_ID=price_...
LOVABLE_API_KEY=...               # or AI_GATEWAY_API_KEY
```

Use a least-privilege Stripe restricted key when the required Checkout, Customer, Subscription, Price, and Billing Portal permissions are available. Keep test and live credentials separate.

The production hardening migration:

- protects points, XP, wallet balance, referral totals, and follower counts from client updates;
- prevents clients from self-approving or boosting submissions;
- awards challenge points once, only when a submission transitions to approved;
- restricts challenge creation and destructive administration by role;
- limits submission uploads by owner path, MIME type, and size;
- adds Stripe customer mapping and webhook event idempotency;
- repairs referral rewards so wallet balances are credited exactly once;
- separates public profile fields from private financial fields.

## Stripe test-mode setup

The sandbox catalog expects one recurring Creator Pass price and three one-time boost prices. Create a webhook endpoint pointing to:

```text
https://<project-ref>.supabase.co/functions/v1/stripe-webhook
```

Subscribe it to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

Checkout redirects are informational only. Purchases and entitlements are fulfilled by the signed, idempotent webhook, so closing the browser after payment does not lose the purchase.

Stripe Tax is intentionally not enabled automatically. Enable it only after the business has the required tax registrations for the jurisdictions where it collects tax.

## Quality checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run check:edge
```

For database migrations and RLS assertions:

```sh
npx supabase start
npx supabase db lint --local --level error --fail-on error
npm run test:db
```

`npm run check` runs the frontend typecheck, lint, unit tests, and production build. GitHub Actions additionally boots a local Supabase stack, lints the schema, runs pgTAP permission tests, and type-checks all Edge Functions.

## Deployment

### Vercel preview

1. Import the GitHub repository into Vercel.
2. Add the three `VITE_SUPABASE_*` variables separately for Preview and Production.
3. Push a non-default branch or open a pull request.
4. Verify the generated preview before promotion.

`vercel.json` configures Vite output, SPA fallbacks, immutable asset caching, Content Security Policy, frame protection, permissions policy, and other baseline headers.

### Release checklist

- GitHub Actions is green.
- Supabase migration and Edge Function deployments succeeded on the intended project.
- Stripe webhook delivery succeeds in test mode and duplicate delivery is harmless.
- Authentication, submission, moderation, voting, comments, profile, leaderboard, boost, subscription, portal, and admin flows pass in a real desktop and mobile browser.
- Console, network, Vercel, Supabase, and Stripe logs contain no unresolved errors.
- Promote the verified preview artifact to production; do not rebuild a different artifact.

## Security notes

- Admin and moderator routes are guarded in the UI and enforced again by RLS or server-side role checks.
- Supabase service-role and Stripe credentials are never exposed to the browser.
- Submission rewards, moderation state, boost fulfilment, and subscription state are server-managed.
- AI decisions below a high-confidence threshold stay pending for human moderation.
- CORS origins are allowlisted through `ALLOWED_ORIGINS`.
- The submission bucket remains public for approved social media delivery; pending-file privacy should be revisited if private signed media is required by policy.

Report vulnerabilities privately to the repository owner rather than opening a public issue with exploit details.

# CMS publish bridge (not deployed)

Separate Worker, not an Astro endpoint. No provisioning, activation or deployment has been performed. `wrangler deploy --config workers/cms-publish/wrangler.jsonc --dry-run` packages it only. Local security tests: `node --test tests/cms-publish-worker.test.mjs` (fake GitHub transport and synthetic secrets).

For a future separately approved setup, configure the Sanity webhook for POST JSON, create/update/delete, drafts and versions **disabled**. Filter (Sanity evaluates the applicable before/after document):

```groq
_type in ["siteSettings", "profile", "writing", "project", "experience", "achievement", "tool", "certificate"]
```

Exact projection (include `_rev` so distinct changes have distinct replay identities):

```groq
{
  "projectId": sanity::projectId(),
  "dataset": sanity::dataset(),
  "before": before(){_id, _type, _rev},
  "after": after(){_id, _type, _rev}
}
```

Use a strong unique shared webhook secret as the Worker secret `SANITY_WEBHOOK_SECRET` and an appropriately restricted GitHub Actions workflow-dispatch credential as `GITHUB_TOKEN`, using the platform's protected secrets mechanism, never source or client code. Configure server-side `SANITY_PROJECT_ID`, `SANITY_DATASET`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_WORKFLOW` (workflow filename ending .yml/.yaml), and `GITHUB_REF` (fixed branch). These values are deliberately absent from the checked-in config: missing configuration returns 503. The binding and SQLite-class migration are declared; deployment provisions the Durable Object only when separately authorized. Bind a route only after review; workers.dev is disabled in this config. Never expose a PAT in Studio. Verify exact GitHub fine-grained permissions and workflow ref against the actual repository before activation.

The Worker verifies Sanity's HMAC-SHA256 over timestamp and exact raw bytes using Web Crypto verification; timestamp tolerance is five minutes. It accepts only selected published document IDs/types from the configured project/dataset, including deletion/unpublish. A Durable Object transaction persists a bounded replay receipt, pending flag, and coalescing alarm before returning 202. The alarm dispatches after 15 seconds; on failure it retains pending work and schedules exponential retries capped at one hour. Capacity exhaustion returns 503 before acceptance; upstream deliveries can still be lost before acceptance, so monitor failures and provide reconciliation. GitHub and durable storage cannot commit atomically: an ambiguous acknowledgement or crash may duplicate a dispatch; no exactly-once guarantee is made. Blocked or missing credentials can leave retries pending indefinitely; monitor and reconcile before activation. Local workerd exercises the declared binding with fake outbound transport, not an actual deployed object or GitHub workflow. Verify Cloudflare quotas and Durable Object availability/cost before enabling.

The Worker dispatches the fixed `cms-publish=true` input. Set GitHub repository variables `SANITY_PROJECT_ID` and `SANITY_DATASET` to the matching public values before enabling the hook; CMS dispatch fails closed if either is absent. CI tests local baseline first, deletes that output, builds configured content, then dry-runs and deploys that exact output. For the GitHub fine-grained credential, GitHub documents repository Actions: write for workflow dispatch; restrict it to the intended repository, protect it as a Worker secret, and independently verify the repository policy and actual ref before activation. A successful dispatch only queues CI; monitor its result.

Disable the Sanity webhook first to roll back, then stop the Worker route and revoke its GitHub credential after handling pending alarms; retain the previous site deployment and follow Cloudflare's approved version rollback if needed. Removing a deployed Worker does not restore or erase Durable Object state. No real webhook, project, credential, dispatch, or deployment has been configured or verified.

References: https://www.sanity.io/docs/content-lake/webhooks ; https://www.sanity.io/docs/content-lake/webhook-best-practices ; https://developers.cloudflare.com/durable-objects/api/state/ ; https://developers.cloudflare.com/workers/wrangler/configuration/ .

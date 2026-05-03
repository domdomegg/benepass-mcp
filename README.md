# benepass-mcp

MCP server for the [Benepass](https://www.getbenepass.com/) employee benefits platform — list benefits, transactions, and submit out-of-pocket expenses for reimbursement, all via your existing Benepass account.

> **Note**: This is an unofficial tool, not affiliated with or endorsed by Benepass. It calls the Benepass API on your behalf using your own logged-in session, in the same way the Benepass web app would. Because of this, it can break at any time without warning if Benepass changes their API.
>
> If you hit problems with this server, [open an issue on this repo](https://github.com/domdomegg/benepass-mcp/issues) — do **not** bother Benepass support.

## Use Cases

**Submit a coffee receipt against my coffee benefit**: `"submit my $4.50 receipt at Blue Bottle against my coffee stipend"` → upload receipt, find benefit, submit expense.

**Find unsubmitted expenses**: `"what reimbursable charges do I have from this month?"` → lists transactions.

**Check stipend balances**: `"how much do I have left on my Wellness benefit?"` → lists benefits with remaining balances.

## Setup

```bash
claude mcp add benepass-mcp -- npx -y benepass-mcp
```

There's no API key or token to configure. When you ask the agent to do something Benepass-related, it'll:

1. Call `start_login(email)` — Benepass emails you a one-time code.
2. Either prompt you for the OTP, or — if you have a Gmail MCP installed — read it from your inbox automatically.
3. Call `complete_login(email, otp, challenge_session)` — returns a `refresh_token`.
4. Pass the `refresh_token` as the first argument to every other tool for the rest of the conversation.

The refresh token has a finite lifetime. When it expires, tools return a clear `invalid_grant` error and the agent repeats `start_login` / `complete_login` to get a fresh one.

### HTTP transport

The server runs over stdio by default but also speaks streamable-HTTP. Because every tool call carries its own `refresh_token`, the server itself holds no per-user state and can be safely exposed to multiple clients.

```bash
MCP_TRANSPORT=http PORT=3000 npx -y benepass-mcp
claude mcp add --transport http benepass-mcp http://localhost:3000/mcp
```

## Tools

| Tool                              | Description                                                                            |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| `start_login`                     | Step 1 of email-OTP login — Benepass sends an OTP to your email.                       |
| `complete_login`                  | Step 2 — exchange the OTP for a refresh token.                                         |
| `list_workspaces`                 | List your Benepass workspaces (employment + personal).                                 |
| `list_accounts`                   | List your benefit accounts and their balances.                                         |
| `list_benefits`                   | List the benefits available to you with their `benefit_xxx` ids.                       |
| `list_currencies`                 | List currency objects and their `crcy_xxx` ids.                                        |
| `list_transactions`               | Paginated list of transactions and expenses.                                           |
| `get_expense`                     | Fetch a single expense by id.                                                          |
| `get_substantiation_requirements` | What's required (note? receipt?) to submit an expense for a given benefit.             |
| `upload_receipt`                  | Upload a receipt file; returns a presigned URL to pass to `submit_expense`.            |
| `submit_expense`                  | Submit an out-of-pocket expense for reimbursement.                                     |

## Contributing

Pull requests welcome.

1. `npm install`
2. `npm run test` — unit tests run by default. Three e2e suites cover the full flow against the real Benepass API; each is gated on env vars so the default suite stays offline. Run them in order:

   ```bash
   # Step 1 — triggers an OTP email, prints the challenge_session
   BENEPASS_TEST_EMAIL=you@example.com \
     npx vitest run src/e2e-start-login.test.ts

   # Step 2 — paste the OTP from your email and the challenge_session from step 1; prints a refresh_token
   BENEPASS_TEST_EMAIL=you@example.com \
     BENEPASS_TEST_OTP=123456 \
     BENEPASS_TEST_CHALLENGE_SESSION=AYABe... \
     npx vitest run src/e2e-complete-login.test.ts

   # Step 3 — exercises the API tools using the refresh_token from step 2
   BENEPASS_REFRESH_TOKEN=eyJ... \
     npx vitest run src/e2e-api.test.ts
   ```
3. `npm run build`

## Releases

Versions follow the [semantic versioning spec](https://semver.org/).

To release:

1. Use `npm version <major | minor | patch>` to bump the version.
2. Run `git push --follow-tags` to push with tags.
3. Wait for GitHub Actions to publish to the NPM registry.

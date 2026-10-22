# GIGA Ads secure API – staging branch

This branch is a deployable draft; **not live** until Cloudflare and Google credentials/access are configured.

## Security-first setup
1. Google Cloud Console → enable Sheets API → create service account → download JSON key privately. Share the **original Google Sheet** with the service account email as **Viewer**. Never commit JSON/key.
2. Cloudflare Workers → connect this GitHub repo/branch and deploy with Wrangler configuration. Create a **Cloudflare Access Self-hosted** application for the Worker domain, deny by default, allow only employees' Google/email identities; protect the **entire site**, not just /api.
3. Cloudflare Worker → Settings → Variables and Secrets: configure `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY` (exact PEM), `CF_ACCESS_TEAM_DOMAIN` (e.g. yourteam.cloudflareaccess.com), `CF_ACCESS_AUD` (the Access application AUD tag), and `ROLE_RULES_JSON`.
4. Example role rules: `{\"manager@example.com\":{\"role\":\"manager\"},\"ads@example.com\":{\"role\":\"ads\",\"owner\":\"Ngát P\"}}`. These are placeholders; substitute **real authorized** identities. The rules are validated **server-side**.
5. Access-login to your Worker URL. It serves the existing dashboard static files and a same-origin `GET /api/insights?since=2026-10-01&until=2026-10-21`. Keep existing public GitHub Pages site sample-only; share **the Access-protected Worker URL** for real internal data.
6. Verify admin sees all employees; Ads login sees only matching `Tên nhân viên`; unauthorized email gets HTTP 403; unsigned API request HTTP 401; date range changes fetched data.

## Scope / caveats
- The API reads `ADS_PERFORMANCE!A2:Q6000`. Revenue and orders are sheet-derived, based on the source's ERP matching; independently reconcile attribution, order status and refunds.
- Source contains **no impressions, reach, clicks, leads, or messages**. They are represented as zeros only to keep legacy charts stable; **do not interpret zeros as actual zero outcomes**. Add a protected data join with `META_RAW` before interpreting CTR/CPC/CPM/CPL.
- Historical Google Sheets date cells are formatted `dd/mm/yyyy`; Sheets is read with FORMATTED_VALUE. Worker converts those dates to ISO and Vietnamese-grouped numbers to numeric VND.
- Worker Access authentication uses a cryptographically validated Access JWT and the per-email role list; no service-account key ever appears in browser code or GitHub.
- Do not use a public Google Apps Script publish link or Sheets published CSV for private data.

Deployment trigger: Cloudflare secure API.

Rebuild request: deploy the authenticated API from the feature/secure-ads-api branch.

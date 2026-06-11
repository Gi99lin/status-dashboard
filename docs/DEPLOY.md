# Deployment — prod, demos & status map

> Runbook for deploying the dashboards across `gigglin.tech`. Companion to
> [`SPEC.md`](./SPEC.md) / [`PLAN.md`](./PLAN.md). Deploy lives in the `My_server` repo.

## Mental model

One product, two exposures, split by **data** — not by codebase:

| Plane | Domain | Auth | Data | Backend |
|---|---|---|---|---|
| **Prod** (private) | `dash.gigglin.tech` | 🔒 password (cookie) | real | yes |
| **Demo** life-dashboard | `demo.gigglin.tech` | 🌐 none | fake (client-side) | no |
| **Demo** status board | `infra.gigglin.tech` | 🌐 none | fake (client-side) | no |
| Portfolio | `ivanyakimkin.ru` (+ aliases) | 🌐 none | — | no (static) |

- The **real** status board is never a public site. Its live data is private and is only ever
  *embedded* inside the prod dashboard (Phase B). Demos ship canned data and cannot leak anything.
- Demo mode is baked at build time (`VITE_DEMO=1`) and also auto-triggers by hostname
  (`demo.` / `infra.`). In demo mode the apps answer `/api/*` client-side and open no socket.
- CI/CD is inert in the status board (a disabled nav item) and stays that way in the demo — a
  public, password-less demo must never reach an action surface.

## 1. DNS

Add these as A (+ AAAA) records pointing at the server's public IP — the same target as
`omnirout.gigglin.tech`. No new records are needed on the portfolio domains.

| Record | Serves |
|---|---|
| `dash.gigglin.tech` | prod life-dashboard (if not already present) |
| `demo.gigglin.tech` | demo life-dashboard |
| `infra.gigglin.tech` | demo status board |

The real `status-api` / `status-web` need **no DNS** — internal only (Phase B reaches them via a
`/stack/` path on `dash.gigglin.tech`).

## 2. Images (GHCR)

Built and pushed by each repo's GitHub Actions on push to `main`:

| Repo | New/used images |
|---|---|
| `life-dashboard` | `life-dashboard-frontend`, **`life-dashboard-frontend-demo`**, `life-dashboard-api`, `life-dashboard-collector` |
| `status_dashboard` | `status-dashboard-api`, `status-dashboard-web`, **`status-dashboard-web-demo`** |
| `portfolio` | `portfolio` |

(bold = added for this setup)

## 3. One-click deploy (Watchtower)

After the one-time setup below, **`git push` is the entire deploy**: Actions builds + pushes the
image, Watchtower (polling GHCR every 2 min) pulls and restarts the labelled container.

One-time, on the server (`My_server` repo):

```bash
# 0. Let the host pull private GHCR images
docker login ghcr.io -u Gi99lin            # PAT with read:packages

# 1. Auto-deployer
cd watchtower && docker compose up -d

# 2. Public demos
cd ../life-dashboard-demo   && docker compose up -d
cd ../status-dashboard-demo && docker compose up -d
```

Only containers labelled `com.centurylinklabs.watchtower.enable=true` auto-update (the demos,
portfolio `landing`, and life-dashboard prod). NPM and its DB are intentionally left untouched.

## 4. Nginx Proxy Manager hosts

Add a Proxy Host per domain (Scheme `http`, Block Common Exploits on, SSL → request a Let's
Encrypt cert + Force SSL). Forward to the container name on `my_server_proxy_network`:

| Domain | Forward to | Port |
|---|---|---|
| `demo.gigglin.tech` | `life-dashboard-demo` | 80 |
| `infra.gigglin.tech` | `status-dashboard-demo` | 80 |
| `dash.gigglin.tech` | `life-dashboard` | 80 |

## Phase A — done (this change set)

- `status_dashboard/web`: demo switch (`src/lib/demo.ts`, `src/demo/demoTopology.ts`), wired into
  the auth/topology/polling/socket hooks; `build:demo` script, `Dockerfile.demo`, `nginx.demo.conf`; CI builds `status-dashboard-web-demo`.
- `life-dashboard/dashboard`: `build:demo`, `Dockerfile.demo`, `nginx.demo.conf`; CI builds `life-dashboard-frontend-demo`.
- `portfolio/index.html`: Infrastructure card → `infra.gigglin.tech`, Dashboard card → `demo.gigglin.tech`.
- `My_server`: `watchtower/`, `life-dashboard-demo/`, `status-dashboard-demo/`; Watchtower labels on prod + landing.

**Ship it:** push the three repos, run the three `docker compose up -d` above, add the three NPM hosts.

## Phase B — real status map inside prod

The code is done (the infra tab is now the `<status-map>` embed; the bundle ships inside the
life-dashboard image; prod points it at the same-origin `/stack` path). What's left touches the
**live** prod dashboard, so run the server steps **in this order** — status-api + NPM route must
exist *before* the new frontend rolls out, or the infra tab shows an empty map.

How it works: the embed polls `/stack/api/topology` on `dash.gigglin.tech`. NPM routes `/stack/api/*`
to `status-dashboard-api`, which enforces the **same** cookie as life-dashboard-api (shared
`DASHBOARD_PASS` + `SESSION_SECRET`) — so it's owner-only. On `demo.gigglin.tech` the embed flips to
fake data by hostname and never calls the backend. The bundle uses **polling, no socket**, so no
`/socket.io` routing is needed for `/stack`.

**1. Shared secret.** In `~/My_server/.env` set a fixed `SESSION_SECRET` (and confirm `DASHBOARD_PASS`):
```bash
openssl rand -hex 32      # paste as SESSION_SECRET=… in ~/My_server/.env
```

**2. Deploy status-api** (private; Docker socket; shared secrets) and restart life-api to pick up the secret:
```bash
cd ~/My_server && git pull
cd status-dashboard && docker compose up -d
cd ../life-dashboard && docker compose up -d   # re-reads SESSION_SECRET (invalidates current sessions once)
```

**3. NPM — add a custom location on the `dash.gigglin.tech` proxy host.**
Edit → **Custom locations** → Add location `/stack/api/`, forward to `status-dashboard-api` : `3002`,
then in that location's gear/Advanced box paste (the rewrite strips the `/stack` prefix):
```nginx
rewrite ^/stack/api/(.*)$ /api/$1 break;
proxy_pass http://status-dashboard-api:3002;
proxy_set_header Host $host;
proxy_set_header Cookie $http_cookie;
```
Save. Quick check from the server: `curl -s -o /dev/null -w '%{http_code}' https://dash.gigglin.tech/stack/api/health` → `200`.

**4. Roll out the frontend.** Push `life-dashboard` (rebuilds `life-dashboard-frontend` with
`VITE_STATUS_MAP_API=/stack` + the embedded bundle). Watchtower redeploys it within ~2 min.

**5. Verify.** Log in to `dash.gigglin.tech`, open **Инфраструктура** → the real map renders for you
only (a logged-out `/stack/api/topology` returns 401). `demo.gigglin.tech`'s infra tab keeps showing
the fake map. Done.

> Keeping the bundle fresh: the embed lives in `life-dashboard/dashboard/public/status-map.js`,
> built from this repo with `npm run build:embed`. After a status_dashboard change, rebuild and
> recopy it (`cp dist-embed/status-map.js ../life-dashboard/dashboard/public/`) and push life-dashboard.

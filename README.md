# status_dashboard — stack.map

Самостоятельная карта инфраструктуры хоумлаба: запущенные сервисы, контейнеры,
docker-сети, статусы и потребляемые ресурсы. Дизайн повторяет тёмную тему
портфолио и `life-dashboard`.

Документы:
- [`docs/SPEC.md`](docs/SPEC.md) — спецификация MVP.
- [`docs/PLAN.md`](docs/PLAN.md) — план реализации по этапам.
- [`mockup.html`](mockup.html) — визуальный источник правды.

## Структура

```
api/   — Node 22 + Express + socket.io, снапшот топологии (Docker API, Netdata, nginx, Guacamole)
web/   — React + TypeScript + Vite, React Flow карта
```

## Запуск локально (без Docker)

**API (:3002):**
```bash
cd api
cp .env.example .env
npm install
npm run dev
```

**Frontend (:5180, проксирует /api → :3002):**
```bash
cd web
npm install
npm run dev -- --port 5180
```

## Запуск через Docker Compose

```bash
cp api/.env.example api/.env
docker compose up --build
```

- `status-dashboard-api` — порт 3002, монтирует `/var/run/docker.sock` для опроса контейнеров.
- `status-dashboard-web` — порт 80, статика + nginx-проксирование `/api` и `/socket.io`.
- Подключается к внешней сети `my_server_proxy_network` (как остальные сервисы в `My_server`).

## Embed-сборка (`<status-map>`)

Карта собирается отдельным бандлом как кастомный элемент `<status-map>` (Shadow DOM),
который можно встроить в другую страницу (например, `life-dashboard`):

```bash
cd web
npm run build:embed   # → dist-embed/status-map.js
```

```html
<status-map api="http://gigglin-server:3002" period="1ч"></status-map>
<script type="module" src="/dist-embed/status-map.js"></script>
```

Атрибуты: `api` (база API, по умолчанию — текущий origin), `period` (`10м` / `1ч` / `6ч` / `24ч`).
Демо-страница: [`web/embed-demo.html`](web/embed-demo.html) (запускается через `embed-demo` в `.claude/launch.json`, порт 4189; требует запущенный API на :3002).

## Авторизация

Опциональная cookie-сессия (как в `life-dashboard`): если в `api/.env` задан `DASHBOARD_PASS`,
все `/api/*` (кроме `/api/health`, `/api/login`, `/api/auth-check`) и socket.io требуют
сессионную куку `dashboard_session`. Фронтенд показывает экран входа, пока `/api/auth-check`
не вернёт `200`. Если `DASHBOARD_PASS` не задан — доступ открыт (dev-режим).
`SESSION_SECRET` фиксирует токен сессии между перезапусками контейнера.

## Деплой (CI/CD)

`.github/workflows/docker-publish.yml` при пуше в `main`/`master` собирает и пушит
`ghcr.io/<owner>/status-dashboard-api:latest` и `ghcr.io/<owner>/status-dashboard-web:latest`.

На сервере:

```bash
cp api/.env.example api/.env   # настроить DASHBOARD_PASS, SESSION_SECRET, NETDATA_URL и т.д.
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

[`docker-compose.prod.yml`](docker-compose.prod.yml) использует готовые образы из GHCR (вместо `build:`),
монтирует `/var/run/docker.sock` и подключается к внешней сети `my_server_proxy_network`.

## Статус

MVP по [плану](docs/PLAN.md): Этапы 0-6 готовы (карта, контейнеры, сети, live-индикатор, embed, auth, CI/CD).
Перед продакшен-деплоем — финальный обзор.

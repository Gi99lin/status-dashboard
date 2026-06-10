# status_dashboard — План реализации (MVP)

> Дата: 2026-06-10 · На основе [`docs/SPEC.md`](./SPEC.md) и [`mockup.html`](../mockup.html).
> Принцип: **вертикальные срезы** — каждый этап оставляет систему в запускаемом и
> демонстрируемом состоянии. Дефолты И1–И5 подтверждены.

---

## Стек (зафиксировано)
- **Backend:** Node 22, Express, socket.io, dockerode. Порт `3002`.
- **Frontend:** React 18 + TypeScript + Vite, `@xyflow/react` (React Flow), Zustand, Chart.js.
- **Сборка фронта:** два таргета — standalone SPA и embed (`<status-map>` web-component).
- **Деплой:** Docker-образы → GHCR → GitHub Actions (паттерн life-dashboard).

---

## Этап 0 — Каркас репозитория
**Цель:** пустые, но запускаемые `api/` и `web/`.
- `api/`: `npm init`, Express, healthcheck `GET /api/health`, `.env.example`, `Dockerfile`, `.dockerignore`.
- `web/`: `npm create vite@latest -- --template react-ts`, токены в `src/styles/tokens.css` (копия из `mockup.html`), глобальный layout-каркас (топбар + пустые табы), `Dockerfile` + `nginx.conf` (SPA-fallback, proxy `/api`→api:3002).
- `docker-compose.yml` (api + web + проброс `/var/run/docker.sock:ro`).
- Корневой `README.md` + перенести `SPEC.md`/`PLAN.md`/`mockup.html` под `docs/`.

**Готово, когда:** `docker compose up` поднимает оба сервиса, открывается пустая тёмная оболочка с топбаром.

---

## Этап 1 — Backend: снапшот топологии (переиспользование)
**Цель:** реальный `GET /api/topology` отдаёт данные из Docker.
- Портировать из life-dashboard: `infraTopology.js`, `guacamole.js`, `nginxRoutes.js`
  (скопировать в `api/src/`, привести импорты, убрать привязки к life-dashboard).
- Подключить dockerode к сокету; реализовать `collectDocker` / `dockerStats` / `collectTelemetry`.
- **Расширения shape:** добавить `networks[].driver` и `networks[].external` (из `docker.listNetworks()`),
  пробросить `services[].uptime/restarts`.
- Эндпоинты: `GET /api/topology`, `GET /api/containers`, `GET /api/networks` (плоские проекции).
- Graceful degrade: при недоступном Docker/Netdata/Guac — пустой/частичный ответ, не падать.

**Готово, когда:** `curl /api/topology` на хосте возвращает реальные сети/контейнеры; без Docker — валидный пустой ответ.

---

## Этап 2 — Frontend: оболочка + раздел «Карта» (статичный рендер из API)
**Цель:** карта рисуется из реального снапшота, без живых обновлений.
- Топбар (бренд, навигация Карта/Контейнеры/Сети/Сервисы/CI·CD-disabled, пилюля хоста, период).
- Верхний ряд: `HostVitals` (карточка хоста + бары) + `LiveTelemetry` (Chart.js, пока из `telemetry[]` снапшота) + правая колонка (Docker-сетей / Публичных URL).
- Загрузка данных: `fetch /api/topology` в Zustand-стор.
- **React Flow карта:**
  - кастомные ноды: `NetworkGroupNode` (контейнер-группа), `ServiceNode`, `ContainerNode`, `GatewayNode`, `ExternalNode`, `VmNode`, `MonitorNode` — стили из `mockup.html`;
  - маппинг `topology → nodes/edges`: сети как parent-узлы, контейнеры как child (`parentId`+`extent:'parent'`);
  - типы рёбер `flow/remote/mon` с кастомными edge-компонентами (анимация, цвета);
  - host-сеть (`external:false && driver:'host'`) — оранжевая ветка;
  - controls: zoom/fit/minimap; `FULL` → fullscreen.

**Готово, когда:** раздел «Карта» визуально совпадает с `mockup.html` на реальных данных.

---

## Этап 3 — Frontend: разделы «Контейнеры» и «Сети»
**Цель:** два оставшихся раздела MVP.
- `ContainersTable`: сортируемая/фильтруемая таблица (статус, имя, образ, сети, CPU, RAM, аптайм, рестарты, URL). Источник — `/api/containers`. Клик по строке → подсветка узла на карте (опц.).
- `NetworksList`: карточки сетей (имя, драйвер, подсеть, members, external-бейдж). Источник — `/api/networks`.
- Переключение разделов без перезагрузки (стейт-таб / react-router).

**Готово, когда:** все три раздела работают на реальных данных, навигация переключает их.

---

## Этап 4 — Live: socket.io пульс
**Цель:** статусы и метрики обновляются без перезагрузки.
- Backend: socket.io канал `pulse` — периодический опрос Docker (интервал из env), шлёт дельты статусов/CPU/RAM + точку телеметрии.
- Frontend: socket.io-client → мерж дельт в Zustand; перерисовываются только изменившиеся ноды/строки; график телеметрии накапливает точки по выбранному периоду.
- Индикатор «живая» в шапке топологии реально отражает соединение.

**Готово, когда:** запуск/остановка контейнера на хосте отражается на карте за ≤ интервал опроса.

---

## Этап 5 — Embed-таргет (`<status-map>`) + микрофронтенд
**Цель:** встраиваемая сборка только «Карты».
- Второй Vite-конфиг (`vite.embed.config.ts`): entry регистрирует custom element `<status-map>`,
  монтирует React-«Карту» внутрь; стили изолированы (Shadow DOM либо scoped-токены).
- Атрибуты: `api` (база API), `period`, `host` — наследование настроек от host-страницы (И1: только Карта, И2: период от host).
- Демо-страница `web/embed-demo.html` — ванила-host подключает `<script>` + `<status-map>`.

**Готово, когда:** `<status-map>` рендерит карту внутри ванила-страницы, не ломая её стили.

---

## Этап 6 — Auth, деплой, доводка
**Цель:** прод-готовность.
- Cookie-сессия standalone (И5) — портировать модель из life-dashboard (`/api/login`, `/api/auth-check`).
- GitHub Actions: сборка/пуш образов `status-dashboard-{api,web}` в GHCR (И4).
- `docker-compose.yml` для сервера (env, проброс сокета/конфигов nginx/Guac).
- Сохранение позиций узлов в localStorage (И3), пустые/ошибочные состояния, мобильная адаптация топбара.

**Готово, когда:** push в main собирает образы; сервер тянет и поднимает; всё работает на реальной инфре.

---

## Порядок и зависимости
```
0 ─► 1 ─► 2 ─► 3 ─► 4 ─► 5
              └────────────► 6 (auth/деплой можно начинать параллельно после 2)
```
Демо-поинты: после 2 (карта вживую), после 3 (полный MVP-функционал), после 5 (встраивание), после 6 (прод).

## Риски / на что смотреть
- **dockerode stats** на каждый контейнер — дорого; кэшировать/батчить, опрашивать реже карты.
- **React Flow + тема:** кастомные ноды должны точно повторять токены — заложить время на пиксель-доводку против `mockup.html`.
- **Shadow DOM vs шрифты/иконки** в embed — проверить подгрузку JetBrains Mono внутри shadow-root.
- **host-сеть marzneshin:** у контейнеров в host-режиме нет сетевых членств — обрабатывать как отдельную псевдо-сеть.

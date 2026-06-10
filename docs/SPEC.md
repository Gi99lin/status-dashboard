# status_dashboard — Спецификация (MVP)

> Дата: 2026-06-10 · Статус: черновик к согласованию · Дальше: план реализации.
> Визуальный источник правды: [`/mockup.html`](../mockup.html).

---

## 1. Назначение и контекст

`status_dashboard` — **самостоятельное приложение-карта инфраструктуры** хоумлаба
(`gigglin-server`). Показывает запущенные сервисы, их контейнеры, статусы, потребляемые
ресурсы и связи (общие Docker-сети, проксирование, удалённый доступ, мониторинг).

Это вынос и развитие «кокпита инфраструктуры», который сейчас живёт вкладкой внутри
`life-dashboard` (компоненты `StackTopology.js` / `HostVitals.js` / `LiveTelemetry.js`,
сборщик `api/infraTopology.js`, эндпоинт `GET /api/infra/topology`).

**Долгосрочный план:** вкладку «Инфраструктура» из `life-dashboard` удалить, а это
приложение встроить обратно **микрофронтендом**. Поэтому проект обязан работать и
standalone, и как встраиваемый модуль. Задел под будущий **CI/CD** уже заложен в навигации.

### Не-цели (вне MVP)
- CI/CD-раздел (пункт навигации присутствует, но `disabled`).
- Управление контейнерами (start/stop/restart) — только чтение.
- Исторические дашборды/алертинг — только «сейчас» + короткая телеметрия (≤24ч).
- Авторизация сложнее cookie-сессии (наследуем модель life-dashboard при встраивании).

---

## 2. Объём MVP (3 раздела)

| Раздел | Содержимое |
|---|---|
| **Карта** (по умолчанию) | Карточка хоста + витал-бары (CPU/RAM/Диск/Сеть) + живой график телеметрии + интерактивная топология (React Flow). |
| **Контейнеры** | Сортируемая/фильтруемая таблица всех контейнеров: статус, имя, образ, сеть(и), CPU, RAM, аптайм, рестарты, публичный URL. |
| **Сети** | Список Docker-сетей: имя, драйвер (bridge/host), подсеть, кол-во контейнеров, members; external-сети (напр. `my_server_proxy_network`) помечены. |

Общая оболочка: топбар (бренд `stack.map`, навигация, пилюля хоста, переключатель
периода 10м/1ч/6ч/24ч).

**Верхний ряд раздела «Карта»** (3 колонки): слева карточка хоста + витал-бары
(CPU/RAM/Диск/Сеть); по центру график телеметрии; справа — **только две неповторяющиеся
метрики**: «Docker-сетей» и «Публичных URL». Контейнеры/CPU/RAM в отдельные плашки не
выносим — они уже в карточке хоста и витал-барах (убрали дублирующую строку-сводку).

---

## 3. Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│  Хост gigglin-server (Ubuntu + Docker)                        │
│                                                               │
│  Docker socket ─┐                                             │
│  Netdata  ──────┤                                             │
│  nginx conf ────┼──►  collector/poller  ──►  топология JSON   │
│  Guacamole REST ┘            │                                │
│                              ▼                                │
│                    api (Node/Express :3002)                   │
│                    GET /api/topology   (snapshot)             │
│                    GET /api/containers, /api/networks         │
│                    socket.io: pulse (live статусы/метрики)    │
│                              │                                │
│                              ▼                                │
│  frontend (React+TS+Vite → static, nginx)                     │
│    standalone:  весь app-shell + 3 раздела                    │
│    embed:       <status-map> web-component (только Карта)     │
└─────────────────────────────────────────────────────────────┘
```

### 3.1 Backend (`api/`)
- **Node 22 + Express + socket.io**, порт `3002` (чтобы не конфликтовать с life-dashboard `3001`).
- **Переиспользуем из life-dashboard** (копируем/портируем, не зависим от чужого репо):
  - `api/infraTopology.js` — сборка топологии (Docker API + Netdata + nginx + Guacamole → `networks/standalone/edges`).
  - `api/guacamole.js` — REST-коннект к Guacamole (VM-узлы).
  - `api/nginxRoutes.js` — парсинг nginx-конфига в `публичный host → upstream`.
  - логика `dockerStats` / `collectTelemetry` (Netdata charts).
- Источники (все опциональны, при недоступности — graceful degrade, как сейчас в `collectTopology`):
  | Источник | Что даёт | Env |
  |---|---|---|
  | Docker API (socket) | контейнеры, сети, stats (CPU/RAM) | монтируется `/var/run/docker.sock` |
  | Netdata | телеметрия хоста (CPU/RAM/Диск/Сеть) | `NETDATA_URL` |
  | nginx conf | публичные URL/маршруты | `NGINX_CONF_PATH` |
  | Guacamole REST | VM-узлы (RDP/VNC) | `GUAC_URL/USER/PASS` |
  | labels | `dashboard.role/tech/purpose/name` | на контейнерах |
- **Live:** socket.io канал `pulse` шлёт дельты статусов/метрик (период опроса конфигурируется).

### 3.2 Frontend (`web/`)
- **React 18 + TypeScript + Vite**, дизайн-токены вынесены в `tokens.css` (копия из портфолио/дашборда).
- **React Flow (`@xyflow/react`)** для карты:
  - кастомные node-компоненты под тему: `NetworkGroupNode`, `ServiceNode`, `ContainerNode`, `GatewayNode`, `ExternalNode`, `VmNode`, `MonitorNode`;
  - вложенность «сеть → контейнеры» через parent/extent (subflow);
  - рёбра: типы `flow` (трафик, анимированный зелёный), `remote` (синий, RDP/VNC), `mon` (фиолетовый, мониторинг);
  - встроенные pan/zoom/миникарта/fit-view; узлы перетаскиваемы (позиции можно сохранять в localStorage).
- **Chart.js** (или lightweight SVG-sparkline) для графика телеметрии — как в life-dashboard.
- Состояние: лёгкий стор (Zustand) под snapshot + live-дельты из socket.io.
- Маршрутизация: 3 раздела (Карта / Контейнеры / Сети) — `react-router` или простой стейт-таб.

### 3.3 Сборка и встраивание (микрофронтенд)
Vite собирает **два таргета**:
1. **standalone** — обычный SPA (nginx, SPA-fallback), свой сабдомен.
2. **embed** — бандл, регистрирующий custom element **`<status-map>`** (React монтируется
   внутрь, стили изолированы — Shadow DOM либо scoped-CSS с префиксами токенов).
   Ванила-host (`life-dashboard`) подключает один `<script>` и ставит `<status-map src="…"/>`.
   Это и есть «микрофронтенд» при разных фреймворках host/remote (Module Federation отпадает,
   т.к. host — ванила).

> Открытый вопрос И1: embed отдаёт **только раздел «Карта»** или весь app-shell? (по умолчанию — только Карта).

---

## 4. Модель данных (топология)

Наследуем shape из `infraTopology.js` (минимально расширяем). Эндпоинт `GET /api/topology`:

```jsonc
{
  "host": { "name": "gigglin-server", "uptime": "21д", "cpu": 24, "ram": 64,
            "disk": 68, "net": 0.8, "vcpu": 8, "ram_total": 16, "os": "Ubuntu 24.04",
            "containers": { "total": 14, "running": 13 } },
  "telemetry": { "cpu": [{ "t": …, "value": … }], "ram": […], "net": […] },
  "networks": [
    { "name": "guacamole_default", "driver": "bridge", "external": false,
      "services": [
        { "name": "guacamole-web", "image": "guacamole/guacamole:1.5.5",
          "tech": "Java", "role": "app", "status": "running", "uptime": "…",
          "restarts": 0, "cpu": 1, "mem": 188, "url": "https://…" },
        { "name": "guacd",   "role": "worker", "mem": 7,  "status": "running" },
        { "name": "postgres","role": "db",     "mem": 28, "status": "running" }
      ] }
  ],
  "standalone": [
    { "name": "nginx", "role": "gateway", "status": "running", "cpu": 0.4 },
    { "name": "Netdata", "role": "monitor", "status": "running" },
    { "name": "внешние LLM", "role": "external", "status": "running" },
    { "name": "work-vm", "role": "vm", "tech": "RDP", "via": "guacamole", "open": "…" }
  ],
  "edges": [
    { "from": "internet", "to": "nginx", "type": "http" },
    { "from": "nginx", "to": "guacamole_default", "type": "http" },
    { "from": "Netdata", "to": "guacamole_default", "type": "monitor" },
    { "from": "guacamole", "to": "work-vm", "type": "rdp" }
  ]
}
```

**Расширения против текущего shape:**
- `networks[].driver` + `networks[].external` (нужно для раздела «Сети» и для отрисовки
  host-сети marzneshin иначе, чем bridge).
- `services[].uptime/restarts` уже есть в `normalizeService` — пробрасываем в UI.

Раздел «Контейнеры» и «Сети» отдаются отдельными эндпоинтами `GET /api/containers`,
`GET /api/networks` (плоские проекции того же снапшота) — чтобы не гонять весь граф.

---

## 5. Дизайн-система (без изменений относительно портфолио/дашборда)

Токены копируются 1-в-1 (см. `mockup.html`):
- Фон `oklch(13% .015 245)`, блюпринт-сетка 34px, радиальный зелёный glow сверху.
- Акцент `--green #59be6c`; палитра `aqua/blue/yellow/orange/purple/red`.
- Текст `--fg #eaeff3 / --fg-dim / --fg-muted`. Лейблы — JetBrains Mono, uppercase, tracking .13em. Body — Inter.
- Карточки: радиус 13px, бордер — полупрозрачный белый волосок. Статус-дот (up/warn/down) с пульсацией.
- **Новое только в оболочке:** топбар, навигация, строка-сводка, host-сеть оранжевым цветом — всё в тех же токенах.

---

## 6. Структура репозитория (предлагаемая)

```
status_dashboard/
  api/            # Node/Express + socket.io (порт infraTopology и сборщиков)
  web/            # React+TS+Vite (standalone + embed таргеты)
    src/components/topology/   # React Flow ноды/рёбра
    src/components/{HostVitals,LiveTelemetry,ContainersTable,NetworksList}
    src/styles/tokens.css
  docs/SPEC.md    # этот файл
  mockup.html     # визуальный источник правды (статичный)
  docker-compose.yml
```

---

## 7. Открытые вопросы
- **И1.** embed-таргет: только «Карта» или весь app-shell? (по умолчанию — Карта).
- **И2.** Период телеметрии в embed-режиме — наследуется от host или свой?
- **И3.** Сохранять ли пользовательские позиции узлов карты (localStorage) или всегда авто-лейаут?
- **И4.** Деплой: тот же паттерн, что life-dashboard (GHCR + GitHub Actions, сервер тянет образы)?
- **И5.** Авторизация standalone-режима: открыто / cookie-сессия как в life-dashboard?
```

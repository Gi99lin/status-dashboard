# План исправлений — карта инфраструктуры (status_dashboard + life-dashboard)

> Дата: 2026-06-11. Источник — обзор скриншотов прод-карты + чтение `api/src/infraTopology.js`,
> `web/src/sections/Map/*`, `life-dashboard/api/server.js`, `life-dashboard/collector/sources/weather_source.py`.
> Подтверждено с пользователем: группировка карточек — по `com.docker.compose.project`;
> «VM не видна» = гостевая VM через Guacamole; есть SSH-доступ к прод-хосту (`gigglin-server`) для диагностики.

---

## Проблема 1 (главная) — карточки группируются по docker-сети, а не по сервису

**Сейчас:** [`assembleTopology`](../api/src/infraTopology.js:64) строит `networks[]` — одна карточка
на каждую docker-сеть, в неё попадают все контейнеры этой сети. Из-за общей `my_server_proxy_network`
в одну карточку смешиваются ai-presentation, guacamole, life-dashboard, nextcloud, syncthing и т.д. —
совершенно разные сервисы.

**Нужно:** карточка = один сервис/проект (`com.docker.compose.project`), сети — это связи
(edges/теги), а не граница группировки.

### Backend (`api/src/infraTopology.js`)
1. Новая функция `projectFor(container)`:
   - `container.labels['com.docker.compose.project']`, если есть;
   - иначе fallback — `container.labels['dashboard.group']`, если есть (для будущей ручной разметки одиночных контейнеров);
   - иначе сам контейнер становится группой из одного элемента (имя группы = имя контейнера).
2. Заменить `grouped` (по сетям) на `groups` (по `projectFor`):
   - `name`: имя проекта (или `dashboard.name`/`com.docker.compose.project` человекочитаемое);
   - `services`: контейнеры проекта (текущая нормализация через `normalizeService` сохраняется);
   - `networks`: `[...new Set(services.flatMap(s => container.networks))]` — для edges/тегов;
   - `driver`/`external` для host-сети — особый случай (marzneshin host-mode и т.п.) можно оставить как есть, но переносить в группу контейнера, а не отдельной карточкой.
3. Edges пересчитать по членству в сетях группы, а не по имени сети:
   - `nginx → group`, если `proxy_network` (имя внешней прокси-сети, см. `docker-compose.yml`) ∈ `group.networks`;
   - `Netdata → group` — всегда (как сейчас, для всех групп);
   - `guacamole → vm` / `omniroute → external-llm` — без изменений.
4. **Важно для проблемы 6 (нет карточки вовсе):** т.к. каждый контейнер теперь точно попадает
   в одну группу (через fallback на «группа из одного контейнера»), ситуация «контейнер без сети →
   нет карточки» больше невозможна.
5. Обновить `flattenContainers`/`flattenNetworks` — сейчас они читают `topology.networks[].services`;
   `flattenContainers` логичнее переписать на `topology.groups[]`, `flattenNetworks` оставить как
   отдельную плоскую проекцию реальных docker-сетей (для раздела «Сети» — он остаётся как есть, не путать с карточками карты).
6. Обновить `api/src/test/infraTopology.test.js` — тесты сейчас написаны под группировку по сетям
   (нужно проверить fixtures: ожидаю там тестовые контейнеры с/без `com.docker.compose.project`).

### Frontend
1. `web/src/types.ts`: переименовать/добавить тип `ServiceGroup` (вместо/наравне с `NetworkGroup`):
   `{ name, services: Service[], networks: string[] }`.
2. `web/src/sections/Map/nodes.tsx`: `NetworkNode` → `ServiceGroupNode`:
   - заголовок карточки = `group.name` (имя проекта), а не имя docker-сети;
   - сети показывать как мелкие теги под заголовком (`network.networks.map(...)`), не как `NET <network>` лейбл-границу.
3. `web/src/sections/Map/layout.ts`: `topology.networks.forEach(...)` → `topology.groups.forEach(...)`,
   `resolveId`/edges по новому имени группы.
4. `web/src/sections/Networks/NetworksSection.tsx` и `Containers/ContainersSection.tsx` — проверить,
   не завязаны ли на старую форму `topology.networks[].services` (если завязаны — переключить на
   `/api/containers` и `/api/networks`, которые остаются плоскими проекциями).
5. `web/src/demo/demoTopology.ts` — обновить демо-данные под новую форму, чтобы demo-режим не сломался.

---

## Проблема 2 — слишком маленькие карточки / значения вплотную к краю

**Причина:** [`Topology.css:112`](../web/src/sections/Map/Topology.css:112) — `.datarow` это
`display:flex` без `flex-wrap`, плюс фикс. ширина карточки 268px ([layout.ts:66](../web/src/sections/Map/layout.ts:66)).
При 15-18 контейнерах в одной карточке (текущая `my_server_proxy_network`) каждый `.inode` сжимается до нечитаемого размера.

**После Проблемы 1** размер групп станет реалистичным (2-6 контейнеров на сервис), но всё равно стоит:
1. `.datarow { flex-wrap: wrap; }` + `.datarow .inode { flex: 1 1 110px; min-width: 90px; }`.
2. Если в группе много контейнеров (>6), рассмотреть авто-расширение ширины карточки в `layout.ts`
   (`style.width` зависит от `services.length`, а не константа).
3. Прогнать карту визуально (preview) после Проблемы 1 — велик шанс, что #2 решится сама собой и
   останется только точечная CSS-доводка.

---

## Проблема 3 — карточка хоста (`gigglin-server`): «— vCPU · — GB», ОС «—»

**Причина:** [`infraTopology.js:118-132`](../api/src/infraTopology.js:118) — поля `host.vcpu`,
`host.ram_total`, `host.os`, `host.uptime` нигде не заполняются. `HostCard.tsx` корректно рендерит
`—` как fallback — баг чисто в источнике данных.

**Фикс:**
1. В `api/src/server.js` добавить `getNetdataInfo()` — запрос `GET ${NETDATA_URL}/api/v1/info`
   (отдаёт `cores_total`, `ram_total`, `os_name`, `os_version`/`os_id_like`, `uptime` — проверить
   точные имена полей на реальном Netdata прод-хоста через SSH: `curl localhost:19999/api/v1/info | jq`).
2. В `collectTelemetry`/`collectTopology` ([infraTopology.js:196](../api/src/infraTopology.js:196))
   замаппить: `vcpu = cores_total`, `ram_total = round(ram_total / 1024 / 1024 / 1024)` (GB),
   `os = "${os_name} ${os_version}"`, `uptime` — сформатировать в `Хd Хч` или как уже формируется `host.uptime` ожидается фронтом.
3. Доводка CSS `HostCard.tsx`/`.row` — убедиться, что длинные строки ОС не вылезают за карточку
   (`overflow: hidden; text-overflow: ellipsis` или перенос).

---

## Проблема 4 — гостевая VM (через Guacamole) не видна на карте

**Причина:** [`infraTopology.js:92-105`](../api/src/infraTopology.js:92) — `vms` приходит из
`getGuacConnections()` ([guacamole.js](../api/src/guacamole.js)), которая возвращает `[]`, если
`GUAC_URL`/`GUAC_USER`/`GUAC_PASS` не заданы или Guacamole недоступна — без ошибки, тихо.

**Диагностика на прод-хосте (SSH):**
1. Проверить `.env` контейнера `status-dashboard-api`: заданы ли `GUAC_URL`, `GUAC_USER`, `GUAC_PASS`.
2. Из контейнера `status-dashboard-api` curl'ом проверить доступность `${GUAC_URL}/api/tokens`
   (сетевая связность между сетями `status_dashboard_network`/`proxy_network` и сетью guacamole).
3. Проверить, что в Guacamole реально создано подключение (connection) для VM — `mapGuacConnections`
   фильтрует записи без `name`.

**Фикс:** скорее всего конфигурационный (env/сеть), а не код. Если связность есть, но VM всё равно
не появляется — добавить логирование ошибки в `getGuacConnections` (сейчас все ошибки проглатываются
`catch { return []; }`), чтобы не гадать в будущем.

---

## Проблема 5 — карточка погоды пустая (life-dashboard)

**Эндпоинт** `/api/forecast` в [life-dashboard/api/server.js:838](file:///Users/ivanakimkin/Projects/life-dashboard/api/server.js#L838)
выглядит корректным (Open-Meteo без ключа, маппинг полей `current.*` верный). Проблема, видимо, в рантайме.

**Диагностика на прод-хосте (SSH):**
1. `curl -i http://localhost:<port>/api/forecast` (с авторизационной cookie, если `DASHBOARD_PASS` задан —
   эндпоинт защищён общим `app.use('/api', ...)` мидлваром).
2. Логи контейнера `life-dashboard-api` на момент запроса — ловим `console.error('Forecast error:', err)`.
3. Проверить исходящий доступ контейнера к `api.open-meteo.com` (DNS/egress из docker-сети).
4. Если API отдаёт корректный JSON, но виджет всё равно пуст — проверить фронт:
   `WeatherForecast.js` ожидает элементы `#weatherIcon/#weatherTemp/#weatherDesc/#weatherHum/...` —
   убедиться, что они есть в текущей разметке (могли быть переименованы при недавнем редизайне,
   судя по `docs/superpowers/plans/2026-06-04-dashboard-content-redesign*`).

---

## Порядок выполнения

```
1 (backend regroup) ──► 1 (frontend regroup) ──► 2 (CSS доводка)
3 (host info)   — независимо, можно параллельно
4 (VM/Guacamole) — независимо, в основном диагностика на хосте
5 (погода)       — отдельный репо (life-dashboard), независимо
```

Рекомендуемый порядок по импакту: **1 → 2 → 3 → 4 → 5** (1 закрывает сразу три жалобы:
«нет карточки», «карточка слишком маленькая», и саму главную проблему смешения сервисов).

## Открытые вопросы / нужно проверить на прод-хосте
- Точное имя внешней прокси-сети для определения edge `nginx → group` (по docker-compose видно
  `my_server_proxy_network`, но могут быть и другие external-сети у других проектов).
- Реальный формат `GET /api/v1/info` от установленного Netdata (поля могут отличаться по версии).
- Есть ли контейнеры вообще без `com.docker.compose.project` (запущенные вручную `docker run`) —
  от этого зависит, нужен ли осмысленный fallback-нейминг для одиночных карточек.

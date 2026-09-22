# ТвояОпора (opora)

Telegram мини-апп бота [@oporatvoja_bot](https://t.me/oporatvoja_bot). Основа — [шаблон vibe](https://github.com/di-sukharev/vibe): Bun/Hono/Prisma/PostgreSQL + React webapp + общие контракты. Репозиторий: https://github.com/Ivan-boop999/opora.

Продуктовые решения и статус приложений — в [CHECKLIST.md](CHECKLIST.md).

## Деплой

| Сервис | URL | Платформа |
| --- | --- | --- |
| webapp (мини-апп) | https://opora.onrender.com | Render static, free |
| API | https://opora-api.onrender.com | Render docker, free |
| БД | Neon (база `opora`) | free |

Автодеплой с ветки `master`: push в GitHub → Render пересобирает оба сервиса. Каталог `infra/` удалён при установке — Terraform не используется. Миграция на Yandex Cloud при появлении бюджета (решение владельца записано в CHECKLIST.md).

## Приложения

| Path and guide | Purpose |
| --- | --- |
| [backend](backend/README.md) | Bun/Hono, Prisma/PostgreSQL, Zod, JWT, OpenAPI |
| [webapp](webapp/README.md) | React/Vite, TanStack; CSR with registration and sign-in |
| [website](website/README.md) | Astro; public pages, content, and storefront |
| [mobile/README.md](mobile/README.md) | Guide to the Expo application on the `mobile` branch |
| [packages/contracts](packages/contracts/README.md) | Shared Zod schemas and TypeScript API types |

## Choose between `webapp` and `website`

- `website`: public pages, SEO, link previews, and catalog. Use Astro SSG by default. Use SSR or hybrid rendering when needed.
- `webapp`: screens after sign-in, user accounts, administration, and checkout without SEO.

A marketplace usually needs both. Do not move SEO into CSR or the entire account area into Astro. See [ARCHITECTURE.md](docs/ARCHITECTURE.md#клиенты) for framework selection.

Before work on data, carts, orders, or payments, read [WEB_SURFACES.md](docs/WEB_SURFACES.md). The authenticated webapp and backend own the single browser checkout. Website can pass an anonymous selection. Backend is the data source. Mobile has separate native payments. Store subscriptions are disabled on the `mobile` branch. Add other payment methods according to product needs and platform rules.

## Quick start

From the repository root:

```bash
bun install --frozen-lockfile
```

[Docker Compose](docs/LOCAL_DATABASE.md) is required for backend/API work, full-stack work, files, and database tests. The built-in webapp sign-in also requires the backend, database, and migrations. You can omit them after replacing or removing authentication. Website alone does not need them.

```bash
docker compose version
docker info
cp backend/.env.example backend/.env
docker compose --env-file backend/.env pull postgres
docker compose --env-file backend/.env up -d postgres
bun run --cwd backend prisma:deploy
bun run dev:seed
```

In PowerShell, use `Copy-Item backend/.env.example backend/.env` instead of `cp`. If Docker fails, follow the [instructions for your operating system](docs/LOCAL_DATABASE.md#если-docker-недоступен). Run PostgreSQL through Compose, not a native installation.

The seed uses `DEV_SEED_ADMIN_*` and `DEV_SEED_USER_*` from `backend/.env`. These demo credentials are public and must not be used in production:

| Role | Email | Password | Page |
| --- | --- | --- | --- |
| Administrator | `admin@example.com` | `local-admin-password` | `/admin` |
| User | `user@example.com` | `local-user-password` | `/app` |

The seed is safe to repeat. It permits only loopback databases and rejects `NODE_ENV=production`. On the `mobile` branch, sign-in and the components screen do not require a subscription. The seed does not grant premium access. Mobile has no admin interface. Deployment uses `db:deploy` with `ADMIN_SEED_*`, not the local seed.

Start the required applications in separate terminals:

```bash
bun run dev:backend
bun run dev:webapp
bun run dev:website
```

To use another API address, set `VITE_API_URL` in `webapp/.env`, for example `http://localhost:3000`.

The browser origin must match `CORS_ORIGINS` in `backend/.env`. `http://localhost:5173` and `http://127.0.0.1:5173` are different origins. For Vite with `--host 127.0.0.1`, add the second origin and restart the backend. Otherwise, `/api/auth/refresh` returns `CORS Missing Allow Origin` and the session check fails. If you have several project copies, check which copy runs the servers on `3000` and `5173`.

## Checks

Select focused checks using [AGENTS.md](AGENTS.md#testing-and-verification) and [TESTING.md](docs/TESTING.md). Open a browser only on explicit request. Run full `bun run check` for a release, a system-wide audit, or a change across the system. It requires Docker and package registry access. Check Terraform separately.

## Documentation

The guides contain details and official sources:

| Area | Guide |
| --- | --- |
| Development, build, test, database, and release commands | [COMMANDS.md](docs/COMMANDS.md) |
| Dependency updates and temporary audit exceptions | [TESTING.md](docs/TESTING.md#dependency-updates) |
| Modules, processes, authentication, clients, and Prisma | [ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Schedules, jobs, and outbox | [BACKGROUND_JOBS.md](docs/BACKGROUND_JOBS.md) |
| PostgreSQL, test databases, and resets | [LOCAL_DATABASE.md](docs/LOCAL_DATABASE.md) |
| Email and files | [EMAIL.md](docs/EMAIL.md), [STORAGE.md](docs/STORAGE.md) |
| Mobile application setup | [mobile/README.md](mobile/README.md) |

## License

Apache License 2.0. When distributing a copy, fork, or derived project, keep [LICENSE](LICENSE) and [NOTICE](NOTICE). Preserve the attribution to Dima Sukharev, his GitHub account, and the source repository.

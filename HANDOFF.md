# HANDOFF — ТвояОпора (opora)

Telegram Mini App заботы о самочувствии для бота @oporatvoja_bot. Основа — шаблон vibe (Bun/Hono/Prisma/PostgreSQL + React webapp + contracts). Продуктовое задание: `C:\Users\Admin\Desktop\дофамин\ZCODE_FULL_PRODUCT_PROMPT.md` («Тише» → наше имя «ТвояОпора»).

## Инфраструктура (готово)

| Что | Значение |
| --- | --- |
| Репозиторий | https://github.com/Ivan-boop999/opora (публичный, ветка master) |
| webapp (мини-апп) | https://opora.onrender.com — Render static free, автодеплой с master |
| API | https://opora-api.onrender.com — Render docker free (`backend/Dockerfile`), автодеплой |
| БД | Neon, проект oculusivan, база `opora`, endpoint ep-proud-pond-ax88a5v7(-pooler) |
| Файлы | B2 бакет prommarket-uploads (общий, через PRIVATE_STORAGE_*) |
| Бот | @oporatvoja_bot «ТвояОпора»; кнопка меню → мини-апп; команды /start /app /help |
| Секреты | `C:\temp\opora-deploy\`: telegram-bot-token, neon-db-url, jwt-secret, admin-email, admin-password. Render-токен: `C:\temp\prommarket-deploy\render-api-key` (api.render.com/v1) |

Обновление продакшена: `git push` в master → Render пересобирает оба сервиса сам. Откат: revert-коммит или Render Dashboard → Manual Deploy → предыдущий коммит.

VPN: api.render.com с этого ПК только через VPN (v2rayN). GitHub, *.onrender.com, Neon-эндпоинты — напрямую. Прокси-переменные HTTP_PROXY/HTTPS_PROXY ломают юнит-тесты с localhost-fetch — запускать тесты с `HTTP_PROXY= HTTPS_PROXY=`.

## Состояние (обновлять по ходу)

- 2026-09-22: шаблон установлен и переименован в opora; CHECKLIST заполнен (деплой Render free — решение владельца); проверки: template:check ✓, architecture:check ✓, typecheck ✓, unit 300/300 ✓ (2 фикса под Windows: прокси и POSIX-пути в storage-тесте). GitHub + Neon + Render + бот настроены; задеплоен каркас шаблона.
- Продукт: в разработке (этапы ниже).

## План этапов (из задания §33)

1. ~~Инфраструктура~~ ✓
2. Дизайн-токены, 2 темы, Manrope, AppShell + 5 вкладок
3. Telegram-вход (initData), сессия, профиль/преференции/согласия
4. Полная Prisma-схема (§25) + миграция
5. Цикл: отметка → рекомендация → сессия → фидбек → награда сада
6. Seed 48 карточек + 8 программ; каталог с поиском/фильтрами
7. Сад: сцена, растения, стадии, капли, лимиты 4/сутки
8. План/привычки, программы UI, фокус, вечер, дневник, статистика
9. Бот-напоминания (worker через outbox), поддержка, админка
10. ИИ-адаптер — только при наличии ключа; аудио — только при ассетах

## Команды

```bash
bun install                     # зависимости
bun run dev:backend             # API :3000 (нужен Docker postgres)
bun run dev:webapp              # webapp :5173
bun run test:backend:unit       # юнит-тесты (с очищенными HTTP_PROXY/HTTPS_PROXY)
bun run typecheck               # типы всех пакетов
bun run architecture:check      # границы модулей
```

Локальная БД: `docker compose --env-file backend/.env up -d postgres`, миграции `bun run --cwd backend prisma:deploy`. Прод-БД: миграции применяются сами при старте контейнера API (CMD с ретраями).

## Известные особенности

- Render free: API засыпает через 15 мин простоя, первый запрос ~30–60 с; статика не спит.
- Часовой пояс сервера UTC; локальные даты/награды — по TZ пользователя (хранится в preferences).
- Админ: seed owner@opora.app (пароль в C:\temp\opora-deploy\admin-password), вход через веб /admin. Позже — привязка роли к Telegram ID владельца.
- Название/тексты: «ТвояОпора», подпись «Место, где можно выдохнуть». Тон — на «ты», без давления (задание §29).

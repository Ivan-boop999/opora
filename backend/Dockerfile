FROM oven/bun:1.4.0 AS build

WORKDIR /app

# Copy the repository instead of enumerating workspace manifests. The master branch
# intentionally has no mobile package, while the mobile branch does; this build must
# remain valid for both repository shapes.
COPY . .

RUN bun install --frozen-lockfile --filter @opora/backend

WORKDIR /app/backend

RUN DATABASE_URL="postgresql://superuser:superpassword@localhost:5432/opora?schema=public" bun run prisma:generate

FROM oven/bun:1.4.0 AS production-dependencies

WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile --production --filter @opora/backend

FROM oven/bun:1.4.0 AS runtime

WORKDIR /app

COPY --from=build /app/package.json /app/bun.lock /app/bunfig.toml ./
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/packages/contracts ./packages/contracts
COPY --from=build /app/backend ./backend

WORKDIR /app/backend

ENV NODE_ENV=production

USER bun

# Миграции с повторами: Neon (free) просыпается дольше 10-секундного advisory-lock
# таймаута Prisma, поэтому первый запуск migrate deploy может споткнуться о холодную базу.
CMD ["sh", "-c", "for i in 1 2 3 4 5; do bun run prisma:deploy && break; echo \"migrate retry $i\"; sleep 12; done && bun scripts/seed-content.ts && exec bun src/index.ts"]

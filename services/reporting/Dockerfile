FROM node:22-alpine AS dependencies
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY services/reporting/package.json services/reporting/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
COPY packages/shared packages/shared
COPY services/reporting services/reporting
RUN pnpm --filter @pente/shared build && pnpm --filter @pente/reporting build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S pente && adduser -S pente -G pente
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/package.json package.json
COPY --from=build /app/services/reporting/package.json services/reporting/package.json
COPY --from=build /app/services/reporting/dist services/reporting/dist
COPY --from=build /app/packages/shared/package.json packages/shared/package.json
COPY --from=build /app/packages/shared/dist packages/shared/dist
USER pente
EXPOSE 5001
CMD ["node", "services/reporting/dist/main.js"]

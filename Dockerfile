# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /usr/src/app
ENV NODE_ENV=production

FROM base AS deps
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM base AS test-deps
ENV NODE_ENV=development
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci

FROM test-deps AS test
COPY . .
# RUN npm test

FROM base AS runtime
RUN apk add --no-cache python3 \
  && addgroup -S nodeapp && adduser -S nodeapp -G nodeapp
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=test /usr/src/app/src ./src
COPY --from=test /usr/src/app/data ./data
COPY package*.json ./
RUN mkdir -p logs python_scripts && chown -R nodeapp:nodeapp /usr/src/app
USER nodeapp

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3000) + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "src/index.js"]

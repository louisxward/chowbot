# Build stage: build tools are a fallback for better-sqlite3 if no prebuilt binary matches,
# and don't ship in the final image
FROM node:24-alpine AS build

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Runtime stage
FROM node:24-alpine

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY package*.json ./
COPY src/ ./src/

ENV NODE_ENV=production

EXPOSE 33002

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 33002) + '/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "src/index.js"]

FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
# Build the TypeScript code
RUN npm run build || npx tsc

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 18789 8080

# Default command to run the gateway server
CMD ["node", "dist/server.js"]

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Builder: install all deps, compile TypeScript → dist/
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Production: lean image with only production deps + compiled dist
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies only (bcrypt prebuilt binary is fetched here)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Create directories that will be mounted as volumes at runtime.
# They must exist so the process can write to them before the volume is mounted.
RUN mkdir -p public/uploads logs

# 9010 = Express REST API   |   9020 = Socket.IO server
EXPOSE 9010 9020

CMD ["node", "dist/server.js"]

# ── Stage 1: Build dependencies ──
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install --only=production && npm cache clean --force

# ── Stage 2: Production image ──
FROM node:20-alpine AS production
RUN apk add --no-cache curl dumb-init
RUN addgroup -g 1001 -S nodejs && adduser -S nodeapp -u 1001
WORKDIR /app
COPY --from=builder --chown=nodeapp:nodejs /app/node_modules ./node_modules
COPY --chown=nodeapp:nodejs . .
RUN mkdir -p logs && chown nodeapp:nodejs logs
USER nodeapp
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]

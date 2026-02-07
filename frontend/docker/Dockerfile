FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 1. Copy static assets (Public) - unchanged
COPY public ./public

# 2. Copy Standalone output (Key modification!!!)
# ❌ Old way: COPY .next/standalone ./
# ✅ New way: Copy from the nested 'frontend' directory, placing server.js in the root.
COPY .next/standalone/frontend ./

# 3. Copy static assets (.next/static) - unchanged
COPY .next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
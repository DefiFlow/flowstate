FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 1. 拷贝静态资源 (Public) - 保持不变
COPY public ./public

# 2. 拷贝 Standalone 产物 (关键修改！！！)
# ❌ 旧写法: COPY .next/standalone ./
# ✅ 新写法: 多加一层 /frontend，把里面的 server.js 拷到根目录
COPY .next/standalone/frontend ./

# 3. 拷贝静态资源 (.next/static) - 保持不变
COPY .next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
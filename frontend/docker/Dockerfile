FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 1. 拷贝静态资源 (Public)
# 注意：构建时会在外部准备好这些文件，这里直接拷
COPY public ./public

# 2. 拷贝 Standalone 产物 (核心逻辑 & node_modules)
# .next/standalone 里的目录结构会自动模拟你的项目结构
COPY .next/standalone ./

# 3. 拷贝静态资源 (.next/static)
# Standalone 模式不包含 static 文件夹，需要单独拷
COPY .next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json* .npmrc* ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build
RUN test -f dist/index.html || (echo "ERROR: dist/index.html missing after build" && exit 1)
EXPOSE 8080
ENV NODE_ENV=production
CMD ["node", "server.mjs"]

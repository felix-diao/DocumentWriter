# Stage 1: Build frontend with Node.js 20
FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN npm config set registry https://registry.npmmirror.com

COPY package*.json ./

RUN npm install

COPY . .

RUN PUBLIC_PATH=/agent_officea/ BASE_PATH=/agent_officea/ npm run build

# Stage 2: Serve with Nginx
FROM nginx:1.27-alpine

ENV TZ=Asia/Shanghai

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 30001 443

CMD ["nginx", "-g", "daemon off;"]

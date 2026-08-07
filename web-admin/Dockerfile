# Giai đoạn 1: build Angular
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

# Giai đoạn 2: serve bằng nginx
FROM nginx:1.27-alpine
# Bật script điền ${NGINX_LOCAL_RESOLVERS} từ /etc/resolv.conf (kube-dns trong K8s).
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
# Đặt vào templates/ để entrypoint nginx chạy envsubst (điền ${NGINX_LOCAL_RESOLVERS})
# rồi sinh ra /etc/nginx/conf.d/default.conf, ghi đè config mặc định.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/web-admin/browser /usr/share/nginx/html
# 443: chứng chỉ TLS mount runtime từ K8s secret web-admin-tls (không bake vào image).
EXPOSE 80 443

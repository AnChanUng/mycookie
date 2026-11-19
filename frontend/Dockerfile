# syntax=docker/dockerfile:1
# 그램 온프레미스 서버용 화면 이미지: 빌드한 dist를 nginx로 내보낸다(deploy/homeserver/deploy.sh가 빌드)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# npm 내려받기 캐시를 빌드 사이에 재사용한다
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY . .
# production: 운영, preview: 스테이징. API는 같은 주소의 /api/v1로 부른다
ARG VITE_DEPLOY_ENV=production
ARG GIT_COMMIT=unknown
ENV VITE_DEPLOY_ENV=$VITE_DEPLOY_ENV VITE_API_BASE=/api/v1 GIT_COMMIT=$GIT_COMMIT
RUN npm run build

FROM nginx:1.27-alpine
ENV BACKEND_HOST=backend-prod ROBOTS_HEADER=""
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
# 보안 헤더는 conf.d에 .inc로 만들어 각 location에서 include한다(.conf가 아니라 그대로는 읽히지 않는다)
COPY nginx/security-headers.conf.template /etc/nginx/templates/security-headers.inc.template
COPY --from=build /app/dist /usr/share/nginx/html

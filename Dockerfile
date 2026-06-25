# syntax=docker/dockerfile:1

FROM node:26-alpine AS build

ENV CI=true
RUN npm install -g pnpm && apk add --no-cache git

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .

# Vite inlines these at build time — they must be build args, not runtime env vars.
ARG VITE_API_BASE_URL
ARG VITE_LOGIN_URL
ARG VITE_LOGOUT_URL
ARG VITE_ACCOUNT_INFO

RUN pnpm build

FROM nginx:1.31-alpine AS serve

# Rahti/OpenShift runs the container as an arbitrary UID in the root group,
# not as a fixed user. Per docs.csc.fi/cloud/rahti/images/creating, grant
# the root group write access to nginx runtime directories and remove the
# `user` directive, since the assigned UID already owns the process.
#
# `/etc/nginx/conf.d` must also be writable because startup renders
# `app.conf.template` to `default.conf` there via envsubst.
RUN chmod g+rwx /var/cache/nginx /var/run /var/log/nginx /etc/nginx/conf.d && \
    chown nginx:root /var/cache/nginx /var/run /var/log/nginx /etc/nginx/conf.d && \
    sed -i.bak 's/^user/#user/' /etc/nginx/nginx.conf

# nginx.conf uses ${BACKEND_URL} — envsubst renders it at container startup
COPY nginx.conf /etc/nginx/conf.d/app.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8081

CMD ["/bin/sh", "-c", "envsubst '${BACKEND_URL}' < /etc/nginx/conf.d/app.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
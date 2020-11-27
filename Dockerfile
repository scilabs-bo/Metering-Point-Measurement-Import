### Builder
FROM node:14.15.1-alpine AS builder

# Prepare build environment
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install dependencies (with dev dependencies)
COPY package.json package-lock.json /usr/src/app/
RUN npm install

# Copy source files and build project
COPY . /usr/src/app
RUN npm run build

### Production
FROM node:14.15.1-alpine

LABEL maintainer="Katarzyna Borys <katarzyna.borys@scilabs.de>"
ENV NODE_ENV=production

# Prepare production environment
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Copy crontab
COPY crontab /etc/cron/crontab
RUN crontab /etc/cron/crontab

# Install dependencies (without dev dependencies)
COPY package.json package-lock.json /usr/src/app/
RUN npm install

# Copy compiled typescript from builder
COPY --from=builder /usr/src/app/build /usr/src/app

ENTRYPOINT [ "crond", "-f" ]
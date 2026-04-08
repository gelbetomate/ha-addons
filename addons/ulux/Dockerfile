ARG BUILD_FROM=ghcr.io/hassio-addons/base:16.3.2
FROM $BUILD_FROM

# Install Node.js and npm
RUN apk add --no-cache nodejs npm

WORKDIR /app

# Copy package files first for layer caching
COPY app/package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY app/ .

# Register s6 service that starts the Node.js app under the base image init system
COPY rootfs/ /
RUN chmod a+x /etc/services.d/ulux/run

ARG BUILD_FROM
FROM $BUILD_FROM

# Install Node.js and npm
RUN apk add --no-cache nodejs npm

WORKDIR /app

# Copy package files first for layer caching
COPY app/package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY app/ .

CMD ["node", "index.js"]

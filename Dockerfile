FROM node:20-alpine

WORKDIR /app

# Install runtime utilities used by healthchecks/tools
RUN apk add --no-cache curl

# Copy app manifests first to leverage Docker layer caching
COPY package.json /app/package.json
COPY package-lock.json /app/package-lock.json
COPY tsconfig.json /app/tsconfig.json
COPY tsconfig.server.json /app/tsconfig.server.json
COPY next.config.js /app/next.config.js
COPY tailwind.config.js /app/tailwind.config.js
COPY postcss.config.js /app/postcss.config.js
COPY .eslintrc.json /app/.eslintrc.json

# Copy source and public assets
COPY src /app/src
COPY public /app/public

RUN npm install
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/server.js"]


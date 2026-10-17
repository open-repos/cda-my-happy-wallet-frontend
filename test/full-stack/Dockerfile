FROM node:22-bookworm

WORKDIR /app
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright
COPY package.json package-lock.json ./
RUN npm ci && npx playwright install --with-deps chromium
COPY . .
RUN chown -R node:node /app
USER node
CMD ["npm", "run", "test:e2e:full"]

FROM node:18-slim

WORKDIR /app

ENV NODE_ENV=production \
    PORT=8080

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .
RUN chown -R node:node /app

USER node

EXPOSE 8080

CMD ["npm", "start"]

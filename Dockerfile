# Build client then run server (Docker Compose for Coolify)
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production
FROM node:18-alpine

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/node_modules ./node_modules

WORKDIR /app/server
EXPOSE 3000
CMD ["node", "index.js"]
# Stage 1: Build client
FROM node:18-alpine AS builder

WORKDIR /app
COPY client/package*.json ./client/
WORKDIR /app/client
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Run server + nginx
FROM node:18-alpine

# Install nginx
RUN apk add --no-cache nginx

WORKDIR /app

# Copy server files
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install --production
COPY server/ ./

# Copy built client to nginx
WORKDIR /app
RUN mkdir -p /usr/share/nginx/html && cp -r client/dist/* /usr/share/nginx/html/

# Config nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 3000

# Start both nginx and node server
CMD sh -c "node index.js & nginx -g 'daemon off;'"
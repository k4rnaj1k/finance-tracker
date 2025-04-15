FROM node:20-alpine
WORKDIR /app
COPY package-lock.json .
COPY package.json .
RUN npm ci --force
COPY . .
RUN npm run build
CMD npm run start
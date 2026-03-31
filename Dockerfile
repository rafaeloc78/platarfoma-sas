FROM node:latest

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Ignoramos el build error por no haber index.js para webpack
RUN npm run build || true

EXPOSE 8080

CMD ["npm", "start"]

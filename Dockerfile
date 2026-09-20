FROM node:20-alpine

WORKDIR /app

# Sakinisha git
RUN apk add --no-cache git

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8080

CMD ["npm", "start"]

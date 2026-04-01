FROM node:18-alpine

WORKDIR /app


COPY package*.json ./

# Explicitly set registry during install as well
RUN npm install

COPY . .

EXPOSE 4001
CMD ["npm", "run", "dev"]

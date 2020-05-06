FROM node:12.16.3

WORKDIR /home/node/app

COPY package.json package-lock*.json ./

RUN npm install && npm cache clean --force

COPY . .

# For deployment
# CMD ["npm", "run", "start"]

# For development
CMD ["npm", "run", "dev"]
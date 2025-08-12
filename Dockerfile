# Lightweight official Nodejs image as base
FROM node:24-alpine

# Setting the working directory 
WORKDIR /app

# COPY package.json and package-lock.json for Docker caching 
COPY package*.json ./
COPY bot/package*.json ./bot/
COPY server/package*.json ./server/

# Install dependencies
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV
RUN if [ "$NODE_ENV" = "production" ]; then \
    npm install --workspaces --omit=dev; \
    else \
    npm install --workspaces; \
    fi


# COPY the rest
COPY . .

# Run the bot
WORKDIR /app/bot
CMD ["npm", "start"]

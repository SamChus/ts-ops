FROM node:20-alpine AS base

WORKDIR /home/app

COPY package*.json *.json ./

RUN npm install


FROM base AS development

COPY . .

FROM base AS build

COPY . .

RUN npm run build

FROM node:20-alpine AS production

WORKDIR /home/app

COPY package*.json *.json ./

RUN npm ci --only=production

COPY --from=build /home/app/dist ./dist

EXPOSE 3000




# # Stage 1: Build Environment
# FROM node:20-alpine As builder

# WORKDIR /home/app 

# COPY package*.json tsconfig.json ./

# RUN npm install

# COPY src /home/app/src

# RUN npm run build


# # Stage 2: Runtime Environment
# FROM node:20-alpine 

# WORKDIR /home/app

# COPY package*.json /home/app/

# RUN npm install --only=production 

# COPY --from=builder /home/app/dist /home/app/dist

# EXPOSE 3000

# CMD ["node", "./dist/index.js"]
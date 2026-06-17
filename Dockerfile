# --- STEP 1: Dependencies ---
FROM node:20-alpine AS dependencies
WORKDIR /home/app
COPY package*.json tsconfig.json ./
# Install ALL dependencies (including typescript) so we can compile the code
RUN npm ci

# --- STEP 2: Build Stage ---
FROM node:20-alpine AS build
WORKDIR /home/app
# Copy installed node_modules from the dependencies stage
COPY --from=dependencies /home/app/node_modules ./node_modules
COPY . .
# Compile TypeScript into the /dist folder
RUN npm run build

# --- STEP 3: Production Run Stage ---
FROM node:20-alpine AS production
WORKDIR /home/app

# Set production environment optimization
ENV NODE_ENV=production

# Copy only production dependencies to keep the image lightweight
COPY package*.json ./
RUN npm ci --only=production

# Copy the compiled JS files from the build stage
COPY --from=build /home/app/dist ./dist

# Open up your application port
EXPOSE 3000

# CRITICAL FIX: The actual command that keeps the container alive and runs your app
CMD ["node", "dist/index.js"]





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
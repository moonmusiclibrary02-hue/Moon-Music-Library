# frontend/Dockerfile

# Stage 1: Build the React application
FROM node:18-slim AS build
WORKDIR /app

# --- ADD THIS LINE ---
ARG REACT_APP_BACKEND_URL

COPY package.json ./
COPY package-lock.json ./
RUN npm install
COPY . ./

# --- MODIFY THIS LINE ---
RUN REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL npm run build

# --- Stage 2: Serve the application ---
FROM node:18-slim
WORKDIR /app
COPY package.json ./
COPY package-lock.json ./
RUN npm install --omit=dev
COPY --from=build /app/build ./build
EXPOSE 8080
CMD [ "npx", "serve", "-s", "build" ]
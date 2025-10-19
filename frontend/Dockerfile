# frontend/Dockerfile

# --- Stage 1: Build the React application ---
FROM node:18-slim AS build

WORKDIR /app

# Copy package files and install all dependencies
COPY package.json ./
COPY package-lock.json ./
RUN npm install

# Copy the rest of the source code
COPY . ./

# Create the production build
RUN npm run build


# --- Stage 2: Serve the application from a lightweight image ---
FROM node:18-slim

WORKDIR /app

# Copy only the necessary files for production
COPY package.json ./
COPY package-lock.json ./

# Install ONLY production dependencies (like 'serve')
RUN npm install --omit=dev

# Copy the static build files from the 'build' stage
COPY --from=build /app/build ./build

# The port the container will listen on. Cloud Run will provide this via env var.
EXPOSE 8080

# The command to start the app.
# This runs 'serve' directly instead of through 'npm start'.
# 'serve' automatically listens on the PORT environment variable.
CMD [ "npx", "serve", "-s", "build" ]

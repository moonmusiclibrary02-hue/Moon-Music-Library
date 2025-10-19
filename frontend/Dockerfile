# frontend/Dockerfile

# Stage 1: Build the React application
FROM node:18-alpine AS build
WORKDIR /app
COPY package.json ./
COPY package-lock.json ./
RUN npm install
COPY . ./
RUN npm run build

# Stage 2: Serve the static files with a lightweight server
FROM node:18-alpine
WORKDIR /app

# Copy the package.json to install the 'serve' dependency
COPY package.json ./
COPY package-lock.json ./
RUN npm install --omit=dev

# Copy the build output from the build stage
COPY --from=build /app/build ./build

# This command runs the "start": "serve -s build" script from package.json
CMD [ "npm", "start" ]

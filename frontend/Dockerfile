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

# Copy the build output from the build stage
COPY --from=build /app/build ./build
COPY package.json ./
COPY package-lock.json ./

# Install only the production server dependency
RUN npm install --omit=dev

# Expose the port that Cloud Run will use
# This is for documentation; Cloud Run overrides this with the PORT env var
EXPOSE 8080

# The command to start the application
# This will run the "start": "serve -s build" script from package.json
CMD [ "npm", "start" ]

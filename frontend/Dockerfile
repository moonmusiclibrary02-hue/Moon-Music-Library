# Stage 1: Build the React application
FROM node:20 AS builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN npm run build

# Stage 2: Serve the files with NGINX and inject the environment variable
FROM nginx:alpine

# Copy the built assets
COPY --from=builder /app/build /usr/share/nginx/html

# Copy the startup script
COPY entrypoint.sh /
RUN chmod +x /entrypoint.sh

# The container will listen on port 8080 (NGINX will be configured by Cloud Run)
EXPOSE 8080

# Run the startup script
CMD ["/entrypoint.sh"]

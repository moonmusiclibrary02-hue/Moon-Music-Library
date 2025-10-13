# Stage 1: Build the React application
FROM node:20 AS builder

WORKDIR /app
COPY package.json yarn.lock ./

# Use 'yarn' to install dependencies
RUN yarn install --frozen-lockfile

# Copy the rest of the application source code
COPY . .
RUN npm run build

# Stage 2: Serve the built static files with NGINX
FROM nginx:alpine

# Copy the custom NGINX configuration file
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built static assets from the 'builder' stage
COPY --from=builder /app/build /usr/share/nginx/html

# The NGINX server will now listen on port 8080 as defined in nginx.conf
EXPOSE 8080

# Command to start NGINX in the foreground
CMD ["nginx", "-g", "daemon off;"]
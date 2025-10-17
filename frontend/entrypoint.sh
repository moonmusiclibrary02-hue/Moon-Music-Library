#!/bin/sh

# This script replaces the placeholder in the HTML with the actual environment variable
# passed to the container by Cloud Run.

# Find all JavaScript and CSS files in the build directory
ROOT_DIR=/usr/share/nginx/html
FILES="$ROOT_DIR/index.html $ROOT_DIR/static/js/*.js $ROOT_DIR/static/css/*.css"

# Replace the placeholder with the actual backend URL
for file in $FILES
do
  sed -i "s|__BACKEND_URL__|${BACKEND_URL}|g" $file
done

# Start the NGINX server in the foreground
nginx -g 'daemon off;'

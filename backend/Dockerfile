# Use a Python base image
FROM python:3.11-slim

# Set the working directory
WORKDIR /app

# Copy and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Set the environment variable for the port
# Cloud Run will assign a port via an ENV variable, which typically defaults to 8080.
# Your Python server must listen on the port defined by this variable.
ENV PORT 8080

# This command starts your server.
# **ASSUMPTION:** This command needs to be correct for your Python framework (e.g., gunicorn for production)
# Replace 'gunicorn --bind :$PORT server:app' with the actual command to run your server.py.
CMD exec uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}
# A more robust production command might be: CMD ["gunicorn", "--bind", "0.0.0.0:$PORT", "server:app"]

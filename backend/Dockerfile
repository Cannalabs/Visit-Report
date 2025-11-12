FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Note: env.conf should be mounted as volume in docker-compose.yml
# This allows configuration without rebuilding the image

# Expose port
EXPOSE 8000

# Run the application
# Server host and port can be overridden via env.conf or environment variables
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]


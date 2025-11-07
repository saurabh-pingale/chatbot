# Stage 1: Builder - for installing dependencies
FROM python:3.11.3-slim AS builder

# Set working directory
WORKDIR /app

# Install build dependencies for python packages that might need compilation
# Using --no-install-recommends to keep the image smaller
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc build-essential && \
    rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Final image - for running the application
FROM python:3.11.3-slim

# Set working directory
WORKDIR /app

# Create a non-root user and group for security
RUN addgroup --system app && adduser --system --ingroup app app

# Copy installed packages and binaries from builder stage
COPY --from=builder /usr/local /usr/local

# Install utilities for GCS
RUN apt-get update && apt-get install -y wget unzip gnupg && rm -rf /var/lib/apt/lists/*

# (For gsutil: install only if private bucket, or use wget for public!)
RUN pip install --no-cache-dir google-cloud-storage

# Copy application code and set ownership to the new user
COPY --chown=app:app . .

ARG ENV=local

# Pull + extract from bucket (zip or tar.gz). For local, just rely on your own local_models copy.
RUN if [ "$ENV" = "production" ]; then \
      wget https://storage.googleapis.com/testapp-prod-embeddings/bge-small-en-v1.5.zip -O /app/bge-small-en-v1.5.zip && \
      mkdir -p /app/local_models/ && \
      unzip /app/bge-small-en-v1.5.zip -d /app/local_models/ && \
      rm /app/bge-small-en-v1.5.zip ; \
    fi

# Switch to the non-root user
USER app

# Expose the port the app runs on
EXPOSE $PORT

# Command to run the application in production
CMD ["/bin/sh", "-c", "uvicorn main:app --host 0.0.0.0 --port $PORT"]
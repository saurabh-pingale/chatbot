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

# Copy application code and set ownership to the new user
COPY --chown=app:app . .

# Switch to the non-root user
USER app

# Expose the port the app runs on
EXPOSE  8000

# Command to run the application in production
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
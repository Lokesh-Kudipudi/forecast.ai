# Base Python runtime
FROM python:3.12-slim

# Install system dependencies (git is required for parsing version logs)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy uv package manager binary
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy lock and package files
COPY pyproject.toml uv.lock ./

# Synchronize python dependencies in a frozen environment
RUN uv sync --frozen --no-dev

# Copy application files
COPY . .

# Create target persistent logs directory
RUN mkdir -p /var/log/forecast_ai && chmod 777 /var/log/forecast_ai

EXPOSE 8000

# Run FastAPI serving endpoints using uvicorn inside the uv environment
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

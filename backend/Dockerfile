# Stage 1: Build dependencies
FROM python:3.12-slim as builder
WORKDIR /app

# Install system dependencies for psocpg2 and build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt

# Stage 2: Final runtime image
FROM python:3.12-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/wheels /wheels
COPY --from=builder /app/requirements.txt .
RUN pip install --no-cache /wheels/*

COPY . .

# Expose port
EXPOSE 8000

# The command is overridden in docker-compose for dev, but this is the prod default
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

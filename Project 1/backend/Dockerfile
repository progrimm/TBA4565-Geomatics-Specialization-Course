FROM ghcr.io/astral-sh/uv:0.12.21-python3.14-trixie-slim

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-install-project --no-dev

COPY database.py main.py greenland_areas.py ./

ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

CMD ["fastapi", "run", "main.py", "--host", "0.0.0.0", "--port", "8000"]
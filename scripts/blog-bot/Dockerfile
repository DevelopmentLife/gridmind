FROM python:3.12-slim

RUN groupadd --gid 1001 blogbot && \
    useradd --uid 1001 --gid 1001 --create-home --shell /bin/bash blogbot

COPY --from=ghcr.io/astral-sh/uv:0.4.18 /uv /usr/local/bin/uv

WORKDIR /app

COPY pyproject.toml ./
RUN uv venv /opt/venv && \
    uv pip install --python /opt/venv/bin/python -r pyproject.toml

COPY . .

RUN chown -R blogbot:blogbot /app

USER blogbot

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

CMD ["python", "main.py"]

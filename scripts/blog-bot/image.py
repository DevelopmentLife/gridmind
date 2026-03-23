"""Image generation via Pollinations.ai — free, no API key, cartoony style."""

from __future__ import annotations

import urllib.parse
import structlog

logger = structlog.get_logger()

STYLE_SUFFIX = (
    ", cartoon style, chibi, colorful, pastel colors, cute illustration, not serious, flat design"
)


def generate_image_url(prompt: str) -> str:
    """Return a Pollinations.ai image URL for the given prompt.

    Free service, no API key required. Images are generated on-demand.
    """
    full_prompt = f"{prompt}{STYLE_SUFFIX}"
    encoded = urllib.parse.quote(full_prompt)
    url = f"https://image.pollinations.ai/prompt/{encoded}?width=1200&height=630&nologo=true&model=flux"
    logger.info("image_url_generated", prompt=prompt[:60])
    return url

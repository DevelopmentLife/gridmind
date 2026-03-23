"""GridMind Blog Bot — three AI agents that research, debate, and publish blog posts.

Agents:
  SCOUT  — Researcher: finds 3 trending DBaaS / AI cost topics via web search
  CIPHER — Critic: scores each topic's validity and audience relevance
  QUILL  — Editor: picks the winner, writes the 2-3 paragraph post

Runs on a configurable interval (default 24h). Publishes to GitHub → Vercel auto-deploys.
"""

from __future__ import annotations

import os
import time
from datetime import UTC, datetime

import schedule
import structlog
from anthropic import Anthropic

from agents import cipher_critique, quill_write, scout_research
from image import generate_image_url
from publisher import publish_post

structlog.configure(
    processors=[
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(20),  # INFO
    logger_factory=structlog.PrintLoggerFactory(),
)

logger = structlog.get_logger()


def run_blog_cycle() -> None:
    """Run one full blog post cycle: research → critique → write → publish."""
    logger.info("blog_cycle_start")

    anthropic_key = os.environ["ANTHROPIC_API_KEY"]
    github_token = os.environ["GITHUB_TOKEN"]
    repo_name = os.environ.get("GITHUB_REPO", "DevelopmentLife/gridmind")

    client = Anthropic(api_key=anthropic_key)

    try:
        # Step 1: SCOUT researches topics
        topics = scout_research(client)

        # Step 2: CIPHER critiques and scores
        scored = cipher_critique(client, topics)

        # Step 3: QUILL writes the winning post
        post = quill_write(client, scored)

        # Step 4: Generate cartoony image
        image_url = generate_image_url(post["imagePrompt"])
        image_alt = f"Cartoon illustration for: {post['title']}"

        # Step 5: Publish to GitHub
        today = datetime.now(UTC).strftime("%Y-%m-%d")
        url = publish_post(
            github_token=github_token,
            repo_name=repo_name,
            slug=post["slug"],
            title=post["title"],
            date=today,
            excerpt=post["excerpt"],
            image_url=image_url,
            image_alt=image_alt,
            body=post["body"],
        )

        logger.info("blog_cycle_complete", title=post["title"], url=url)

    except Exception as exc:
        logger.error("blog_cycle_failed", error=str(exc), exc_info=True)


def main() -> None:
    """Run the blog bot perpetually on a schedule."""
    interval_hours = int(os.environ.get("POST_INTERVAL_HOURS", "24"))

    logger.info("blog_bot_starting", interval_hours=interval_hours)

    # Run once immediately on startup
    run_blog_cycle()

    # Then run on schedule
    schedule.every(interval_hours).hours.do(run_blog_cycle)

    while True:
        schedule.run_pending()
        time.sleep(60)


if __name__ == "__main__":
    main()

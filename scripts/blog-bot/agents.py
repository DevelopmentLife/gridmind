"""Blog bot agents — SCOUT, CIPHER, QUILL."""

from __future__ import annotations

import json
import structlog
from anthropic import Anthropic

logger = structlog.get_logger()

SCOUT_SYSTEM = """You are SCOUT, a research agent for the GridMind blog. Your job is to identify 3 compelling, timely blog post topics about:
- The DBaaS (database-as-a-service) market: trends, funding, acquisitions, pricing shifts, new product launches
- The rising cost of AI infrastructure: GPU costs, inference pricing, API cost changes, efficiency breakthroughs

For each topic provide:
1. A punchy headline (under 70 chars)
2. 2-3 sentences of supporting facts/context
3. Why it matters to engineers and CTOs right now

Use web search to find real, current news. Output as JSON array of 3 objects with keys: headline, context, relevance."""

CIPHER_SYSTEM = """You are CIPHER, a devil's advocate editorial critic. You receive 3 proposed blog topics and rate each one.

For each topic evaluate:
- Newsworthiness: Is this actually new or just rehashed?
- Audience fit: Will DBAs, CTOs, and engineers care?
- Depth potential: Can 2-3 paragraphs say something meaningful?
- Validity: Are the facts solid or speculative?

Score each topic 1-10 and explain your reasoning briefly. Output JSON array with original topic fields plus: score (int), critique (str)."""

QUILL_SYSTEM = """You are QUILL, the editor and writer for the GridMind blog. You receive scored topic proposals and write the winning post.

Rules:
- Pick the topic with the highest score
- Write exactly 3 paragraphs, each 4-6 sentences
- Tone: Sharp, intelligent, slightly opinionated. Not corporate. Not fluffy.
- Audience: Senior engineers, CTOs, technical founders
- No clickbait. No "In conclusion". No bullet lists — pure prose.
- End with a forward-looking implication, not a summary

Also generate:
- slug: URL-safe lowercase with hyphens (max 60 chars)
- excerpt: One sentence summary (max 160 chars)
- imagePrompt: A prompt for generating a CARTOONY, non-serious, chibi/cartoon-style illustration. Include: cartoon, chibi, colorful, pastel colors, cute, not serious. Subject should relate to the topic.

Output JSON with keys: title, slug, excerpt, imagePrompt, body (the 3-paragraph post as markdown)."""


def scout_research(client: Anthropic) -> list[dict]:
    """SCOUT: Find 3 current trending topics using web search."""
    logger.info("scout_researching")

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2000,
        tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": 5}],
        system=SCOUT_SYSTEM,
        messages=[{
            "role": "user",
            "content": (
                "Research and propose 3 timely blog topics for today. "
                "Focus on news from the last 7 days about DBaaS market movements "
                "and AI infrastructure costs."
            ),
        }],
    )

    # Extract the text content from the final message
    text = ""
    for block in response.content:
        if hasattr(block, "text"):
            text += block.text

    # Parse JSON from response
    start = text.find("[")
    end = text.rfind("]") + 1
    topics = json.loads(text[start:end])
    logger.info("scout_complete", topic_count=len(topics))
    return topics


def cipher_critique(client: Anthropic, topics: list[dict]) -> list[dict]:
    """CIPHER: Score and critique each topic."""
    logger.info("cipher_critiquing", topic_count=len(topics))

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        system=CIPHER_SYSTEM,
        messages=[{
            "role": "user",
            "content": f"Critique and score these 3 topics:\n\n{json.dumps(topics, indent=2)}",
        }],
    )

    text = response.content[0].text
    start = text.find("[")
    end = text.rfind("]") + 1
    scored = json.loads(text[start:end])
    best = max(scored, key=lambda t: t["score"])
    logger.info("cipher_complete", winner=best["headline"], score=best["score"])
    return scored


def quill_write(client: Anthropic, scored_topics: list[dict]) -> dict:
    """QUILL: Write the winning blog post."""
    logger.info("quill_writing")

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=3000,
        system=QUILL_SYSTEM,
        messages=[{
            "role": "user",
            "content": (
                "Here are the scored topics. Pick the highest scoring one and write the blog post:\n\n"
                f"{json.dumps(scored_topics, indent=2)}"
            ),
        }],
    )

    text = response.content[0].text
    start = text.find("{")
    end = text.rfind("}") + 1
    post = json.loads(text[start:end])
    logger.info("quill_complete", title=post["title"], slug=post["slug"])
    return post

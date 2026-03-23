"""GitHub publisher — commits blog post markdown to the repo."""

from __future__ import annotations

from datetime import UTC, datetime

import structlog
from github import Github, GithubException

logger = structlog.get_logger()


def publish_post(
    github_token: str,
    repo_name: str,
    slug: str,
    title: str,
    date: str,
    excerpt: str,
    image_url: str,
    image_alt: str,
    body: str,
) -> str:
    """Commit a blog post markdown file to the GitHub repo.

    Returns the URL of the created file.
    """
    g = Github(github_token)
    repo = g.get_repo(repo_name)

    content = f"""---
title: "{title}"
date: "{date}"
excerpt: "{excerpt}"
imageUrl: "{image_url}"
imageAlt: "{image_alt}"
---

{body}
"""

    file_path = f"gridmind-site/content/blog/{slug}.md"
    commit_message = f"content(blog): add post '{title}'"

    try:
        # Check if file already exists (avoid duplicate slugs)
        existing = repo.get_contents(file_path)
        logger.warning("post_already_exists", slug=slug, sha=existing.sha)
        return f"https://github.com/{repo_name}/blob/main/{file_path}"
    except GithubException:
        pass  # File doesn't exist, proceed

    repo.create_file(
        path=file_path,
        message=commit_message,
        content=content,
        branch="main",
    )

    logger.info("post_published", slug=slug, path=file_path)
    return f"https://github.com/{repo_name}/blob/main/{file_path}"

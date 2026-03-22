"""Chat routes — message, SSE streaming, conversation CRUD."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

import structlog
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from gateway.auth import TokenPayload, get_current_user
from gateway.errors import NotFoundError
from gateway.schemas.chat import (
    ChatMessage,
    ChatResponse,
    ChatResponseMessage,
    ConversationResponse,
    ConversationSummary,
)
from gateway.schemas.common import PaginatedResponse

logger = structlog.get_logger()

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])

# In-memory stores
_conversations: dict[str, dict] = {}
_messages: dict[str, list[dict]] = {}  # conversation_id -> [messages]


# ---------------------------------------------------------------------------
# POST /api/v1/chat — Chat message
# ---------------------------------------------------------------------------

@router.post("")
async def chat(
    body: ChatMessage,
    user: TokenPayload = Depends(get_current_user),
) -> ChatResponse | StreamingResponse:
    """Send a chat message. Returns SSE stream when stream=true."""
    now = datetime.now(UTC)

    # Get or create conversation
    conv_id = body.conversation_id or str(uuid4())
    if conv_id not in _conversations:
        _conversations[conv_id] = {
            "id": conv_id,
            "title": body.message[:50],
            "tenant_id": user.org_id,
            "user_id": user.sub,
            "created_at": now,
            "updated_at": now,
        }
        _messages[conv_id] = []

    # Store user message
    user_msg = {
        "id": str(uuid4()),
        "role": "user",
        "content": body.message,
        "timestamp": now,
        "metadata": body.context,
    }
    _messages[conv_id].append(user_msg)

    # Generate mock response
    assistant_content = (
        f"I've received your message about: '{body.message[:100]}'. "
        "As a mock response, I can confirm the GridMind agent fleet is operational. "
        "In production, this would be processed by the Claude AI model."
    )

    if body.stream:
        return _stream_response(conv_id, assistant_content, now)

    # Non-streaming response
    assistant_msg = {
        "id": str(uuid4()),
        "role": "assistant",
        "content": assistant_content,
        "timestamp": now,
        "metadata": {},
    }
    _messages[conv_id].append(assistant_msg)
    _conversations[conv_id]["updated_at"] = now
    _conversations[conv_id]["message_count"] = len(_messages[conv_id])

    return ChatResponse(
        conversation_id=conv_id,
        message=ChatResponseMessage(**assistant_msg),
    )


def _stream_response(conv_id: str, content: str, timestamp: datetime) -> StreamingResponse:
    """Create an SSE streaming response."""

    async def event_generator():  # type: ignore[no-untyped-def]
        msg_id = str(uuid4())
        # Stream content in chunks
        words = content.split(" ")
        accumulated = ""
        for i, word in enumerate(words):
            accumulated += ("" if i == 0 else " ") + word
            yield f"data: {{'id': '{msg_id}', 'delta': '{word}', 'done': false}}\n\n"

        # Store complete message
        assistant_msg = {
            "id": msg_id,
            "role": "assistant",
            "content": content,
            "timestamp": timestamp,
            "metadata": {},
        }
        _messages.setdefault(conv_id, []).append(assistant_msg)

        yield f"data: {{'id': '{msg_id}', 'delta': '', 'done': true}}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ---------------------------------------------------------------------------
# GET /api/v1/chat/conversations — List
# ---------------------------------------------------------------------------

@router.get("/conversations", response_model=PaginatedResponse)
async def list_conversations(
    cursor: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    user: TokenPayload = Depends(get_current_user),
) -> PaginatedResponse:
    """List chat conversations for the current user."""
    user_convs = [
        c for c in _conversations.values()
        if c.get("user_id") == user.sub
    ]
    items = [
        ConversationSummary(
            id=c["id"],
            title=c["title"],
            message_count=len(_messages.get(c["id"], [])),
            created_at=c["created_at"],
            updated_at=c["updated_at"],
        )
        for c in user_convs[:limit]
    ]
    return PaginatedResponse(
        items=items,
        total_count=len(user_convs),
        has_more=len(user_convs) > limit,
    )


# ---------------------------------------------------------------------------
# GET /api/v1/chat/conversations/{id} — Get
# ---------------------------------------------------------------------------

@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: str,
    user: TokenPayload = Depends(get_current_user),
) -> ConversationResponse:
    """Get a conversation with all messages."""
    conv = _conversations.get(conversation_id)
    if not conv or conv.get("user_id") != user.sub:
        raise NotFoundError("Conversation not found.")

    msgs = _messages.get(conversation_id, [])
    return ConversationResponse(
        id=conv["id"],
        title=conv["title"],
        messages=[ChatResponseMessage(**m) for m in msgs],
        created_at=conv["created_at"],
        updated_at=conv["updated_at"],
    )


# ---------------------------------------------------------------------------
# DELETE /api/v1/chat/conversations/{id} — Delete
# ---------------------------------------------------------------------------

@router.delete("/conversations/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: str,
    user: TokenPayload = Depends(get_current_user),
) -> None:
    """Delete a conversation."""
    conv = _conversations.get(conversation_id)
    if not conv or conv.get("user_id") != user.sub:
        raise NotFoundError("Conversation not found.")
    del _conversations[conversation_id]
    _messages.pop(conversation_id, None)
    logger.info("conversation_deleted", conversation_id=conversation_id)

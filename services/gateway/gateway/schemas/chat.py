"""Chat endpoint schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """Chat message request."""

    message: str = Field(min_length=1)
    conversation_id: str | None = None
    stream: bool = False
    context: dict[str, str] = Field(default_factory=dict)


class ChatResponseMessage(BaseModel):
    """A single message in a conversation."""

    id: str
    role: str = "assistant"
    content: str
    timestamp: datetime
    metadata: dict[str, str] = Field(default_factory=dict)


class ChatResponse(BaseModel):
    """Non-streaming chat response."""

    conversation_id: str
    message: ChatResponseMessage


class ConversationSummary(BaseModel):
    """Conversation list item."""

    id: str
    title: str
    message_count: int = 0
    created_at: datetime
    updated_at: datetime


class ConversationResponse(BaseModel):
    """Full conversation with messages."""

    id: str
    title: str
    messages: list[ChatResponseMessage] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

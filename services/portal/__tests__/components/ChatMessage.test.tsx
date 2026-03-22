import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ChatMessage } from "@/components/ChatMessage";
import type { ChatMessage as ChatMessageType } from "@/types";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, ...rest }: React.ComponentProps<"div">) => (
      <div className={className} {...rest}>{children}</div>
    ),
    span: ({ children, className, ...rest }: React.ComponentProps<"span">) => (
      <span className={className} {...rest}>{children}</span>
    ),
  },
}));

const USER_MESSAGE: ChatMessageType = {
  messageId: "msg-001",
  role: "user",
  content: "Why is my database slow?",
  streaming: false,
  timestamp: new Date().toISOString(),
};

const ASSISTANT_MESSAGE: ChatMessageType = {
  messageId: "msg-002",
  role: "assistant",
  content: "Based on the metrics I can see, your P95 latency has increased significantly.",
  streaming: false,
  timestamp: new Date().toISOString(),
};

const STREAMING_MESSAGE: ChatMessageType = {
  messageId: "msg-003",
  role: "assistant",
  content: "",
  streaming: true,
  timestamp: new Date().toISOString(),
};

describe("ChatMessage", () => {
  it("renders user message content", () => {
    render(<ChatMessage message={USER_MESSAGE} />);
    expect(screen.getByText("Why is my database slow?")).toBeInTheDocument();
  });

  it("renders assistant message content", () => {
    render(<ChatMessage message={ASSISTANT_MESSAGE} />);
    expect(screen.getByText(/Based on the metrics/)).toBeInTheDocument();
  });

  it("renders user avatar for user messages", () => {
    render(<ChatMessage message={USER_MESSAGE} />);
    const avatar = screen.getByText("U");
    expect(avatar).toBeInTheDocument();
  });

  it("renders GridMind avatar for assistant messages", () => {
    render(<ChatMessage message={ASSISTANT_MESSAGE} />);
    const avatar = screen.getByText("GM");
    expect(avatar).toBeInTheDocument();
  });

  it("user messages are right-aligned", () => {
    const { container } = render(<ChatMessage message={USER_MESSAGE} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("justify-end");
  });

  it("assistant messages are left-aligned", () => {
    const { container } = render(<ChatMessage message={ASSISTANT_MESSAGE} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("justify-start");
  });

  it("has accessible aria-label describing role and content", () => {
    render(<ChatMessage message={USER_MESSAGE} />);
    const el = screen.getByRole("listitem");
    expect(el.getAttribute("aria-label")).toContain("Your message");
  });

  it("renders typing indicator when streaming with empty content", () => {
    render(<ChatMessage message={STREAMING_MESSAGE} />);
    const typingIndicator = screen.getByLabelText("Assistant is typing");
    expect(typingIndicator).toBeInTheDocument();
  });

  it("renders content when streaming with partial content", () => {
    const streaming: ChatMessageType = {
      ...STREAMING_MESSAGE,
      content: "The primary cause is…",
    };
    render(<ChatMessage message={streaming} />);
    expect(screen.getByText("The primary cause is…")).toBeInTheDocument();
  });
});

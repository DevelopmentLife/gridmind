"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChatMessage } from "@/components/ChatMessage";
import { useChatStore } from "@/stores/chatStore";

const SUGGESTED_PROMPTS = [
  "Why is my analytics-warehouse P95 latency so high right now?",
  "Show me the top 5 slowest queries across all deployments",
  "Is it safe to run VACUUM ANALYZE on production during business hours?",
  "What's the projected cost impact of upgrading to db.r7g.4xlarge?",
  "Explain what ARGUS found in its last workload profile",
];

export default function ChatPage() {
  const { messages, isStreaming, sendMessage, startNewConversation, error, clearError } = useChatStore();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isStreaming]);

  async function handleSend() {
    const content = input.trim();
    if (!content || isStreaming) return;
    setInput("");
    await sendMessage(content);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border-default">
        <div>
          <h1 className="text-brand-text-primary text-lg font-bold">AI Chat</h1>
          <p className="text-brand-text-muted text-xs">
            Ask questions about your database deployments, agent activity, or performance
          </p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={startNewConversation}
            className="btn-secondary text-xs py-1.5"
            aria-label="Start new conversation"
          >
            New chat
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-4" role="log" aria-label="Chat conversation" aria-live="polite">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto">
            <div
              className="w-16 h-16 rounded-2xl bg-brand-electric/20 border border-brand-electric/30 flex items-center justify-center text-brand-electric text-2xl font-bold mb-6"
              aria-hidden="true"
            >
              GM
            </div>
            <h2 className="text-brand-text-primary text-xl font-bold mb-2">How can I help?</h2>
            <p className="text-brand-text-muted text-sm text-center mb-8 max-w-sm">
              Ask me anything about your database deployments, agent findings, performance metrics, or get recommendations.
            </p>
            <div className="grid grid-cols-1 gap-2 w-full max-w-lg">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    setInput(prompt);
                    inputRef.current?.focus();
                  }}
                  className="text-left px-4 py-3 bg-brand-navy border border-brand-border-default rounded-lg text-brand-text-secondary text-sm hover:text-brand-text-primary hover:border-brand-electric/40 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-electric/50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6" role="list">
            {messages.map((msg) => (
              <ChatMessage key={msg.messageId} message={msg} />
            ))}
            <div ref={messagesEndRef} aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mx-6 mb-2 px-3 py-2 bg-brand-red/10 border border-brand-red/30 rounded-md text-brand-red text-sm flex items-center justify-between"
          role="alert"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={clearError}
            className="text-brand-red hover:text-brand-red/80 text-xs ml-4 focus:outline-none"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* Input area */}
      <div className="px-6 pb-6 pt-2">
        <div className="max-w-3xl mx-auto">
          <div className="bg-brand-navy border border-brand-border-default rounded-xl p-3 focus-within:border-brand-electric/50 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your databases, agents, or performance…"
              rows={1}
              className="w-full bg-transparent text-brand-text-primary text-sm placeholder-brand-text-muted resize-none focus:outline-none max-h-32 overflow-y-auto"
              aria-label="Chat message input"
              aria-multiline="true"
              style={{ minHeight: "1.5rem" }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
              }}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-brand-text-muted text-2xs">
                Press <kbd className="px-1 bg-brand-slate rounded text-2xs">Enter</kbd> to send, <kbd className="px-1 bg-brand-slate rounded text-2xs">Shift+Enter</kbd> for new line
              </p>
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!input.trim() || isStreaming}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-electric hover:bg-brand-electric/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-electric/50"
                aria-label="Send message"
              >
                {isStreaming ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Thinking
                  </>
                ) : (
                  <>
                    Send
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

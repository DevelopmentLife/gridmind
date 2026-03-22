"use client";

import { motion } from "framer-motion";
import type { ChatMessage as ChatMessageType } from "@/types";
import { formatRelativeTime } from "@/lib/formatters";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} gap-3`}
      role="listitem"
      aria-label={`${isUser ? "Your message" : "Assistant message"}: ${message.content.slice(0, 50)}${message.content.length > 50 ? "…" : ""}`}
    >
      {/* Avatar — assistant only */}
      {!isUser && (
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-electric/20 border border-brand-electric/30 flex items-center justify-center text-brand-electric text-xs font-bold"
          aria-hidden="true"
        >
          GM
        </div>
      )}

      <div className={`max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        {/* Bubble */}
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? "bg-brand-electric text-white rounded-br-sm"
              : "bg-brand-navy border border-brand-border-default text-brand-text-primary rounded-bl-sm"
          }`}
        >
          {message.content ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            /* Streaming indicator */
            <div className="flex items-center gap-1.5 py-0.5" aria-label="Assistant is typing">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="block w-1.5 h-1.5 rounded-full bg-brand-text-muted"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                  aria-hidden="true"
                />
              ))}
            </div>
          )}

          {/* Streaming cursor */}
          {message.streaming && message.content && (
            <motion.span
              className="inline-block w-0.5 h-4 bg-brand-text-secondary ml-0.5 align-middle"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              aria-hidden="true"
            />
          )}
        </div>

        {/* Timestamp */}
        <span className="text-brand-text-muted text-2xs px-1">
          {formatRelativeTime(message.timestamp)}
        </span>
      </div>

      {/* Avatar — user only */}
      {isUser && (
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-slate flex items-center justify-center text-brand-text-secondary text-xs font-bold"
          aria-hidden="true"
        >
          U
        </div>
      )}
    </motion.div>
  );
}

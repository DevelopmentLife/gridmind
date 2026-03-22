import { create } from "zustand";
import type { ChatMessage, ChatConversation } from "@/types";
import { chat as chatApi } from "@/lib/api";

let _streamAbortController: AbortController | null = null;

interface ChatStore {
  conversations: ChatConversation[];
  activeConversationId: string | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;

  // Actions
  fetchHistory: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  cancelStream: () => void;
  startNewConversation: () => void;
  selectConversation: (id: string) => void;
  clearError: () => void;

  // Derived
  getActiveConversation: () => ChatConversation | undefined;
}

function generateId(): string {
  return `msg_${Math.random().toString(36).slice(2, 11)}_${Date.now()}`;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  isStreaming: false,
  streamingContent: "",
  error: null,

  fetchHistory: async () => {
    try {
      const convos = await chatApi.history();
      set({ conversations: convos });
      if (convos.length > 0 && !get().activeConversationId) {
        const latest = convos[0];
        if (latest) {
          set({ activeConversationId: latest.conversationId, messages: latest.messages });
        }
      }
    } catch {
      // Non-blocking
    }
  },

  sendMessage: async (content) => {
    if (get().isStreaming) return;

    const userMessage: ChatMessage = {
      messageId: generateId(),
      role: "user",
      content,
      streaming: false,
      timestamp: new Date().toISOString(),
    };

    const assistantMessageId = generateId();
    const assistantMessage: ChatMessage = {
      messageId: assistantMessageId,
      role: "assistant",
      content: "",
      streaming: true,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, userMessage, assistantMessage],
      isStreaming: true,
      streamingContent: "",
      error: null,
    }));

    _streamAbortController = new AbortController();

    try {
      await chatApi.stream(
        content,
        get().activeConversationId,
        (token) => {
          set((state) => ({
            streamingContent: state.streamingContent + token,
            messages: state.messages.map((m) =>
              m.messageId === assistantMessageId
                ? { ...m, content: state.streamingContent + token }
                : m,
            ),
          }));
        },
        (conversationId) => {
          set((state) => ({
            activeConversationId: conversationId,
            isStreaming: false,
            streamingContent: "",
            messages: state.messages.map((m) =>
              m.messageId === assistantMessageId ? { ...m, streaming: false } : m,
            ),
          }));
        },
        (err) => {
          set((state) => ({
            isStreaming: false,
            error: err,
            messages: state.messages.map((m) =>
              m.messageId === assistantMessageId
                ? { ...m, streaming: false, content: "An error occurred. Please try again." }
                : m,
            ),
          }));
        },
        _streamAbortController.signal,
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        set((state) => ({
          isStreaming: false,
          messages: state.messages.map((m) =>
            m.messageId === assistantMessageId ? { ...m, streaming: false } : m,
          ),
        }));
      } else {
        set((state) => ({
          isStreaming: false,
          error: "Stream connection failed",
          messages: state.messages.map((m) =>
            m.messageId === assistantMessageId
              ? { ...m, streaming: false, content: "Connection failed. Please try again." }
              : m,
          ),
        }));
      }
    }
  },

  cancelStream: () => {
    _streamAbortController?.abort();
    _streamAbortController = null;
    set({ isStreaming: false, streamingContent: "" });
  },

  startNewConversation: () => {
    set({ activeConversationId: null, messages: [], streamingContent: "", error: null });
  },

  selectConversation: (id) => {
    const convo = get().conversations.find((c) => c.conversationId === id);
    if (convo) {
      set({ activeConversationId: id, messages: convo.messages });
    }
  },

  clearError: () => set({ error: null }),

  getActiveConversation: () => {
    const { conversations, activeConversationId } = get();
    return conversations.find((c) => c.conversationId === activeConversationId);
  },
}));

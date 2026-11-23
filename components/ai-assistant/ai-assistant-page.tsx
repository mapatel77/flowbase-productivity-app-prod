"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Send,
  Mic,
  MicOff,
  Loader2,
  Sparkles,
  MessageSquare,
  CalendarDays,
  SquareKanban,
  NotebookPen,
  WandSparkles,
  LayoutDashboard,
  X,
  Check,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageGroup,
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader,
} from "@/components/ui/message";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useVoiceConversation, type VoiceConversationState } from "./voice-agent-hook";

export type AiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isLoading?: boolean;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
  toolResults?: Array<{
    toolCallId: string;
    name: string;
    result: unknown;
  }>;
};

const SUGGESTIONS = [
  {
    icon: SquareKanban,
    title: "Create a task for tomorrow",
    description: "Add a new task to your Kanban board",
  },
  {
    icon: CalendarDays,
    title: "Add meeting reminder on calendar",
    description: "Schedule a reminder for a specific date and time",
  },
  {
    icon: NotebookPen,
    title: "Summarize my notes",
    description: "Get a quick summary of your recent notes",
  },
  {
    icon: SquareKanban,
    title: "Create a Kanban board",
    description: "Set up a new board for a project",
  },
  {
    icon: LayoutDashboard,
    title: "Plan my week",
    description: "Organize tasks and calendar for the week ahead",
  },
  {
    icon: WandSparkles,
    title: "Generate a habit tracker template",
    description: "Create a reusable template for tracking habits",
  },
] as const;

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function AvatarComponent({ role, name }: { role: "user" | "assistant"; name?: string }) {
  return (
    <Avatar className="size-8">
      <AvatarImage src={name ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}` : undefined} alt={name || role} />
      <AvatarFallback className={cn("flex items-center justify-center text-xs font-medium", role === "assistant" ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" : "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400")}>
        {role === "assistant" ? <Sparkles className="size-4" /> : <MessageSquare className="size-4" />}
      </AvatarFallback>
    </Avatar>
  );
}

function SuggestionCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      className="w-full justify-start gap-3 p-3 hover:bg-accent transition-colors text-left"
      onClick={onClick}
    >
      <Icon className="size-5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
    </Button>
  );
}

function MessageBubble({ message }: { message: AiMessage }) {
  const isUser = message.role === "user";

  return (
    <MessageGroup className={cn("w-full", isUser && "flex-row-reverse")}>
      {!isUser && (
        <MessageAvatar>
          <AvatarComponent role="assistant" />
        </MessageAvatar>
      )}
      <Message className={cn("max-w-[85%]", isUser && "data-[align=end]:flex-row-reverse")} align={isUser ? "end" : "start"}>
        <MessageContent>
          <div
            className={cn(
              "rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words",
              isUser
                ? "bg-primary text-primary-foreground rounded-tr-sm"
                : "bg-muted rounded-tl-sm",
            )}
          >
            {message.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span>Thinking…</span>
              </div>
            ) : (
              message.content
            )}
          </div>

          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {message.toolCalls.map((tc) => (
                <div
                  key={tc.id}
                  className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-1.5"
                >
                  <Loader2 className="size-3 animate-spin" />
                  <span>Running <code>{tc.name}</code>…</span>
                </div>
              ))}
            </div>
          )}

          {message.toolResults && message.toolResults.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {message.toolResults.map((tr) => (
                <div
                  key={tr.toolCallId}
                  className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-1.5"
                >
                  <Check className="size-3 shrink-0" />
                  <span>
                    <code>{tr.name}</code> completed
                  </span>
                </div>
              ))}
            </div>
          )}

          <MessageHeader className="pt-1">
            <span className="text-xs text-muted-foreground">{formatTimestamp(new Date())}</span>
          </MessageHeader>
        </MessageContent>
        {isUser && (
          <MessageAvatar>
            <AvatarComponent role="user" />
          </MessageAvatar>
        )}
      </Message>
    </MessageGroup>
  );
}

export function AiAssistantPage() {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [liveUserText, setLiveUserText] = useState("");
  const [liveAgentText, setLiveAgentText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    state: voiceState,
    error: voiceError,
    toggle: toggleVoice,
    isActive: isVoiceActive,
    isSpeaking: isVoiceSpeaking,
  } = useVoiceConversation({
    onUserTranscript: (text, isFinal) => {
      if (!isFinal) {
        // Partial transcripts are cumulative, so they replace the previous one.
        setLiveUserText(text);
        return;
      }
      const finalText = text.trim();
      setLiveUserText("");
      if (!finalText) return;
      // Voice prompts are pasted straight into the chat session.
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "user", content: finalText },
      ]);
      setHasStartedChat(true);
    },
    onAgentTranscript: (text, isFinal) => {
      if (isFinal) {
        const finalText = text.trim();
        setLiveAgentText("");
        if (!finalText) return;
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: finalText },
        ]);
        setHasStartedChat(true);
        return;
      }
      setLiveAgentText((prev) => (prev ? `${prev}${text}` : text));
    },
    onStateChange: (newState) => {
      console.log("Voice state:", newState);
      if (newState === "idle") {
        setLiveAgentText("");
        setLiveUserText("");
      }
    },
    onError: (err) => {
      console.error("Voice error:", err);
    },
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSubmitting) return;

    const userMessage: AiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setHasStartedChat(true);
    setIsSubmitting(true);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const response = await fetch("/api/ai-assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...messages.map((m) => ({
              role: m.role,
              content: m.content,
              toolCalls: m.toolCalls,
            })),
            { role: "user", content: trimmed },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const data = await response.json();

      if (data.ok && data.data) {
        const assistantMessage: AiMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.data.message.content,
          toolCalls: data.data.message.toolCalls,
          toolResults: data.data.toolResults,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || "AI Assistant error");
      }
    } catch (error) {
      console.error("AI chat error:", error);
      const errorMessage: AiMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuggestionClick = (text: string) => {
    setInput(text);
    // Focus textarea
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  const voiceStatusLabel: Record<VoiceConversationState, string | null> = {
    idle: null,
    connecting: "Connecting…",
    listening: "Listening…",
    thinking: "Thinking…",
    speaking: "Speaking…",
    error: null,
  };
  const voiceStatusText = voiceStatusLabel[voiceState];

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
          AI Assistant
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your central command center for Flowbase. Chat, plan, and take action.
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 pr-2">
          <div className="flex flex-col gap-4 pb-4">
            {!hasStartedChat && messages.length === 0 && !liveUserText && !liveAgentText ? (
              // Empty State
              <div className="flex flex-col items-center justify-center h-full py-12 px-4">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-violet-100 dark:bg-violet-900/30 ring-1 ring-border mb-6">
                  <Sparkles className="size-8 text-violet-500 dark:text-violet-400" strokeWidth={1.5} />
                </div>

                <div className="text-center mb-8 max-w-md">
                  <h2 className="font-heading text-xl font-semibold mb-2">How can I help you today?</h2>
                  <p className="text-sm text-muted-foreground">
                    Ask me to create tasks, schedule meetings, summarize notes, build templates, or plan your week.
                  </p>
                </div>

                <div className="w-full max-w-md space-y-3">
                  {SUGGESTIONS.map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.title}
                      icon={suggestion.icon}
                      title={suggestion.title}
                      description={suggestion.description}
                      onClick={() => handleSuggestionClick(suggestion.title)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              // Chat Messages
              <>
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                {(isSubmitting || voiceState === "thinking") && (
                  <MessageBubble
                    message={{
                      id: "loading",
                      role: "assistant",
                      content: "",
                      isLoading: true,
                    }}
                  />
                )}
                {liveUserText && (
                  <MessageBubble
                    message={{
                      id: "live-user",
                      role: "user",
                      content: liveUserText,
                    }}
                  />
                )}
                {liveAgentText && (
                  <MessageBubble
                    message={{
                      id: "live-agent",
                      role: "assistant",
                      content: liveAgentText,
                    }}
                  />
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </ScrollArea>

        {/* Voice Error Toast */}
        {voiceError && (
          <div className="mb-3 flex items-center gap-2 px-4 py-2 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive animate-slide-in">
            <AlertCircle className="size-4 shrink-0" />
            <span>{voiceError}</span>
            <Button variant="ghost" size="icon" className="ml-auto h-6 w-6" onClick={() => {}}>
              <X className="size-3" />
            </Button>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="p-4 space-y-3">
            {/* Voice status indicator */}
            {voiceStatusText && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span
                  className={cn(
                    "size-2 rounded-full",
                    voiceState === "listening" && "bg-red-500 animate-pulse",
                    voiceState === "connecting" && "bg-yellow-500 animate-pulse",
                    voiceState === "thinking" && "bg-blue-500 animate-pulse",
                    voiceState === "speaking" && "bg-violet-500 animate-pulse",
                  )}
                />
                <span>{voiceStatusText}</span>
                {isVoiceSpeaking && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded">
                    Speak to interrupt
                  </span>
                )}
                {voiceState === "listening" && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded">Click Stop to end</span>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={hasStartedChat ? "Message AI Assistant…" : "Ask me anything or try a suggestion above…"}
                disabled={isSubmitting || isVoiceActive}
                rows={1}
                className="flex-1 min-h-[44px] max-h-[200px] resize-none field-sizing-content"
                aria-label="Chat input"
              />
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant={isVoiceActive ? "destructive" : "outline"}
                  onClick={toggleVoice}
                  disabled={isSubmitting}
                  aria-label={isVoiceActive ? "Stop voice conversation" : "Start voice conversation"}
                  className={cn(
                    "h-10 shrink-0 gap-2 px-3",
                    isVoiceActive && "bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/15",
                  )}
                >
                  {isVoiceActive ? (
                    <MicOff className="size-4" />
                  ) : (
                    <Mic className="size-4" />
                  )}
                  <span className="text-sm font-medium">{isVoiceActive ? "Stop" : "Talk"}</span>
                </Button>
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isSubmitting || isVoiceActive}
                  aria-label="Send message"
                  className="h-10 w-10 shrink-0"
                >
                  <Send className="size-5" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
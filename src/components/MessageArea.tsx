"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { ArrowLeft, Send, ChevronDown, Users } from "lucide-react";
import { useRouter } from "next/navigation";

interface MessageAreaProps {
  conversationId: Id<"conversations">;
  showBackButton?: boolean;
}

export function MessageArea({
  conversationId,
  showBackButton,
}: MessageAreaProps) {
  const { user } = useUser();
  const router = useRouter();
  const [messageText, setMessageText] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAtBottomRef = useRef(true);

  // Helper to get the scroll viewport element
  const getViewport = () =>
    scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement | null;

  const conversation = useQuery(api.conversations.getConversation, {
    conversationId,
  });
  const messages = useQuery(api.messages.getMessages, { conversationId });
  const typingUsers = useQuery(
    api.typing.getTypingUsers,
    user ? { conversationId, currentUserId: user.id } : "skip"
  );

  const sendMessage = useMutation(api.messages.sendMessage);
  const setTyping = useMutation(api.typing.setTyping);
  const markAsRead = useMutation(api.readReceipts.markAsRead);

  // Get participant info
  const otherParticipantIds =
    conversation?.participantIds.filter((id) => id !== user?.id) ?? [];
  const participantUsers = useQuery(
    api.users.getUsersByClerkIds,
    otherParticipantIds.length > 0
      ? { clerkIds: otherParticipantIds }
      : "skip"
  );
  const onlineUsers = useQuery(api.presence.getPresenceForUsers, {
    userIds: otherParticipantIds,
  });

  // All users in conversation (for message bubble display)
  const allParticipantUsers = useQuery(
    api.users.getUsersByClerkIds,
    conversation?.participantIds
      ? { clerkIds: conversation.participantIds }
      : "skip"
  );

  // Get reactions for all messages
  const messageIds = messages?.map((m) => m._id) ?? [];
  const reactions = useQuery(
    api.reactions.getReactionsForMessages,
    messageIds.length > 0 ? { messageIds } : "skip"
  );

  // Mark as read when conversation opens
  useEffect(() => {
    if (!user || !conversationId) return;
    markAsRead({ conversationId, userId: user.id });
  }, [conversationId, user, markAsRead]);

  // Auto scroll to bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  // Track scroll position
  const handleScroll = useCallback(() => {
    const viewport = getViewport();
    if (!viewport) return;

    const { scrollTop, scrollHeight, clientHeight } = viewport;
    const distFromBottom = scrollHeight - scrollTop - clientHeight;
    isAtBottomRef.current = distFromBottom < 100;
    setShowScrollButton(distFromBottom > 200);
  }, []);

  // Scroll to bottom when new messages arrive (only if near bottom)
  useEffect(() => {
    if (!messages) return;
    if (isAtBottomRef.current) {
      setTimeout(() => scrollToBottom("smooth"), 50);
    }
  }, [messages?.length, scrollToBottom]);

  // Initial scroll
  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => scrollToBottom("instant"), 100);
    }
  }, [conversationId, scrollToBottom]);

  // Attach scroll listener
  useEffect(() => {
    const viewport = getViewport();
    if (!viewport) return;
    viewport.addEventListener("scroll", handleScroll);
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const handleSend = async () => {
    if (!messageText.trim() || !user || isSending) return;
    const content = messageText.trim();
    setMessageText("");
    setSendError(null);
    setIsSending(true);

    // Clear typing
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setTyping({
      conversationId,
      userId: user.id,
      userName: user.fullName ?? user.username ?? "User",
      isTyping: false,
    });

    try {
      await sendMessage({ conversationId, senderId: user.id, content });
      isAtBottomRef.current = true;
      setTimeout(() => scrollToBottom("smooth"), 50);
    } catch {
      setSendError("Failed to send message. Tap to retry.");
      setMessageText(content); // Restore
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTyping = () => {
    if (!user) return;
    setTyping({
      conversationId,
      userId: user.id,
      userName: user.fullName ?? user.username ?? "User",
      isTyping: true,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTyping({
        conversationId,
        userId: user.id,
        userName: user.fullName ?? user.username ?? "User",
        isTyping: false,
      });
    }, 2000);
  };

  const getConversationName = () => {
    if (conversation?.type === "group") {
      return conversation.groupName ?? "Group Chat";
    }
    return participantUsers?.[0]?.name ?? "Loading...";
  };

  const isOtherUserOnline = () => {
    if (conversation?.type === "group") return false;
    return onlineUsers?.some((p) => p.isOnline) ?? false;
  };

  if (!conversation) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-800">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-800">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700 bg-slate-850 backdrop-blur">
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/chat")}
            className="text-slate-400 hover:text-white hover:bg-slate-700 -ml-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        <div className="relative">
          {conversation.type === "group" ? (
            <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
          ) : (
            <Avatar className="h-10 w-10">
              <AvatarImage src={participantUsers?.[0]?.imageUrl} />
              <AvatarFallback className="bg-indigo-700 text-white">
                {getConversationName().charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          {isOtherUserOnline() && (
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-slate-800" />
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-white">
            {getConversationName()}
          </h2>
          <p className="text-xs text-slate-400">
            {conversation.type === "group"
              ? `${conversation.participantIds.length} members`
              : isOtherUserOnline()
              ? "Online"
              : "Offline"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="relative flex-1 overflow-hidden">
        <div ref={scrollAreaRef} className="h-full">
          <ScrollArea className="h-full">
          <div className="px-4 py-4 space-y-1">
            {messages === undefined ? (
              // Loading skeleton
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`h-10 rounded-2xl animate-pulse bg-slate-700 ${
                        i % 2 === 0 ? "w-40" : "w-56"
                      }`}
                    />
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                <div className="h-16 w-16 rounded-full bg-slate-700 flex items-center justify-center mb-3">
                  <Send className="h-7 w-7 opacity-50" />
                </div>
                <p className="text-sm font-medium">No messages yet</p>
                <p className="text-xs mt-1">
                  Say hello to {getConversationName()}!
                </p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const prevMsg = index > 0 ? messages[index - 1] : null;
                const showAvatar =
                  !prevMsg || prevMsg.senderId !== msg.senderId;
                const msgReactions = reactions?.filter(
                  (r) => r.messageId === msg._id
                ) ?? [];
                const sender = allParticipantUsers?.find(
                  (u) => u.clerkId === msg.senderId
                );

                return (
                  <MessageBubble
                    key={msg._id}
                    message={msg}
                    isOwn={msg.senderId === user?.id}
                    showAvatar={showAvatar}
                    senderName={sender?.name ?? "Unknown"}
                    senderImage={sender?.imageUrl}
                    reactions={msgReactions}
                    currentUserId={user?.id ?? ""}
                    isGroupChat={conversation.type === "group"}
                  />
                );
              })
            )}

            {/* Typing indicator */}
            {typingUsers && typingUsers.length > 0 && (
              <TypingIndicator users={typingUsers} />
            )}

            <div ref={bottomRef} className="h-1" />
          </div>
        </ScrollArea>
        </div>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            onClick={() => {
              isAtBottomRef.current = true;
              scrollToBottom("smooth");
            }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded-full shadow-lg transition-colors animate-bounce"
          >
            <ChevronDown className="h-3.5 w-3.5" />
            New messages
          </button>
        )}
      </div>

      {/* Error banner */}
      {sendError && (
        <div
          className="mx-4 mb-2 px-3 py-2 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-xs cursor-pointer"
          onClick={() => {
            setSendError(null);
            handleSend();
          }}
        >
          {sendError}
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-slate-700">
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            placeholder="Type a message..."
            value={messageText}
            onChange={(e) => {
              setMessageText(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus-visible:ring-indigo-500"
            disabled={isSending}
          />
          <Button
            onClick={handleSend}
            disabled={!messageText.trim() || isSending}
            size="icon"
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

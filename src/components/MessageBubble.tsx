"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatMessageTime } from "@/lib/formatTime";
import { Trash2, Smile } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢"];

interface Reaction {
  _id: Id<"reactions">;
  messageId: Id<"messages">;
  userId: string;
  emoji: string;
  createdAt: number;
}

interface Message {
  _id: Id<"messages">;
  conversationId: Id<"conversations">;
  senderId: string;
  content: string;
  isDeleted: boolean;
  createdAt: number;
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  senderName: string;
  senderImage?: string;
  reactions: Reaction[];
  currentUserId: string;
  isGroupChat: boolean;
}

export function MessageBubble({
  message,
  isOwn,
  showAvatar,
  senderName,
  senderImage,
  reactions,
  currentUserId,
  isGroupChat,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const deleteMessage = useMutation(api.messages.deleteMessage);
  const toggleReaction = useMutation(api.reactions.toggleReaction);

  // Group reactions by emoji
  const reactionGroups = REACTION_EMOJIS.map((emoji) => {
    const matching = reactions.filter((r) => r.emoji === emoji);
    return {
      emoji,
      count: matching.length,
      hasReacted: matching.some((r) => r.userId === currentUserId),
    };
  }).filter((g) => g.count > 0);

  const handleDelete = async () => {
    await deleteMessage({ messageId: message._id, userId: currentUserId });
    setShowActions(false);
  };

  const handleReaction = async (emoji: string) => {
    await toggleReaction({
      messageId: message._id,
      userId: currentUserId,
      emoji,
    });
    setShowEmojiPicker(false);
    setShowActions(false);
  };

  return (
    <div
      className={`flex items-end gap-2 group ${isOwn ? "flex-row-reverse" : "flex-row"}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmojiPicker(false);
      }}
    >
      {/* Avatar (for other user) */}
      {!isOwn && (
        <div className="w-8 shrink-0">
          {showAvatar ? (
            <Avatar className="h-8 w-8">
              <AvatarImage src={senderImage} />
              <AvatarFallback className="bg-indigo-700 text-white text-xs">
                {senderName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-8 w-8" />
          )}
        </div>
      )}

      <div className={`flex flex-col max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
        {/* Sender name (group chat only) */}
        {isGroupChat && !isOwn && showAvatar && (
          <span className="text-xs text-slate-400 mb-1 ml-1">{senderName}</span>
        )}

        {/* Message bubble + actions */}
        <div className={`flex items-end gap-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
          {/* Action buttons */}
          {showActions && !message.isDeleted && (
            <div className={`flex items-center gap-0.5 mb-1 ${isOwn ? "mr-1" : "ml-1"}`}>
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                title="React"
              >
                <Smile className="h-3.5 w-3.5" />
              </button>
              {isOwn && (
                <button
                  onClick={handleDelete}
                  className="p-1 rounded-full text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Bubble */}
          <div
            className={`relative px-3 py-2 rounded-2xl text-sm leading-relaxed ${
              isOwn
                ? "bg-indigo-600 text-white rounded-br-sm"
                : "bg-slate-700 text-slate-100 rounded-bl-sm"
            } ${message.isDeleted ? "opacity-60" : ""}`}
          >
            {message.isDeleted ? (
              <span className="italic text-slate-300 text-xs">
                This message was deleted
              </span>
            ) : (
              message.content
            )}
          </div>
        </div>

        {/* Emoji picker */}
        {showEmojiPicker && (
          <div
            className={`flex gap-1 mt-1 bg-slate-800 border border-slate-700 rounded-full px-2 py-1 shadow-lg z-10 ${
              isOwn ? "mr-1" : "ml-1"
            }`}
          >
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="text-lg hover:scale-125 transition-transform focus:outline-none"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Reactions */}
        {reactionGroups.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? "mr-1" : "ml-1"}`}>
            {reactionGroups.map(({ emoji, count, hasReacted }) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full border transition-colors ${
                  hasReacted
                    ? "bg-indigo-600/30 border-indigo-500 text-indigo-300"
                    : "bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                }`}
              >
                <span>{emoji}</span>
                <span>{count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-[10px] text-slate-500 mt-0.5 px-1">
          {formatMessageTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
}

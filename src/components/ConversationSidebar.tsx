"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { formatConversationTime } from "@/lib/formatTime";
import { Search, MessageSquarePlus, Users } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { GroupChatModal } from "./GroupChatModal";
import { Id } from "../../../convex/_generated/dataModel";

interface ConversationSidebarProps {
  activeConversationId?: string;
}

export function ConversationSidebar({
  activeConversationId: _ignored,
}: ConversationSidebarProps = {}) {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  // Auto-detect active conversation from URL
  const activeConversationId = pathname.startsWith("/chat/")
    ? pathname.split("/chat/")[1]
    : undefined;
  const [search, setSearch] = useState("");
  const [showUsers, setShowUsers] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);

  const conversations = useQuery(
    api.conversations.getConversationsForUser,
    user ? { userId: user.id } : "skip"
  );

  const allUsers = useQuery(
    api.users.getAllUsers,
    user ? { currentUserId: user.id, search: search } : "skip"
  );

  const onlineUserIds =
    useQuery(api.presence.getAllOnlineUsers, {}) ?? [];

  const conversationIds = conversations?.map((c) => c._id) ?? [];
  const unreadCounts = useQuery(
    api.readReceipts.getUnreadCountsForUser,
    user && conversationIds.length > 0
      ? { userId: user.id, conversationIds }
      : "skip"
  );

  const allConvUsers = useQuery(
    api.users.getUsersByClerkIds,
    conversations
      ? {
          clerkIds: [
            ...new Set(
              conversations.flatMap((c) => c.participantIds)
            ),
          ],
        }
      : "skip"
  );

  const getOrCreateConversation = useMutation(
    api.conversations.getOrCreateDirectConversation
  );

  const handleUserClick = async (otherUserId: string) => {
    if (!user) return;
    const convId = await getOrCreateConversation({
      currentUserId: user.id,
      otherUserId,
    });
    router.push(`/chat/${convId}`);
    setShowUsers(false);
    setSearch("");
  };

  const getConversationDisplay = (conversation: {
    _id: Id<"conversations">;
    type: "direct" | "group";
    participantIds: string[];
    groupName?: string;
    lastMessageTime?: number;
    lastMessagePreview?: string;
    createdAt: number;
  }) => {
    if (conversation.type === "group") {
      return {
        name: conversation.groupName ?? "Group Chat",
        imageUrl: undefined,
        isOnline: false,
        subtitle: `${conversation.participantIds.length} members`,
      };
    }

    const otherUserId = conversation.participantIds.find(
      (id) => id !== user?.id
    );
    const otherUser = allConvUsers?.find((u) => u.clerkId === otherUserId);
    const isOnline = onlineUserIds.includes(otherUserId ?? "");

    return {
      name: otherUser?.name ?? "Loading...",
      imageUrl: otherUser?.imageUrl,
      isOnline,
      subtitle: conversation.lastMessagePreview ?? "No messages yet",
    };
  };

  const filteredConversations = conversations?.filter((c) => {
    if (!search || showUsers) return true;
    const display = getConversationDisplay(c);
    return display.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex h-full flex-col bg-slate-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <h1 className="text-xl font-bold">Tars Chat</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-white hover:bg-slate-700"
            onClick={() => setShowGroupModal(true)}
            title="Create group chat"
          >
            <Users className="h-5 w-5" />
          </Button>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search users or conversations..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowUsers(e.target.value.length > 0);
            }}
            className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus-visible:ring-indigo-500"
          />
        </div>
      </div>

      {/* User search results */}
      {showUsers && (
        <div className="px-3 pb-2">
          <p className="text-xs text-slate-400 mb-1 px-1">Users</p>
          {allUsers?.length === 0 ? (
            <div className="text-center py-4 text-slate-500 text-sm">
              No users found
            </div>
          ) : (
            allUsers?.map((u) => (
              <button
                key={u._id}
                onClick={() => handleUserClick(u.clerkId)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-700 transition-colors"
              >
                <div className="relative">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={u.imageUrl} />
                    <AvatarFallback className="bg-indigo-600 text-white text-sm">
                      {u.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {onlineUserIds.includes(u.clerkId) && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-slate-900" />
                  )}
                </div>
                <span className="text-sm font-medium">{u.name}</span>
              </button>
            ))
          )}
          <Separator className="mt-2 bg-slate-700" />
          <p className="text-xs text-slate-400 mb-1 px-1 mt-2">Conversations</p>
        </div>
      )}

      {/* Conversations list */}
      <ScrollArea className="flex-1">
        {!conversations ? (
          // Skeleton loading
          <div className="px-3 py-2 space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg px-3 py-2"
              >
                <div className="h-10 w-10 rounded-full bg-slate-700 animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-24 bg-slate-700 rounded animate-pulse" />
                  <div className="h-3 w-36 bg-slate-700 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-500">
            <MessageSquarePlus className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm">
              {search ? "No conversations found" : "No conversations yet"}
            </p>
            <p className="text-xs mt-1">Search for a user to start chatting</p>
          </div>
        ) : (
          <div className="px-3 py-2 space-y-0.5">
            {filteredConversations?.map((conv) => {
              const display = getConversationDisplay(conv);
              const unread = unreadCounts?.[conv._id] ?? 0;
              const isActive = conv._id === activeConversationId;
              const time = conv.lastMessageTime ?? conv.createdAt;

              return (
                <button
                  key={conv._id}
                  onClick={() => router.push(`/chat/${conv._id}`)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                    isActive
                      ? "bg-indigo-600"
                      : "hover:bg-slate-700/70"
                  }`}
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={display.imageUrl} />
                      <AvatarFallback
                        className={`text-white text-sm ${
                          isActive ? "bg-indigo-400" : "bg-indigo-700"
                        }`}
                      >
                        {display.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {display.isOnline && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-slate-900" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-medium truncate ${
                          unread > 0 ? "text-white" : "text-slate-200"
                        }`}
                      >
                        {display.name}
                      </span>
                      <span className="text-xs text-slate-400 ml-2 shrink-0">
                        {formatConversationTime(time)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-slate-400 truncate">
                        {display.subtitle}
                      </span>
                      {unread > 0 && (
                        <Badge className="ml-2 shrink-0 h-5 min-w-5 px-1.5 text-xs bg-indigo-500 hover:bg-indigo-500">
                          {unread > 99 ? "99+" : unread}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Group Chat Modal */}
      {showGroupModal && (
        <GroupChatModal
          currentUserId={user?.id ?? ""}
          onClose={() => setShowGroupModal(false)}
          onCreated={(id) => {
            router.push(`/chat/${id}`);
            setShowGroupModal(false);
          }}
        />
      )}
    </div>
  );
}

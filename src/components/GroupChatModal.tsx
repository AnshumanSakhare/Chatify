"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X, Check } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

interface GroupChatModalProps {
  currentUserId: string;
  onClose: () => void;
  onCreated: (id: Id<"conversations">) => void;
}

export function GroupChatModal({
  currentUserId,
  onClose,
  onCreated,
}: GroupChatModalProps) {
  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const allUsers = useQuery(api.users.getAllUsers, {
    currentUserId,
    search,
  });

  const createGroup = useMutation(api.conversations.createGroupConversation);

  const toggleUser = (clerkId: string) => {
    setSelectedIds((prev) =>
      prev.includes(clerkId)
        ? prev.filter((id) => id !== clerkId)
        : [...prev, clerkId]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedIds.length === 0) return;
    setIsLoading(true);
    try {
      const id = await createGroup({
        currentUserId,
        memberIds: selectedIds,
        groupName: groupName.trim(),
      });
      onCreated(id);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Create Group Chat</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Group name..."
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
          />

          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
          />

          {/* Selected users */}
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedIds.map((id) => {
                const user = allUsers?.find((u) => u.clerkId === id);
                return (
                  <span
                    key={id}
                    className="flex items-center gap-1 bg-indigo-600 text-white text-xs px-2 py-1 rounded-full"
                  >
                    {user?.name ?? id}
                    <button onClick={() => toggleUser(id)}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* User list */}
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {allUsers?.length === 0 ? (
              <p className="text-center text-slate-500 text-sm py-4">
                No users found
              </p>
            ) : (
              allUsers?.map((u) => {
                const isSelected = selectedIds.includes(u.clerkId);
                return (
                  <button
                    key={u._id}
                    onClick={() => toggleUser(u.clerkId)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                      isSelected
                        ? "bg-indigo-600"
                        : "hover:bg-slate-800"
                    }`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={u.imageUrl} />
                      <AvatarFallback className="bg-indigo-700 text-white text-xs">
                        {u.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm flex-1 text-left">{u.name}</span>
                    {isSelected && <Check className="h-4 w-4 text-white" />}
                  </button>
                );
              })
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!groupName.trim() || selectedIds.length === 0 || isLoading}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isLoading ? "Creating..." : "Create Group"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

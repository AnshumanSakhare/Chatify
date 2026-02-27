"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";
import { usePresence } from "@/hooks/usePresence";

export function UserSync() {
  const { user, isLoaded } = useUser();
  const upsertUser = useMutation(api.users.upsertUser);

  usePresence(user?.id);

  useEffect(() => {
    if (!isLoaded || !user) return;
    upsertUser({
      clerkId: user.id,
      name: user.fullName ?? user.username ?? "Unknown",
      email: user.primaryEmailAddress?.emailAddress ?? "",
      imageUrl: user.imageUrl,
    });
  }, [isLoaded, user, upsertUser]);

  return null;
}

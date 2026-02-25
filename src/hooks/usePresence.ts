"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const HEARTBEAT_INTERVAL = 20000; // 20 seconds

export function usePresence(userId: string | null | undefined) {
  const updatePresence = useMutation(api.presence.updatePresence);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Mark as online immediately
    updatePresence({ userId, isOnline: true });

    // Set up heartbeat
    intervalRef.current = setInterval(() => {
      updatePresence({ userId, isOnline: true });
    }, HEARTBEAT_INTERVAL);

    // Mark as offline when leaving
    const handleBeforeUnload = () => {
      updatePresence({ userId, isOnline: false });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresence({ userId, isOnline: false });
      } else {
        updatePresence({ userId, isOnline: true });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      updatePresence({ userId, isOnline: false });
    };
  }, [userId, updatePresence]);
}

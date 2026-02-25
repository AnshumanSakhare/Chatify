"use client";

import { use } from "react";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { MessageArea } from "@/components/MessageArea";
import { Id } from "../../../../convex/_generated/dataModel";

interface ConversationPageProps {
  params: Promise<{ conversationId: string }>;
}

export default function ConversationPage({ params }: ConversationPageProps) {
  const { conversationId } = use(params);

  return (
    <>
      {/* Mobile layout: show message area full-screen (no sidebar) */}
      <div className="flex flex-col h-full md:hidden">
        <MessageArea
          conversationId={conversationId as Id<"conversations">}
          showBackButton
        />
      </div>

      {/* Desktop layout: sidebar + message area side by side */}
      {/* The sidebar is already in layout.tsx for md+, but we override here to pass activeConversationId */}
      <div className="hidden md:flex w-full h-full">
        {/* We need to render the sidebar with active ID - but it's in layout, so we just render MessageArea */}
        <MessageArea
          conversationId={conversationId as Id<"conversations">}
        />
      </div>
    </>
  );
}

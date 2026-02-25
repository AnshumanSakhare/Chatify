import { ConversationSidebar } from "@/components/ConversationSidebar";
import { MessageSquare } from "lucide-react";

export default function ChatPage() {
  return (
    <>
      {/* Mobile: show sidebar */}
      <div className="flex flex-col h-full md:hidden">
        <ConversationSidebar />
      </div>

      {/* Desktop: show empty state */}
      <div className="hidden md:flex flex-col flex-1 items-center justify-center bg-slate-800 text-slate-400">
        <div className="flex flex-col items-center gap-4 max-w-xs text-center">
          <div className="h-20 w-20 rounded-full bg-slate-700 flex items-center justify-center">
            <MessageSquare className="h-10 w-10 text-indigo-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">
            Welcome to Tars Chat
          </h2>
          <p className="text-sm text-slate-400">
            Select a conversation from the sidebar, or search for a user to
            start a new chat.
          </p>
        </div>
      </div>
    </>
  );
}

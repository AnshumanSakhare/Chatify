import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserSync } from "@/components/UserSync";
import { ConversationSidebar } from "@/components/ConversationSidebar";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      <UserSync />

      {/* Sidebar - hidden on mobile, visible on md+ */}
      <div className="hidden md:flex md:w-64 lg:w-72 xl:w-80 shrink-0 border-r border-slate-700">
        <ConversationSidebar />
      </div>

      {/* Main content area — fills all remaining space */}
      <div className="flex flex-1 flex-col min-w-0 min-h-0 h-full overflow-hidden">
        {children}
      </div>
    </div>
  );
}

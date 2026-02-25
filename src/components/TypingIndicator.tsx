"use client";

interface TypingUser {
  userId: string;
  userName: string;
}

interface TypingIndicatorProps {
  users: TypingUser[];
}

export function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  const text =
    users.length === 1
      ? `${users[0].userName} is typing`
      : users.length === 2
      ? `${users[0].userName} and ${users[1].userName} are typing`
      : "Several people are typing";

  return (
    <div className="flex items-end gap-2">
      <div className="bg-slate-700 rounded-2xl rounded-bl-sm px-3 py-2 flex items-center gap-2">
        <span className="text-xs text-slate-400">{text}</span>
        <div className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

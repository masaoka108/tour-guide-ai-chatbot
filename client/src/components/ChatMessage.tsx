import { cn } from '@/lib/utils';
import type { Message } from '../lib/types';

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn(
      "flex mb-4",
      isUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[80%] p-4 rounded-lg shadow-sm",
        isUser ? "bg-primary text-white" : "bg-white border border-gray-100"
      )}>
        <div className="text-sm whitespace-pre-wrap">
          {message.content}
        </div>
        {message.responseTime && !isUser && (
          <div className="text-xs text-gray-500 mt-2">
            Response time: {message.responseTime}ms
          </div>
        )}
      </div>
    </div>
  );
}

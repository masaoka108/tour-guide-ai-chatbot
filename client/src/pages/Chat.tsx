import { useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import Footer from '../components/Footer';
import { socketClient } from '../lib/socket';
import type { Message } from '../lib/types';

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Add welcome message when component mounts
    const welcomeMessage: Message = {
      id: crypto.randomUUID(),
      content: "Welcome to AI Tourism Guide! I'm here to help you discover amazing places, plan your trips, and provide travel recommendations. How can I assist you today?",
      role: 'assistant',
      timestamp: Date.now()
    };
    setMessages([welcomeMessage]);

    const unsubscribe = socketClient.onMessage((message) => {
      setMessages(prev => [...prev, message]);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSendMessage = (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      content,
      role: 'user',
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    socketClient.sendMessage(content);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="flex-1 m-4 flex flex-col max-w-4xl mx-auto w-full bg-white rounded-lg shadow-lg border border-blue-100">
        <div className="p-4 border-b bg-white/50 backdrop-blur-sm rounded-t-lg">
          <h1 className="text-2xl font-bold text-center text-primary">AI Tourism Guide</h1>
          <p className="text-center text-gray-600 text-sm">Your personal travel advisor powered by AI</p>
        </div>
        <ScrollArea className="flex-1 p-4">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {isLoading && (
            <div className="flex justify-center p-4">
              <div className="animate-pulse text-gray-500">Generating response...</div>
            </div>
          )}
        </ScrollArea>
        <div className="p-4 border-t bg-white/50 backdrop-blur-sm rounded-b-lg">
          <ChatInput onSend={handleSendMessage} disabled={isLoading} />
        </div>
      </div>
      <Footer />
    </div>
  );
}

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input);
      setInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask about destinations, travel tips, or recommendations..."
        disabled={disabled}
        className="flex-1"
      />
      <Button 
        type="submit" 
        disabled={disabled || !input.trim()}
        className="w-12 h-12 p-0 bg-primary hover:bg-primary/90 text-white"
      >
        <Send className="h-5 w-5" />
      </Button>
    </form>
  );
}

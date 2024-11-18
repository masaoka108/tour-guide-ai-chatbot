export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
  responseTime?: number;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
}

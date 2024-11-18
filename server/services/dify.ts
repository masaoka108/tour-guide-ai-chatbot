import fetch from 'node-fetch';
import type { WebSocket } from 'ws';

const DIFY_API_KEY = process.env.DIFY_API_KEY;
const DIFY_API_URL = 'https://api.dify.ai/v1';

const TOURISM_SYSTEM_PROMPT = `You are an AI Tourism Guide, an expert in travel recommendations, destinations, and trip planning. Your role is to:
1. Provide detailed, personalized travel recommendations
2. Share cultural insights and local customs
3. Suggest itineraries and activities
4. Offer practical travel tips and advice
5. Help with travel planning and logistics

Always maintain a friendly, professional tone and provide specific, actionable advice.`;

export interface DifyError {
  status: number;
  code: string;
  message: string;
}

export async function handleMessage(message: string, ws: WebSocket, conversationId?: string): Promise<void> {
  try {
    const response = await fetch(`${DIFY_API_URL}/chat-messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DIFY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: message,
        response_mode: 'streaming',
        conversation_id: conversationId,
        user: "tourist",
        inputs: {
          system_prompt: TOURISM_SYSTEM_PROMPT
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw {
        status: response.status,
        code: errorData.code || 'unknown_error',
        message: errorData.message || 'Unknown error occurred'
      };
    }

    if (!response.body) {
      throw new Error('No response body received');
    }

    // Handle streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(5));
              
              // Handle different event types
              switch (data.event) {
                case 'message':
                  ws.send(JSON.stringify({
                    id: data.message_id,
                    content: data.answer,
                    role: 'assistant',
                    timestamp: data.created_at * 1000,
                    conversation_id: data.conversation_id
                  }));
                  break;

                case 'message_end':
                  if (data.metadata?.usage) {
                    // Send final message with response time
                    ws.send(JSON.stringify({
                      id: data.id,
                      content: '',
                      role: 'system',
                      timestamp: Date.now(),
                      conversation_id: data.conversation_id,
                      responseTime: Math.round(data.metadata.usage.latency * 1000)
                    }));
                  }
                  break;

                case 'error':
                  throw {
                    status: data.status,
                    code: data.code,
                    message: data.message
                  };
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }
      }
    } catch (streamError) {
      console.error('Stream processing error:', streamError);
      ws.send(JSON.stringify({
        id: crypto.randomUUID(),
        content: 'An error occurred while processing your request. Please try again.',
        role: 'assistant',
        timestamp: Date.now()
      }));
    }
  } catch (error) {
    console.error('Dify API error:', error);
    const errorMessage = {
      id: crypto.randomUUID(),
      content: getErrorMessage(error),
      role: 'assistant',
      timestamp: Date.now()
    };
    ws.send(JSON.stringify(errorMessage));
  }
}

function getErrorMessage(error: any): string {
  if (error.status === 404) {
    return 'The conversation could not be found. Please start a new chat.';
  } else if (error.status === 400) {
    switch (error.code) {
      case 'invalid_param':
        return 'Invalid request parameters. Please try again with correct input.';
      case 'app_unavailable':
        return 'The service is currently unavailable. Please try again later.';
      case 'provider_not_initialize':
        return 'The service is not properly configured. Please contact support.';
      case 'provider_quota_exceeded':
        return 'Service quota has been exceeded. Please try again later.';
      case 'model_currently_not_support':
        return 'The requested model is currently unavailable. Please try again later.';
      case 'completion_request_error':
        return 'Failed to generate a response. Please try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
  return 'An unexpected error occurred. Please try again later.';
}

import fetch from 'node-fetch';
import type { WebSocket } from 'ws';
import crypto from 'crypto';

const DIFY_API_KEY = process.env.DIFY_API_KEY;
const DIFY_API_URL = 'https://api.dify.ai/v1';

const TOURISM_SYSTEM_PROMPT = `You are an AI Tourism Guide, an expert in travel recommendations, destinations, and trip planning. Your role is to:
1. Provide detailed, personalized travel recommendations
2. Share cultural insights and local customs
3. Suggest itineraries and activities
4. Offer practical travel tips and advice
5. Help with travel planning and logistics

Always maintain a friendly, professional tone and provide specific, actionable advice.`;

// Define interface for WebSocket with conversation tracking
export interface ExtendedWebSocket extends WebSocket {
  conversationId?: string;
}

export interface DifyError {
  status: number;
  code: string;
  message: string;
}

export async function handleMessage(message: string, ws: ExtendedWebSocket, conversationId?: string): Promise<void> {
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
        conversation_id: conversationId || '',
        user: 'tourist',
        inputs: {},
      }),
    });

    if (!response.ok) {
      const errorData = await response.json() as { code?: string; message?: string };
      throw {
        status: response.status,
        code: errorData.code || 'api_error',
        message: errorData.message || 'Failed to get response from Dify API'
      };
    }

    if (!response.body) {
      throw new Error('No response body received');
    }

    const reader = (response.body as any).getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() && line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
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
                if (data.conversation_id) {
                  ws.conversationId = data.conversation_id;
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
  } catch (error) {
    console.error('Dify API error:', error);
    ws.send(JSON.stringify({
      id: crypto.randomUUID(),
      content: getErrorMessage(error),
      role: 'assistant',
      timestamp: Date.now()
    }));
  }
}

function getErrorMessage(error: any): string {
  if (error.status === 404) {
    return 'チャット履歴が見つかりませんでした。新しいチャットを開始してください。';
  } else if (error.status === 400) {
    switch (error.code) {
      case 'invalid_param':
        return 'パラメータが無効です。入力を確認してください。';
      case 'app_unavailable':
        return 'サービスは現在利用できません。しばらくしてからもう一度お試しください。';
      case 'provider_not_initialize':
        return 'サービスが正しく設定されていません。サポートにお問い合わせください。';
      case 'provider_quota_exceeded':
        return 'サービスの制限に達しました。しばらくしてからもう一度お試しください。';
      case 'model_currently_not_support':
        return '要求されたモデルは現在利用できません。しばらくしてからもう一度お試しください。';
      case 'completion_request_error':
        return '応答の生成に失敗しました。もう一度お試しください。';
      default:
        return '予期せぬエラーが発生しました。もう一度お試しください。';
    }
  }
  return '予期せぬエラーが発生しました。しばらくしてからもう一度お試しください。';
}
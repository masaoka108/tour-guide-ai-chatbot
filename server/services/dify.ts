import fetch from 'node-fetch';

const DIFY_API_KEY = process.env.DIFY_API_KEY;
const DIFY_API_URL = 'https://api.dify.ai/v1';

const TOURISM_SYSTEM_PROMPT = `You are an AI Tourism Guide, an expert in travel recommendations, destinations, and trip planning. Your role is to:
1. Provide detailed, personalized travel recommendations
2. Share cultural insights and local customs
3. Suggest itineraries and activities
4. Offer practical travel tips and advice
5. Help with travel planning and logistics

Always maintain a friendly, professional tone and provide specific, actionable advice.`;

export async function handleMessage(message: string): Promise<string> {
  try {
    const response = await fetch(`${DIFY_API_URL}/chat-messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DIFY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: message,
        response_mode: 'blocking',
        conversation_id: null,
        user: "tourist",
        inputs: {
          system_prompt: TOURISM_SYSTEM_PROMPT
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Dify API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.answer;
  } catch (error) {
    console.error('Dify API error:', error);
    throw new Error('Sorry, I encountered an error while processing your request. Please try again.');
  }
}

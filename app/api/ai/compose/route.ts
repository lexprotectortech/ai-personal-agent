import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Missing User ID' }, { status: 401 });
    }

    const { sender, text, source, category, userInstruction } = await request.json();

    if (!sender || !text || !source) {
      return NextResponse.json({ error: 'Missing required context: sender, text, and source are required.' }, { status: 400 });
    }

    const prompt = `
    You are an AI Personal Assistant. Help the user compose a reply to the following notification:

    Context:
    - Sender: ${sender}
    - Platform: ${source} (Category: ${category || 'messages'})
    - Original message text: "${text}"

    User Instruction/Notes for Reply:
    "${userInstruction || 'Provide a friendly, helpful reply agreeing to their message.'}"

    Formatting Rules:
    - If the platform is 'gmail' or 'outlook', draft a complete professional email including a relevant Subject line (separated by a newline from the body), polite salutations, a helpful body addressing the query, and a professional sign-off.
    - If the platform is 'whatsapp' or 'telegram', draft a concise, conversational, and direct chat message. Do not include subject lines or formal email signatures.
    - Output only the composed message text itself. Do not write any explanations, quotes, or conversational introductions before the draft.
    `;

    let draftContent = '';
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;

    if (geminiApiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            maxOutputTokens: 600
          }
        });

        draftContent = response.text || '';
      } catch (err) {
        console.error('Error generating AI draft via Gemini SDK:', err);
      }
    }

    if (!draftContent && openRouterApiKey) {
      try {
        const openai = new OpenAI({
          baseURL: 'https://openrouter.ai/api/v1',
          apiKey: openRouterApiKey,
          defaultHeaders: {
            'HTTP-Referer': 'https://personal-agent.local',
            'X-Title': 'Personal AI Agent',
          }
        });

        const completion = await openai.chat.completions.create({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 600
        });

        draftContent = completion.choices[0]?.message?.content || '';
      } catch (err) {
        console.error('Error generating AI draft via OpenRouter:', err);
      }
    }

    // Static fallback draft if AI call failed
    if (!draftContent) {
      if (source === 'gmail' || source === 'outlook') {
        draftContent = `Subject: Re: Update from ${sender}\n\nHi ${sender.split(' ')[0]},\n\nThanks for reaching out. I received your message about: "${text.slice(0, 40)}...".\n\nI will review this and follow up shortly.\n\nBest regards,\nUser`;
      } else {
        draftContent = `Hey ${sender.split(' ')[0]}, thanks for the update! I got your message: "${text.slice(0, 30)}...". I will check this and get back to you soon.`;
      }
    }

    return NextResponse.json({ success: true, draft: draftContent.trim() });
  } catch (err: any) {
    console.error('AI compose endpoint error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

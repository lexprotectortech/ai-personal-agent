import { NextResponse } from 'next/server';
import { getInsForgeClient } from '../../../lib/insforge';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Missing User ID' }, { status: 401 });
    }

    const { alertId, forceRegenerate } = await request.json();

    if (!alertId) {
      return NextResponse.json({ error: 'Missing alertId parameter' }, { status: 400 });
    }

    const userJwt = request.headers.get('Authorization')?.replace('Bearer ', '');
    const client = getInsForgeClient(userJwt);

    // 1. Fetch triggered alert details
    const { data: alert, error: fetchError } = await client.database
      .from('triggered_alerts')
      .select('*')
      .eq('id', alertId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !alert) {
      console.error('[API Alerts Summary] Alert not found:', fetchError);
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    // If we have cache and are not forcing regeneration, return cached items
    if (!forceRegenerate && alert.ai_summary && alert.ai_next_action) {
      console.log(`[API Alerts Summary] Returning cached summary for alert: ${alertId}`);
      // Generate a draft reply on the fly if needed
      const draft = await generateDraftReply(alert.title, alert.raw_content, alert.source_app);
      return NextResponse.json({
        success: true,
        summary: alert.ai_summary,
        nextAction: alert.ai_next_action,
        draft
      });
    }

    // 2. Query AI to generate summary and next action
    console.log(`[API Alerts Summary] Querying AI for alert summary: ${alertId}`);

    const prompt = `
    You are an AI Personal Assistant. Please review this triggered alert event:
    - Title: "${alert.title}"
    - Description: "${alert.description}"
    - Platform: "${alert.source_app}"
    - Raw Event Content: "${alert.raw_content || 'No raw content'}"

    Please analyze the event context and provide:
    1. A detailed 2-3 sentence "summary" of what occurred, why it matters, and any key constraints mentioned (under 180 characters).
    2. A concrete "nextAction" recommendation for the user (e.g. "Draft an email to Alice accepting the contract terms" or "Reschedule design critique to Wednesday afternoon").

    Return ONLY a JSON object containing the summary and next action:
    {
      "summary": "...",
      "nextAction": "..."
    }
    `;

    let aiOutput = { summary: '', nextAction: '' };
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;

    if (geminiApiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            maxOutputTokens: 600
          }
        });

        let text = response.text || '';
        text = text.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
        aiOutput = JSON.parse(text);
      } catch (err) {
        console.error('[API Alerts Summary] Gemini failed:', err);
      }
    }

    if ((!aiOutput.summary || !aiOutput.nextAction) && openRouterApiKey) {
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
          response_format: { type: 'json_object' },
          max_tokens: 600
        });

        let text = completion.choices[0]?.message?.content || '';
        text = text.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
        aiOutput = JSON.parse(text);
      } catch (err) {
        console.error('[API Alerts Summary] OpenRouter failed:', err);
      }
    }

    // Fallbacks if AI fails
    if (!aiOutput.summary || !aiOutput.nextAction) {
      aiOutput = {
        summary: `Alert regarding "${alert.title}" was triggered from ${alert.source_app} due to condition matches in notification text.`,
        nextAction: `Review the matching content on ${alert.source_app} and respond to the sender.`
      };
    }

    // 3. Cache generated values back in DB
    const { error: updateError } = await client.database
      .from('triggered_alerts')
      .update({
        ai_summary: aiOutput.summary,
        ai_next_action: aiOutput.nextAction
      })
      .eq('id', alertId);

    if (updateError) {
      console.error('[API Alerts Summary] Error caching summary to DB:', updateError);
    }

    // 4. Generate draft reply
    const draft = await generateDraftReply(alert.title, alert.raw_content || '', alert.source_app);

    return NextResponse.json({
      success: true,
      summary: aiOutput.summary,
      nextAction: aiOutput.nextAction,
      draft
    });

  } catch (err: any) {
    console.error('API Alerts Summary route error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// Helper to generate a draft reply based on the alert
async function generateDraftReply(title: string, rawContent: string, platform: string): Promise<string> {
  const isEmail = platform === 'gmail' || platform === 'outlook';
  const prompt = `
  Context:
  - Alert Title: "${title}"
  - Source App: "${platform}"
  - Original Content: "${rawContent}"

  Please write a suitable, helpful reply draft to this alert.
  Rules:
  - If it is an email (gmail or outlook), write a professional response with a Subject line (separated by double-newlines) and clear sign-off.
  - If it is a chat message (whatsapp or telegram), write a direct, friendly, and conversational chat response. Do not include subject lines or signatures.
  - Output ONLY the draft reply text. Do not write introductory words or conversational formatting.
  `;

  const geminiApiKey = process.env.GEMINI_API_KEY;
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;

  if (geminiApiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { maxOutputTokens: 500 }
      });
      return (response.text || '').trim();
    } catch (err) {
      console.error('Draft generation failed in helper (Gemini):', err);
    }
  }

  if (openRouterApiKey) {
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
        max_tokens: 500
      });
      return (completion.choices[0]?.message?.content || '').trim();
    } catch (err) {
      console.error('Draft generation failed in helper (OpenRouter):', err);
    }
  }

  // Final fallback draft
  if (isEmail) {
    return `Subject: Re: Follow up on ${title}\n\nHi,\n\nI received your update about this. I will look into it and get back to you shortly.\n\nBest regards,\nUser`;
  } else {
    return `Hey! Got your message about this. I'll check it out and follow up shortly.`;
  }
}

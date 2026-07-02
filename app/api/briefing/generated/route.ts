import { NextResponse } from 'next/server';
import { getInsForgeClient } from '../../../lib/insforge';

export async function GET(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Missing User ID' }, { status: 401 });
    }

    const url = new URL(request.url);
    const briefingId = url.searchParams.get('id');

    const userJwt = request.headers.get('Authorization')?.replace('Bearer ', '');
    const client = getInsForgeClient(userJwt);

    if (briefingId) {
      // Fetch a specific generated briefing run
      const { data, error } = await client.database
        .from('generated_briefings')
        .select('*')
        .eq('id', briefingId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching generated briefing:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!data) {
        return NextResponse.json({ error: 'Briefing not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, briefing: data });
    } else {
      // Fetch all generated briefings for the user
      const { data, error } = await client.database
        .from('generated_briefings')
        .select('id, name, created_at, briefing_content->topHighlightedBrief as topBrief, briefing_content->categorySummaries as categories')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching briefings history:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, history: data });
    }
  } catch (err: any) {
    console.error('Generated briefing GET endpoint error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

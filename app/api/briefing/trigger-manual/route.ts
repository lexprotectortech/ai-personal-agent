import { NextResponse } from 'next/server';
import { tasks } from '@trigger.dev/sdk';
import { insforge } from '../../../lib/insforge';
import type { generateBriefing } from '../../../../trigger/tasks';

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Missing User ID' }, { status: 401 });
    }

    const body = await request.json();
    const { scheduleId } = body;

    if (!scheduleId) {
      return NextResponse.json({ error: 'Missing schedule ID' }, { status: 400 });
    }

    // Retrieve schedule details from DB
    const { data: schedule, error } = await insforge.database
      .from('briefing_schedules')
      .select('*')
      .eq('id', scheduleId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching schedule details:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Trigger the background task immediately using Trigger.dev (v4)
    const handle = await tasks.trigger<typeof generateBriefing>('generate-briefing', {
      scheduleId: schedule.id,
      userId: schedule.user_id,
      name: schedule.name,
      description: schedule.description || '',
      selectedApps: schedule.selected_apps || [],
      selectedCategories: schedule.selected_categories || [],
      priorityLevel: schedule.priority_level || 'Medium'
    });

    console.log(`[Manual Trigger] Triggered task run successfully:`, handle.id);

    return NextResponse.json({ 
      success: true, 
      message: 'Briefing generation task triggered in background.',
      runId: handle.id 
    });
  } catch (err: any) {
    console.error('Manual trigger endpoint error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

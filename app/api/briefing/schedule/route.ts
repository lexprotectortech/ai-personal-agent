import { NextResponse } from 'next/server';
import { getInsForgeClient } from '../../../lib/insforge';

// Helper to compute next run time based on scheduled time (HH:MM) and timezone
function calculateNextRun(scheduledTime: string, timeZone: string = 'UTC'): Date {
  const [hours, minutes] = scheduledTime.split(':').map(Number);
  const now = new Date();

  try {
    // Determine the offset in the target timezone
    const tzString = now.toLocaleString('en-US', { timeZone });
    const localDateInTZ = new Date(tzString);
    const tzOffset = now.getTime() - localDateInTZ.getTime();

    // Construct scheduled date for today
    const year = localDateInTZ.getFullYear();
    const month = String(localDateInTZ.getMonth() + 1).padStart(2, '0');
    const day = String(localDateInTZ.getDate()).padStart(2, '0');
    
    const isoString = `${year}-${month}-${day}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
    const localScheduledDate = new Date(isoString);
    
    // Convert to absolute UTC date
    let scheduledDate = new Date(localScheduledDate.getTime() + tzOffset);

    // If it has already passed today, set to tomorrow
    if (scheduledDate.getTime() <= now.getTime()) {
      scheduledDate = new Date(scheduledDate.getTime() + 24 * 60 * 60 * 1000);
    }
    return scheduledDate;
  } catch (e) {
    console.error('Failed to calculate timezone-aware scheduled date, falling back to UTC:', e);
    // Fallback simple UTC parsing
    const scheduledDate = new Date();
    scheduledDate.setUTCHours(hours, minutes, 0, 0);
    if (scheduledDate.getTime() <= now.getTime()) {
      scheduledDate.setUTCDate(scheduledDate.getUTCDate() + 1);
    }
    return scheduledDate;
  }
}

export async function GET(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Missing User ID' }, { status: 401 });
    }

    const userJwt = request.headers.get('Authorization')?.replace('Bearer ', '');
    const client = getInsForgeClient(userJwt);
    const { data, error } = await client.database
      .from('briefing_schedules')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching schedules:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, schedules: data });
  } catch (err: any) {
    console.error('Schedule GET endpoint error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Missing User ID' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, selectedApps, selectedCategories, scheduledTime, frequency, priorityLevel, timezone } = body;

    if (!name || !scheduledTime) {
      return NextResponse.json({ error: 'Missing required fields: name and scheduledTime' }, { status: 400 });
    }

    // Compute first next_run_at
    const nextRunAt = calculateNextRun(scheduledTime, timezone || 'UTC');

    const newSchedule = {
      user_id: userId,
      name,
      description,
      selected_apps: selectedApps || [],
      selected_categories: selectedCategories || [],
      scheduled_time: scheduledTime,
      frequency: frequency || 'daily',
      priority_level: priorityLevel || 'Medium',
      timezone: timezone || 'UTC',
      next_run_at: nextRunAt.toISOString()
    };

    const userJwt = request.headers.get('Authorization')?.replace('Bearer ', '');
    const client = getInsForgeClient(userJwt);
    const { data, error } = await client.database
      .from('briefing_schedules')
      .insert([newSchedule])
      .select();

    if (error) {
      console.error('Error creating schedule:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, schedule: data?.[0] });
  } catch (err: any) {
    console.error('Schedule POST endpoint error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Missing User ID' }, { status: 401 });
    }

    const url = new URL(request.url);
    const scheduleId = url.searchParams.get('id');

    if (!scheduleId) {
      return NextResponse.json({ error: 'Missing schedule ID parameter' }, { status: 400 });
    }

    const userJwt = request.headers.get('Authorization')?.replace('Bearer ', '');
    const client = getInsForgeClient(userJwt);
    const { error } = await client.database
      .from('briefing_schedules')
      .delete()
      .eq('id', scheduleId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting schedule:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Schedule deleted successfully' });
  } catch (err: any) {
    console.error('Schedule DELETE endpoint error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

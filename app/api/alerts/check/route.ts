import { NextResponse } from 'next/server';
import { evaluateAlertRules } from '../../../lib/alerts-engine';

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Missing User ID' }, { status: 401 });
    }

    console.log(`[API Alerts Check] Triggering manual alert check for user: ${userId}`);
    const newAlerts = await evaluateAlertRules(userId);
    console.log(`[API Alerts Check] Manual check complete. Found ${newAlerts.length} new alerts.`);

    return NextResponse.json({ success: true, triggeredCount: newAlerts.length, alerts: newAlerts });
  } catch (err: any) {
    console.error('API Alerts Check error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

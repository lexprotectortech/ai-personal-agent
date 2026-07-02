import SentDm from '@sentdm/sentdm';

/**
 * Sends a message via Sent.dm to a phone number.
 * Uses the configured API key and templates.
 */
export async function sendSentDmMessage({
  to,
  channel,
  templateId,
  parameters,
}: {
  to: string;
  channel: ('sms' | 'whatsapp')[];
  templateId: string;
  parameters: Record<string, string>;
}) {
  const apiKey = process.env.SENT_DM_API_KEY;
  if (!apiKey) {
    throw new Error('SENT_DM_API_KEY is not defined in environment variables.');
  }

  // Normalize phone number (must start with + followed by digits)
  let cleanPhone = to.trim();
  if (!cleanPhone.startsWith('+')) {
    // If it doesn't start with +, strip non-digits and prepend + (assuming it has country code)
    cleanPhone = '+' + cleanPhone.replace(/\D/g, '');
  } else {
    cleanPhone = '+' + cleanPhone.substring(1).replace(/\D/g, '');
  }

  // Validate number length roughly
  if (cleanPhone.length < 8) {
    throw new Error(`Invalid phone number: ${to}`);
  }

  console.log(`[Sent.dm Utility] Initializing Sent.dm client...`);
  const sentdm = new SentDm({ apiKey });

  console.log(`[Sent.dm Utility] Dispatching message to ${cleanPhone} via ${channel.join(', ')} using template ${templateId}`);

  try {
    const response = await sentdm.messages.send({
      to: [cleanPhone],
      template: {
        id: templateId,
        parameters,
      },
      channel,
    });

    console.log(`[Sent.dm Utility] Message dispatched successfully. Response:`, response);
    return response;
  } catch (error: any) {
    console.error(`[Sent.dm Utility] Failed to send message via Sent.dm:`, error);
    throw error;
  }
}

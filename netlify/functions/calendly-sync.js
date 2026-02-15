import { Resend } from 'resend';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body);
    
    // Calendly webhook payload structure
    // event: "invitee.created" or "invitee.canceled"
    // payload: { email, first_name, last_name, ... }
    const { event: calendlyEvent, payload } = body;

    if (calendlyEvent !== 'invitee.created') {
      console.log(`Ignoring event type: ${calendlyEvent}`);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Event ignored' }),
      };
    }

    const { email, first_name, last_name, name } = payload;

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing email in payload' }),
      };
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const audienceId = process.env.RESEND_AUDIENCE_ID;

    if (!resendApiKey || !audienceId) {
      console.error('Missing RESEND_API_KEY or RESEND_AUDIENCE_ID environment variables.');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Configuration error' }),
      };
    }

    const resend = new Resend(resendApiKey);

    // Determine names matching the pattern in submission-created.js
    let firstName = first_name || '';
    let lastName = last_name || '';

    if (!firstName && name) {
      const parts = name.trim().split(' ');
      firstName = parts[0];
      lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
    }

    console.log(`Syncing Calendly invitee to Resend: ${email}`);

    const { data, error } = await resend.contacts.create({
      email: email,
      firstName: firstName,
      lastName: lastName,
      unsubscribed: false,
      audienceId: audienceId,
    });

    if (error) {
      console.error('Error adding contact to Resend:', error);
      // Return 200 to Calendly to avoid retries if it's a "contact already exists" or similar non-critical error
      // But log it for debugging.
      return {
        statusCode: 200, 
        body: JSON.stringify({ message: 'Sync attempted', detail: error.message }),
      };
    }

    console.log('Successfully added contact to Resend:', data);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Contact synced successfully', data }),
    };
  } catch (err) {
    console.error('Unexpected error during Calendly-Resend sync:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

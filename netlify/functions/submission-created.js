import { Resend } from 'resend';

export const handler = async (event) => {
  const { payload } = JSON.parse(event.body);
  const { email, name, first_name, last_name } = payload.data;

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

  try {
    console.log(`Processing submission for: ${email}`);

    // Determine first and last name if only "name" is provided
    let firstName = first_name || '';
    let lastName = last_name || '';

    if (!firstName && name) {
      const parts = name.trim().split(' ');
      firstName = parts[0];
      lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
    }

    const { data, error } = await resend.contacts.create({
      email: email,
      firstName: firstName,
      lastName: lastName,
      unsubscribed: false,
      audienceId: audienceId,
    });

    if (error) {
      console.error('Error adding contact to Resend:', error);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: error.message }),
      };
    }

    console.log('Successfully added contact to Resend:', data);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Contact synced successfully' }),
    };
  } catch (err) {
    console.error('Unexpected error during Resend sync:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

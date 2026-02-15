/**
 * This script registers a Calendly webhook to sync invitees to Resend.
 * It requires a Calendly Personal Access Token.
 * 
 * Usage: CALENDLY_TOKEN=your_token node scripts/register-calendly-webhook.js
 */

const CALLBACK_URL = 'https://pinetreemagick.com/.netlify/functions/calendly-sync';

async function registerWebhook() {
  const token = process.env.CALENDLY_TOKEN;
  if (!token) {
    console.error('Error: Please provide a CALENDLY_TOKEN environment variable.');
    process.exit(1);
  }

  try {
    // 1. Get current user information to get the organization URI
    console.log('Fetching Calendly user information...');
    const userResponse = await fetch('https://api.calendly.com/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!userResponse.ok) {
      const err = await userResponse.json();
      throw new Error(`Failed to fetch user: ${JSON.stringify(err)}`);
    }

    const userData = await userResponse.json();
    const organizationUri = userData.resource.current_organization;
    const userUri = userData.resource.uri;

    console.log(`User URI: ${userUri}`);
    console.log(`Organization URI: ${organizationUri}`);

    // 2. Register the webhook
    console.log(`Registering webhook for ${CALLBACK_URL}...`);
    const webhookResponse = await fetch('https://api.calendly.com/webhook_subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: CALLBACK_URL,
        events: ['invitee.created'],
        organization: organizationUri,
        scope: 'organization'
      })
    });

    if (!webhookResponse.ok) {
      const err = await webhookResponse.json();
      // If organization fails, try with user scope
      if (err.message && err.message.includes('scope')) {
        console.log('Retrying with user scope...');
        const retryResponse = await fetch('https://api.calendly.com/webhook_subscriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: CALLBACK_URL,
            events: ['invitee.created'],
            user: userUri,
            scope: 'user'
          })
        });
        
        if (!retryResponse.ok) {
          const retryErr = await retryResponse.json();
          throw new Error(`Failed to register webhook: ${JSON.stringify(retryErr)}`);
        }
        
        const retryData = await retryResponse.json();
        console.log('Successfully registered webhook (user scope):', retryData.resource.uri);
        return;
      }
      throw new Error(`Failed to register webhook: ${JSON.stringify(err)}`);
    }

    const webhookData = await webhookResponse.json();
    console.log('Successfully registered webhook (organization scope):', webhookData.resource.uri);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

registerWebhook();

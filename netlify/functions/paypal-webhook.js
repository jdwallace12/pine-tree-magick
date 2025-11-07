/* Netlify Function: PayPal Webhook -> Email Google Drive link via Resend
 * Requirements (set as Netlify env vars):
 * - PAYPAL_ENV: 'sandbox' or 'live'
 * - PAYPAL_CLIENT_ID
 * - PAYPAL_SECRET
 * - PAYPAL_WEBHOOK_ID
 * - RESEND_API_KEY
 * - EMAIL_FROM (full email address; if you set a domain only, we'll default to no-reply@<domain>)
 * - EMAIL_BCC_INTERNAL (optional)
 */

const fetch = global.fetch;

function env(name, fallback = undefined) {
  const v = process.env[name];
  return v == null || v === '' ? fallback : v;
}

const PAYPAL_ENV = env('PAYPAL_ENV', 'live');
const PAYPAL_BASE = PAYPAL_ENV === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
const PAYPAL_CLIENT_ID = env('PAYPAL_CLIENT_ID');
const PAYPAL_SECRET = env('PAYPAL_SECRET');
const PAYPAL_WEBHOOK_ID = env('PAYPAL_WEBHOOK_ID');

const RESEND_API_KEY = env('RESEND_API_KEY');
let EMAIL_FROM = env('EMAIL_FROM');
const EMAIL_BCC_INTERNAL = env('EMAIL_BCC_INTERNAL');

// If EMAIL_FROM is provided as a domain, convert to a sensible default sender
if (EMAIL_FROM && !EMAIL_FROM.includes('@')) {
  EMAIL_FROM = `no-reply@${EMAIL_FROM}`;
}

// Boot log (no secrets)
console.log('paypal_webhook_boot', {
  paypal_env: PAYPAL_ENV,
  has_client_id: !!PAYPAL_CLIENT_ID,
  has_secret: !!PAYPAL_SECRET,
  has_webhook_id: !!PAYPAL_WEBHOOK_ID,
  has_resend_key: !!RESEND_API_KEY,
  has_email_from: !!EMAIL_FROM,
});

// Log all env vars (redacted) for local debugging
if (process.env.NETLIFY_DEV === 'true') {
  console.log('Environment variables (local):', Object.keys(process.env).filter(k => 
    k.includes('PAYPAL_') || k.includes('RESEND_') || k === 'EMAIL_FROM' || k === 'NODE_ENV'
  ).reduce((obj, key) => {
    const value = process.env[key];
    obj[key] = key.includes('SECRET') || key.includes('KEY') 
      ? `${value ? '***' + value.slice(-4) : 'not_set'}` 
      : value || 'not_set';
    return obj;
  }, {}));
}

// Map PayPal item names -> Google Drive links
const PRODUCT_LINKS_BY_ITEM_NAME = {
  'Highest Self Ritual': 'https://drive.google.com/file/d/1Qo8WyvgfgZPbN5qVtX-Op2BXLCq-mdWY/view?usp=sharing',
  'Love Spell': 'https://drive.google.com/file/d/1E4nBIAqDAGsV_QyHxP2JC7Ahu8f1F7-Z/view?usp=drive_link',
  'Ancestral Connection and Samhain Ritual': 'https://drive.google.com/file/d/1A4KDgpZzksUnGJa0US4HeHzPMfr9HqWJ/view?usp=drive_link',
};

async function getPayPalAccessToken() {
  const basic = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`paypal_oauth_failed:${res.status}`);
  const json = await res.json();
  console.log('paypal_oauth_ok');
  return json.access_token;
}

async function verifyPayPalSignature({ headers, body, accessToken }) {
  const payload = {
    auth_algo: headers['paypal-auth-algo'],
    cert_url: headers['paypal-cert-url'],
    transmission_id: headers['paypal-transmission-id'],
    transmission_sig: headers['paypal-transmission-sig'],
    transmission_time: headers['paypal-transmission-time'],
    webhook_id: PAYPAL_WEBHOOK_ID,
    webhook_event: JSON.parse(body),
  };
  const res = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`paypal_verify_failed:${res.status}`);
  const json = await res.json();
  const ok = json.verification_status === 'SUCCESS';
  console.log('paypal_verify_result', {
    transmission_id: payload.transmission_id,
    verification_status: json.verification_status,
  });
  return ok;
}

async function getOrderDetails(orderId, accessToken) {
  if (!orderId) return null;
  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return res.json();
}

function extractBuyerAndItem({ evt, order }) {
  const resource = evt.resource || {};
  let buyerEmail = null;
  let buyerName = null;
  let itemName = null;

  // Prefer order details for payer and items
  if (order) {
    buyerEmail = order?.payer?.email_address || buyerEmail;
    if (order?.payer?.name) {
      const given = order.payer.name.given_name || '';
      const sur = order.payer.name.surname || '';
      const composed = `${given} ${sur}`.trim();
      if (composed) buyerName = composed;
    }
    const pu = Array.isArray(order.purchase_units) ? order.purchase_units[0] : null;
    const firstItem = pu && Array.isArray(pu.items) ? pu.items[0] : null;
    if (firstItem && firstItem.name) itemName = firstItem.name;
  }

  // Fallback to capture resource payer if missing
  if (!buyerEmail) buyerEmail = resource?.payer?.email_address || null;

  return { buyerEmail, buyerName, itemName };
}

function chooseLink({ itemName }) {
  if (itemName && PRODUCT_LINKS_BY_ITEM_NAME[itemName]) return PRODUCT_LINKS_BY_ITEM_NAME[itemName];
  return null;
}

async function sendEmailViaResend({ to, subject, html }) {
  if (!RESEND_API_KEY || !EMAIL_FROM) throw new Error('email_env_missing');
  const payload = {
    from: EMAIL_FROM,
    to: [to],
    subject,
    html,
  };
  if (EMAIL_BCC_INTERNAL) payload.bcc = [EMAIL_BCC_INTERNAL];

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`resend_failed:${res.status}:${t}`);
  }
}

// Test endpoint to view env vars (local only)
const handleEnvRoute = (event) => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      Object.keys(process.env).reduce((obj, key) => {
        const value = process.env[key];
        obj[key] = key.includes('SECRET') || key.includes('KEY') 
          ? `${value ? '***' + value.slice(-4) : 'not_set'}` 
          : value || 'not_set';
        return obj;
      }, {}),
      null, 2
    )
  };
};

export const handler = async (event) => {
  try {
    // Handle test endpoint for local development
    if (process.env.NETLIFY_DEV === 'true' && event?.httpMethod === 'GET' && event?.path === '/.netlify/functions/paypal-webhook/env') {
      return handleEnvRoute(event);
    }

    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'method_not_allowed' };
    }

    if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET || !PAYPAL_WEBHOOK_ID) {
      console.warn('paypal_env_missing', {
        has_client_id: !!PAYPAL_CLIENT_ID,
        has_secret: !!PAYPAL_SECRET,
        has_webhook_id: !!PAYPAL_WEBHOOK_ID,
      });
      return { statusCode: 500, body: 'paypal_env_missing' };
    }

    const bodyStr = event.body || '';
    const headers = Object.fromEntries(Object.entries(event.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));

    // Entry log with selective headers
    console.log('paypal_webhook_entry', {
      length: bodyStr.length,
      transmission_id: headers['paypal-transmission-id'] || null,
      transmission_time: headers['paypal-transmission-time'] || null,
      auth_algo: headers['paypal-auth-algo'] || null,
      cert_url: headers['paypal-cert-url'] ? '[present]' : null,
      content_type: headers['content-type'] || null,
    });

    console.log('Verifying PayPal signature...');
    console.log('Request headers:', JSON.stringify(headers, null, 2));
    console.log('Request body length:', bodyStr.length);
    
    let accessToken;
    try {
      accessToken = await getPayPalAccessToken();
      console.log('Obtained PayPal access token');
    } catch (error) {
      console.error('Error getting PayPal access token:', error.message);
      return { statusCode: 500, body: 'Error authenticating with PayPal' };
    }

    try {
      const valid = await verifyPayPalSignature({ headers, body: bodyStr, accessToken });
      if (!valid) {
        console.warn('Invalid PayPal signature');
        return { statusCode: 401, body: 'invalid_signature' };
      }
      console.log('PayPal signature verified successfully');
    } catch (error) {
      console.error('Error verifying PayPal signature:', error.message);
      return { statusCode: 400, body: 'signature_verification_error' };
    }

    const evt = JSON.parse(bodyStr);
    const type = evt.event_type || evt.event?.event_type;
    console.log('paypal_event_type', { type });

    if (type !== 'PAYMENT.CAPTURE.COMPLETED') {
      // Ignore other event types
      console.log('paypal_event_ignored');
      return { statusCode: 200, body: 'ignored' };
    }

    const resource = evt.resource || {};
    const orderId = resource?.supplementary_data?.related_ids?.order_id || null;
    console.log('paypal_order_id', { orderId });

    const order = await getOrderDetails(orderId, accessToken);
    console.log('paypal_order_loaded', { has_order: !!order });
    const { buyerEmail, buyerName, itemName } = extractBuyerAndItem({ evt, order });
    console.log('paypal_buyer_and_item', {
      has_email: !!buyerEmail,
      buyer_name_present: !!buyerName,
      item_name: itemName || null,
    });

    if (!buyerEmail) {
      // Cannot deliver without email; acknowledge to avoid retries but log internally in Netlify logs
      console.warn('No buyer email found on event/order');
      return { statusCode: 200, body: 'no_buyer_email' };
    }

    const link = chooseLink({ itemName });
    if (!link) {
      console.warn('No link mapping for itemName:', itemName);
      return { statusCode: 200, body: 'no_link_mapping' };
    }

    const safeName = buyerName || 'there';
    const subject = 'Your download link';
    const html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, sans-serif; line-height:1.6;">
        <p>Hi ${safeName},</p>
        <p>Thank you for your purchase. Your PDF is ready here:</p>
        <p><a href="${link}" target="_blank" rel="noopener noreferrer">Open your PDF</a></p>
        <p>If you have any trouble accessing the file, reply to this email and we'll help.</p>
        <p>Warmly,<br/>Pine Tree Magick</p>
      </div>
    `;

    await sendEmailViaResend({ to: buyerEmail, subject, html });
    console.log('resend_email_sent', { to_present: !!buyerEmail, itemName });

    return { statusCode: 200, body: 'sent' };
  } catch (err) {
    console.error('paypal_webhook_error', { message: err?.message, stack: err?.stack });
    return { statusCode: 500, body: 'error' };
  }
};

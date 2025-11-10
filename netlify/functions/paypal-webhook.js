/**
 * Netlify Function: PayPal Webhook
 * 
 * Requires in netlify.toml:
 * [functions.paypal-webhook]
 *   body = "raw"
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "no-reply@pinetreemagick.com";
const EMAIL_BCC_INTERNAL = process.env.EMAIL_BCC_INTERNAL || "";
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID; // required for production verification
const SKIP_PAYPAL_VERIFY = process.env.SKIP_PAYPAL_VERIFY === "true";
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
const PAYPAL_ENV = process.env.PAYPAL_ENV || "sandbox"; // "live" for production

const PDF_LINKS = {
  "Highest Self Ritual": "https://drive.google.com/file/d/1Qo8WyvgfgZPbN5qVtX-Op2BXLCq-mdWY/view",
  "Love Spell": "https://drive.google.com/file/d/1E4nBIAqDAGsV_QyHxP2JC7Ahu8f1F7-Z/view",
  "Ancestral Connection and Samhain Ritual": "https://drive.google.com/file/d/1A4KDgpZzksUnGJa0US4HeHzPMfr9HqWJ/view",
};

// Send email via Resend
async function sendEmail({ to, buyerName, link }) {
  if (!RESEND_API_KEY) {
    console.error("❌ RESEND_API_KEY missing");
    return;
  }

  const safeName = buyerName || "there";

  const payload = {
    from: EMAIL_FROM,
    to: [to],
    subject: "Your Ritual Download ✨",
    html: `
      <div style="font-family:system-ui,Arial,sans-serif;line-height:1.6;padding:16px">
        <p>Hi ${safeName},</p>
        <p>Thank you for your purchase — your ritual download is ready:</p>
        <p><a href="${link}" target="_blank" style="font-size:18px;font-weight:bold;">Click here to access your PDF</a></p>
      </div>
    `,
    reply_to: EMAIL_FROM,
  };

  if (EMAIL_BCC_INTERNAL) payload.bcc = [EMAIL_BCC_INTERNAL];

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    if (!res.ok) console.error("❌ Email failed:", text);
    else console.log(`✅ Email sent to ${to}`);
  } catch (err) {
    console.error("❌ Resend request failed:", err);
  }
}

// Get PayPal Access Token
async function getPayPalAccessToken() {
  const base = PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`❌ Failed to get PayPal token: ${await res.text()}`);
  }

  const data = await res.json();
  return data.access_token;
}

// Verify PayPal Webhook Signature
async function verifyPayPalWebhook(event, headers, rawBody) {
  if (!PAYPAL_WEBHOOK_ID) {
    throw new Error("❌ PAYPAL_WEBHOOK_ID not set for verification");
  }

  const accessToken = await getPayPalAccessToken();
  const base = PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

  const res = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_algo: headers["paypal-auth-algo"],
      cert_url: headers["paypal-cert-url"],
      transmission_id: headers["paypal-transmission-id"],
      transmission_sig: headers["paypal-transmission-sig"],
      transmission_time: headers["paypal-transmission-time"],
      webhook_id: PAYPAL_WEBHOOK_ID,
      webhook_event: event,
    }),
  });

  if (!res.ok) throw new Error(`❌ PayPal verification failed: ${await res.text()}`);
  const data = await res.json();
  console.log("✅ PayPal verification status:", data.verification_status);
  return data.verification_status === "SUCCESS";
}

// Main Netlify Function Handler
export default async function handler(req) {
  try {
    const rawBody = await req.text();
    let event;
    try {
      event = JSON.parse(rawBody);
    } catch {
      console.error("❌ Invalid JSON payload");
      return new Response("Invalid JSON", { status: 400 });
    }

    console.log("📦 PayPal Webhook Received:", event.event_type);

    if (event.event_type !== "PAYMENT.CAPTURE.COMPLETED") {
      return new Response("Ignored non-payment event", { status: 200 });
    }

    let verified = SKIP_PAYPAL_VERIFY;

    if (!SKIP_PAYPAL_VERIFY) {
      try {
        verified = await verifyPayPalWebhook(event, req.headers, rawBody);
      } catch (err) {
        console.error("❌ Webhook verification failed", err);
        return new Response("Webhook verification failed", { status: 400 });
      }
    } else {
      console.log("⚠️ SKIP_PAYPAL_VERIFY enabled - skipping PayPal verification");
    }

    if (!verified) {
      return new Response("Invalid webhook", { status: 400 });
    }

    const payer = event.resource?.payer;
    const email = payer?.email_address;
    const buyerName = payer?.name?.given_name;
    const itemName = event.resource?.purchase_units?.[0]?.items?.[0]?.name;

    if (!email || !itemName) {
      console.error("❌ Missing email or item name", { email, itemName });
      return new Response("Missing data", { status: 400 });
    }

    const pdfLink = PDF_LINKS[itemName];
    if (!pdfLink) {
      console.error("❌ No PDF configured for item:", itemName);
      return new Response("No PDF configured", { status: 200 });
    }

    console.log(`✅ Sending PDF to ${email} for item "${itemName}"`);
    await sendEmail({ to: email, buyerName, link: pdfLink });

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("❌ Webhook error:", err);
    return new Response("Server error", { status: 500 });
  }
}

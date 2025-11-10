// netlify/functions/paypal-webhook.js
/**
 * IMPORTANT: in netlify.toml, include:
 *
 * [functions.paypal-webhook]
 *   body = "raw"
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "Pine Tree Magick <no-reply@pinetreemagick.com>";
const EMAIL_BCC_INTERNAL = process.env.EMAIL_BCC_INTERNAL || "";
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID; // Optional, needed for production verification
const SKIP_PAYPAL_VERIFY = process.env.SKIP_PAYPAL_VERIFY === "true";

// Map product names to PDF links
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

// Verify PayPal webhook (optional)
async function verifyPayPalWebhook(req, body) {
  if (SKIP_PAYPAL_VERIFY) {
    console.log("⚠️ SKIP_PAYPAL_VERIFY enabled - skipping PayPal verification");
    return true;
  }

  try {
    const transmissionId = req.headers.get("paypal-transmission-id");
    const transmissionTime = req.headers.get("paypal-transmission-time");
    const certUrl = req.headers.get("paypal-cert-url");
    const authAlgo = req.headers.get("paypal-auth-algo");
    const transmissionSig = req.headers.get("paypal-transmission-sig");

    if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
      console.error("❌ Missing required PayPal verification headers");
      return false;
    }

    const verifyPayload = {
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: PAYPAL_WEBHOOK_ID,
      webhook_event: body,
    };

    const tokenRes = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${process.env.PAYPAL_CLIENT}:${process.env.PAYPAL_SECRET}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) throw new Error("Could not get PayPal access token");

    const verifyRes = await fetch("https://api-m.paypal.com/v1/notifications/verify-webhook-signature", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(verifyPayload),
    });

    const verifyData = await verifyRes.json();
    if (verifyData.verification_status !== "SUCCESS") {
      console.error("❌ PayPal verification failed:", JSON.stringify(verifyData));
      return false;
    }

    return true;
  } catch (err) {
    console.error("❌ Webhook verification failed:", err);
    return false;
  }
}

// Main function
export default async function handler(req) {
  try {
    const rawBody = await req.text();
    console.log("📝 Raw request body:", rawBody);

    let event;
    try {
      event = JSON.parse(rawBody);
    } catch (err) {
      console.error("❌ Invalid JSON payload");
      return new Response("Invalid JSON", { status: 400 });
    }

    console.log("📦 PayPal Webhook Received:", event.event_type);

    if (event.event_type !== "PAYMENT.CAPTURE.COMPLETED") {
      console.log("ℹ️ Ignoring non-payment event");
      return new Response("Ignored non-payment event", { status: 200 });
    }

    const verified = await verifyPayPalWebhook(req, event);
    if (!verified) return new Response("Invalid webhook", { status: 400 });

    const payer = event.resource?.payer;
    const email = payer?.email_address;
    const buyerName = payer?.name?.given_name;
    const itemName = event.resource?.purchase_units?.[0]?.items?.[0]?.name;

    console.log("ℹ️ Payer info:", { email, buyerName, itemName });

    if (!email || !itemName) {
      console.error("❌ Missing email or item name");
      return new Response("Missing data", { status: 400 });
    }

    const pdfLink = PDF_LINKS[itemName];
    if (!pdfLink) {
      console.error("❌ No PDF configured for item:", itemName);
      return new Response("No PDF configured", { status: 200 });
    }

    await sendEmail({ to: email, buyerName, link: pdfLink });

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("❌ Webhook error:", err);
    return new Response("Server error", { status: 500 });
  }
}

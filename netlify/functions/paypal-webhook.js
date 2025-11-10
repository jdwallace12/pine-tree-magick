/**
 * IMPORTANT — in `netlify.toml`, include:
 *
 * [functions.paypal-webhook]
 *   body = "raw"
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "Pine Tree Magick <no-reply@pinetreemagick.com>";
const EMAIL_BCC_INTERNAL = process.env.EMAIL_BCC_INTERNAL || "";

// Send email via Resend
async function sendEmailViaResend({ to, buyerName, link }) {
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
        <p>Thank you so much for your purchase — your ritual download is ready:</p>
        <p><a href="${link}" target="_blank" style="font-size:18px;font-weight:bold;">Click here to access your PDF</a></p>
        <p>If you have trouble, reply to this email and I'll help right away.</p>
        <p>With love,<br>John 🌲</p>
      </div>
    `,
    reply_to: EMAIL_FROM
  };

  if (EMAIL_BCC_INTERNAL) payload.bcc = [EMAIL_BCC_INTERNAL];

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
}

// Map PayPal product → Google Drive PDF link
function getPdfLink(itemName) {
  const PDFs = {
    "Highest Self Ritual": "https://drive.google.com/file/d/1Qo8WyvgfgZPbN5qVtX-Op2BXLCq-mdWY/view",
    "Love Spell": "https://drive.google.com/file/d/1E4nBIAqDAGsV_QyHxP2JC7Ahu8f1F7-Z/view",
    "Ancestral Connection and Samhain Ritual": "https://drive.google.com/file/d/1A4KDgpZzksUnGJa0US4HeHzPMfr9HqWJ/view",
  };

  return PDFs[itemName] || null;
}

export default async (req) => {
  try {
    const raw = await req.text();
    const event = JSON.parse(raw);

    console.log("📦 PayPal Webhook Received:", event.event_type);

    if (event.event_type !== "PAYMENT.CAPTURE.COMPLETED") {
      return new Response("Ignored non-payment event", { status: 200 });
    }

    const payer = event.resource?.payer;
    const email = payer?.email_address;
    const buyerName = payer?.name?.given_name;
    const itemName =
      event.resource?.purchase_units?.[0]?.items?.[0]?.name;

    if (!email || !itemName) {
      console.error("❌ Missing email or item");
      return new Response("Missing data", { status: 400 });
    }

    const pdf = getPdfLink(itemName);
    if (!pdf) {
      console.error("❌ No PDF match for item:", itemName);
      return new Response("No PDF configured", { status: 200 });
    }

    await sendEmailViaResend({ to: email, buyerName, link: pdf });

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("❌ Webhook Error", err);
    return new Response("Server error", { status: 500 });
  }
};

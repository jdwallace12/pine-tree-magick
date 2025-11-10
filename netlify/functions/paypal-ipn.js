// netlify/functions/paypal-ipn.js
/**
 * IMPORTANT: in netlify.toml, include:
 *
 * [functions.paypal-ipn]
 *   body = "raw"
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_BCC_INTERNAL = process.env.EMAIL_BCC_INTERNAL || "";

// Ensure EMAIL_FROM is always valid for Resend
const EMAIL_FROM = process.env.EMAIL_FROM?.includes('<')
  ? process.env.EMAIL_FROM
  : `Pine Tree Magick <${process.env.EMAIL_FROM || 'no-reply@pinetreemagick.com'}>`;

// Map product names to PDF links
const PDF_LINKS = {
  "Highest Self Ritual": "https://drive.google.com/file/d/1Qo8WyvgfgZPbN5qVtX-Op2BXLCq-mdWY/view",
  "Love Spell": "https://drive.google.com/file/d/1E4nBIAqDAGsV_QyHxP2JC7Ahu8f1F7-Z/view",
  "Ancestral Connection and Samhain Ritual": "https://drive.google.com/file/d/1A4KDgpZzksUnGJa0US4HeHzPMfr9HqWJ/view",
  "Money Manifestation Ritual": "https://drive.google.com/file/d/1hs5bWRueAJAZmd5MFCMsdrRE7Tws0IFc/view",
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

// Main IPN handler
export default async function handler(req) {
  try {
    const rawBody = await req.text();
    console.log("📩 Raw IPN:", rawBody);

    // Append cmd=_notify-validate for PayPal IPN verification
    const verifyBody = "cmd=_notify-validate&" + rawBody;

    const verifyRes = await fetch(
      "https://ipnpb.paypal.com/cgi-bin/webscr",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: verifyBody,
      }
    );

    const verification = await verifyRes.text();
    console.log("🔍 PayPal IPN validation:", verification);

    if (verification !== "VERIFIED") {
      console.error("❌ Invalid IPN");
      return new Response("Invalid IPN", { status: 400 });
    }

    // Parse the IPN data
    const params = new URLSearchParams(rawBody);
    const email = params.get("payer_email");
    const buyerName = params.get("first_name");
    const itemName =
      params.get("item_name") || params.get("item_name1") || "Unknown Item";

    console.log("👤 Buyer:", email, buyerName);
    console.log("📦 Item:", itemName);

    const pdfLink = PDF_LINKS[itemName];
    if (!pdfLink) {
      console.error("❌ No PDF for item:", itemName);
      return new Response("No PDF configured", { status: 200 });
    }

    // Send the ritual email
    await sendEmail({ to: email, buyerName, link: pdfLink });

    console.log(`✅ Ritual delivered: ${itemName}`);

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("❌ IPN handler error:", err);
    return new Response("Server error", { status: 500 });
  }
}

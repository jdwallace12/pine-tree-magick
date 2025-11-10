/**
 * PayPal IPN handler for Netlify Functions
 * IMPORTANT in netlify.toml:
 *
 * [functions.paypal-ipn]
 *   body = "raw"
 */

import querystring from "querystring";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "Pine Tree Magick <no-reply@pinetreemagick.com>";
const EMAIL_BCC_INTERNAL = process.env.EMAIL_BCC_INTERNAL || "";

// Ritual PDF links
const PDF_LINKS = {
  "Highest Self Ritual": "https://drive.google.com/file/d/1Qo8WyvgfgZPbN5qVtX-Op2BXLCq-mdWY/view",
  "Love Spell": "https://drive.google.com/file/d/1E4nBIAqDAGsV_QyHxP2JC7Ahu8f1F7-Z/view",
  "Ancestral Connection and Samhain Ritual": "https://drive.google.com/file/d/1A4KDgpZzksUnGJa0US4HeHzPMfr9HqWJ/view",
};

// Send via Resend
async function sendEmail({ to, buyerName, link }) {
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
        <br>
        <p>🍄 Blessed magick on your journey,</p>
        <p>Pine Tree Magick</p>
      </div>
    `,
    reply_to: EMAIL_FROM,
    ...(EMAIL_BCC_INTERNAL ? { bcc: [EMAIL_BCC_INTERNAL] } : {}),
  };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const txt = await res.text();
  if (!res.ok) console.error("❌ Email failed:", txt);
  else console.log("✅ Email sent:", to);
}

export default async function handler(req) {
  try {
    const rawBody = await req.text();
    console.log("📩 Raw IPN:", rawBody);

    const params = querystring.parse(rawBody);

    // Verify with PayPal
    const verifyRes = await fetch("https://ipnpb.paypal.com/cgi-bin/webscr", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "cmd=_notify-validate&" + rawBody,
    });

    const verifyText = await verifyRes.text();
    console.log("🔍 PayPal IPN validation:", verifyText);

    if (verifyText !== "VERIFIED") {
      console.error("❌ Invalid IPN");
      return new Response("Invalid IPN", { status: 400 });
    }

    const payerEmail = params.payer_email;
    const buyerName = params.first_name;
    const itemName = params.item_name1 || params.item_name || params.item_name_1;

    console.log("👤 Buyer:", payerEmail);
    console.log("📦 Item:", itemName);

    if (!payerEmail || !itemName) {
      console.error("❌ Missing required fields");
      return new Response("Missing fields", { status: 400 });
    }

    const pdfLink = PDF_LINKS[itemName];
    if (!pdfLink) {
      console.error("❌ No PDF for:", itemName);
      return new Response("No PDF configured", { status: 200 }); // avoid retry loop
    }

    await sendEmail({ to: payerEmail, buyerName, link: pdfLink });

    console.log("✅ Ritual delivered:", itemName);
    return new Response("OK", { status: 200 });

  } catch (err) {
    console.error("🔥 IPN Error:", err);
    return new Response("Server error", { status: 500 });
  }
}

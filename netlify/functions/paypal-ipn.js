// netlify/functions/paypal-ipn.js
import querystring from "querystring";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "Pine Tree Magick <no-reply@pinetreemagick.com>";
const EMAIL_BCC_INTERNAL = process.env.EMAIL_BCC_INTERNAL || "";

// Map product name to PDF download link
const PDF_LINKS = {
  "Highest Self Ritual": "https://drive.google.com/file/d/1Qo8WyvgfgZPbN5qVtX-Op2BXLCq-mdWY/view",
  "Love Spell": "https://drive.google.com/file/d/1E4nBIAqDAGsV_QyHxP2JC7Ahu8f1F7-Z/view",
  "Ancestral Connection and Samhain Ritual": "https://drive.google.com/file/d/1A4KDgpZzksUnGJa0US4HeHzPMfr9HqWJ/view",
};

// Send email via Resend
async function sendEmail({ to, name, link }) {
  const payload = {
    from: EMAIL_FROM,
    to: [to],
    subject: "Your Ritual Download ✨",
    html: `
      <div style="font-family:system-ui,Arial,sans-serif;line-height:1.6;padding:16px">
        <p>Hi ${name || "there"},</p>
        <p>Thank you for your purchase — your ritual download is ready:</p>
        <p><a href="${link}" target="_blank" style="font-size:18px;font-weight:bold;">Click here to access your PDF</a></p>
      </div>
    `,
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

  if (!res.ok) {
    const text = await res.text();
    console.error("❌ Email failed:", text);
  } else {
    console.log(`✅ Email sent to ${to}`);
  }
}

export default async function handler(req) {
  const rawBody = await req.text();
  console.log("📩 Raw IPN:", rawBody);

  const ipn = querystring.parse(rawBody);

  // Step 1: verify with PayPal
  const verifyBody = "cmd=_notify-validate&" + rawBody;

  const verifyRes = await fetch("https://ipnpb.paypal.com/cgi-bin/webscr", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: verifyBody
  });

  const verifyText = await verifyRes.text();
  console.log("🔍 IPN Verified Response:", verifyText);

  if (verifyText !== "VERIFIED") {
    console.error("❌ IPN NOT VERIFIED");
    return new Response("Invalid", { status: 400 });
  }

  // Only process completed payments
  if (ipn.payment_status !== "Completed") {
    console.log("❌ Ignoring non-completed IPN:", ipn.payment_status);
    return new Response("Ignored", { status: 200 });
  }

  const email = ipn.payer_email;
  const itemName = ipn.item_name;
  const buyerName = ipn.first_name;

  console.log("👤 Buyer:", email, buyerName);
  console.log("📦 Item:", itemName);

  const pdf = PDF_LINKS[itemName];
  if (!pdf) {
    console.error("❌ No PDF for item:", itemName);
    return new Response("No PDF mapped", { status: 200 });
  }

  await sendEmail({ to: email, name: buyerName, link: pdf });

  return new Response("OK", { status: 200 });
}

/**
 * Netlify Function — PayPal IPN + Resend Email
 * IMPORTANT: In netlify.toml:
 *
 * [functions.paypal-ipn]
 *   body = "raw"
 */

import querystring from "querystring";
import fetch from "node-fetch";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "Pine Tree Magick <no-reply@pinetreemagick.com>";
const EMAIL_BCC_INTERNAL = process.env.EMAIL_BCC_INTERNAL || "";

// Map product names to PDF links
const PDF_LINKS = {
  "Highest Self Ritual": "https://drive.google.com/file/d/1Qo8WyvgfgZPbN5qVtX-Op2BXLCq-mdWY/view",
  "Love Spell": "https://drive.google.com/file/d/1E4nBIAqDAGsV_QyHxP2JC7Ahu8f1F7-Z/view",
  "Ancestral Connection and Samhain Ritual": "https://drive.google.com/file/d/1A4KDgpZzksUnGJa0US4HeHzPMfr9HqWJ/view",
};

// ✅ Email via Resend
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
        <br>
        <p>🍄 Blessed magick on your journey,</p>
        <p>Pine Tree Magick</p>
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

// ✅ Main IPN Function
export default async (req, res) => {
  try {
    // Raw IPN body
    const rawBody = await new Promise(resolve => {
      let data = "";
      req.on("data", chunk => (data += chunk));
      req.on("end", () => resolve(data));
    });
    console.log("📩 Raw IPN:", rawBody);

    const params = querystring.parse(rawBody);

    // ✅ Validate IPN with PayPal
    const verifyPayload = "cmd=_notify-validate&" + rawBody;
    const verifyRes = await fetch(
      "https://ipnpb.paypal.com/cgi-bin/webscr",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: verifyPayload
      }
    );
    const verification = await verifyRes.text();
    console.log("🔍 IPN Verified:", verification);

    if (verification !== "VERIFIED") {
      console.error("❌ Invalid IPN");
      return res.status(400).send("Invalid IPN");
    }

    const payerEmail = params.payer_email;
    const buyerName = params.first_name;
    const itemName =
      params.item_name1 || params.item_name || params.item_name_1;

    console.log("👤 Buyer:", payerEmail, buyerName);
    console.log("📦 Item:", itemName);

    if (!payerEmail || !itemName) {
      console.error("❌ Missing required fields");
      return res.status(400).send("Missing fields");
    }

    const pdfLink = PDF_LINKS[itemName];
    if (!pdfLink) {
      console.error("❌ No PDF for item:", itemName);
      return res.status(200).send("No PDF configured");
    }

    // ✅ Send download email
    await sendEmail({ to: payerEmail, buyerName, link: pdfLink });

    console.log("✅ Success for", itemName);
    return res.status(200).send("OK");
  } catch (err) {
    console.error("🔥 IPN Handler Error:", err);
    return res.status(500).send("Server error");
  }
};

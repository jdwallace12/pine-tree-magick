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
// IMPORTANT: The key must match exactly what PayPal sends as "item_name" in the IPN notification
// This is typically the product name configured in your PayPal button
const PDF_LINKS = {
  // Guided Rituals
  "Highest Self Ritual": "https://drive.google.com/file/d/1Qo8WyvgfgZPbN5qVtX-Op2BXLCq-mdWY/view",
  "Love Spell": "https://drive.google.com/file/d/1E4nBIAqDAGsV_QyHxP2JC7Ahu8f1F7-Z/view",
  "Ancestral Connection and Samhain Ritual": "https://drive.google.com/file/d/1A4KDgpZzksUnGJa0US4HeHzPMfr9HqWJ/view",
  "Money Manifestation Ritual": "https://drive.google.com/file/d/1hs5bWRueAJAZmd5MFCMsdrRE7Tws0IFc/view",
  
  // Bundles
  // "Venus Retrograde Bundle": "https://drive.google.com/file/d/YOUR_FILE_ID/view",
};

// Send email via Resend
async function sendEmail({ to, buyerName, link, itemName }) {
  if (!RESEND_API_KEY) {
    console.error("❌ RESEND_API_KEY missing");
    return;
  }

  const safeName = buyerName || "there";

  const payload = {
    from: EMAIL_FROM,
    to: [to],
    subject: "Your Download ✨",
    html: `
       <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Ritual Download</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #1a263a;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #1a263a">
        <tr>
          <td align="center" style="padding: 40px 40px 20px 20px;">
            <!-- Logo Header - Outside white container -->
            <img src="https://pinetreemagick.com/assets/logo/logo-light.png" alt="Pine Tree Magick" style="max-width: 200px; height: auto; display: block; margin: 0 auto;" />
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 0 20px 40px 20px;">
            <!-- Main Container -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px 40px 20px 40px;">
                  <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; color: #1a1a1a; line-height: 1.4;">
                    Thank you for your purchase, ${safeName}! ✨
                  </h1>
                  <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                    Your download is ready! Click the button below to access ${itemName || "your purchase"}, enjoy!
                  </p>
                </td>
              </tr>
              
              <!-- Download Button -->
              <tr>
                <td align="center" style="padding: 0 40px 30px 40px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td align="center" style="background-color: #f59bbb; border-radius: 6px;">
                        <a href="${link}" target="_blank" style="display: inline-block; padding: 16px 32px; font-size: 16px; font-weight: 600; color: #1a263a; text-decoration: none; border-radius: 6px; background-color: #f59bbb;">
                          Download ${itemName || "Your Purchase"}
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Alternative Link -->
              <tr>
                <td align="center" style="padding: 0 40px 40px 40px;">
                  <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6b6b6b;">
                    If the button doesn't work, you can also 
                    <a href="${link}" target="_blank" style="color: #6b6b6b; text-decoration: underline;">click here to access your download</a>.
                  </p>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
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
    // TEST MODE: Check for test query parameter
    const url = new URL(req.url);
    if (url.searchParams.get('test') === 'true') {
      const testEmail = url.searchParams.get('email') || 'jdwallace12@gmail.com';
      const testName = url.searchParams.get('name') || 'John';
      const testItem = url.searchParams.get('item') || 'Highest Self Ritual';
      
      console.log(`🧪 TEST MODE: Sending test email to ${testEmail}`);
      
      const pdfLink = PDF_LINKS[testItem];
      if (!pdfLink) {
        return new Response(`No PDF configured for item: ${testItem}`, { status: 400 });
      }
      
      await sendEmail({ 
        to: testEmail, 
        buyerName: testName, 
        link: pdfLink, 
        itemName: testItem 
      });
      
      return new Response(`✅ Test email sent to ${testEmail}`, { status: 200 });
    }

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

    // Send the download email
    await sendEmail({ to: email, buyerName, link: pdfLink, itemName });

    console.log(`✅ Download delivered: ${itemName}`);

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("❌ IPN handler error:", err);
    return new Response("Server error", { status: 500 });
  }
}

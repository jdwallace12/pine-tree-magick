// netlify/functions/paypal-ipn.js
/**
 * IMPORTANT: in netlify.toml, include:
 *
 * [functions.paypal-ipn]
 *   body = "raw"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getStore } from '@netlify/blobs';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_BCC_INTERNAL = process.env.EMAIL_BCC_INTERNAL || "";
const NETLIFY_ACCESS_TOKEN = process.env.NETLIFY_ACCESS_TOKEN; // Personal Access Token or similar
const NETLIFY_SITE_ID = process.env.NETLIFY_SITE_ID;

// Ensure EMAIL_FROM is always valid for Resend
const EMAIL_FROM = process.env.EMAIL_FROM?.includes('<')
  ? process.env.EMAIL_FROM
  : `Pine Tree Magick <${process.env.EMAIL_FROM || 'no-reply@pinetreemagick.com'}>`;

// Reply-to address for customer emails
// Set this to your support/contact email so replies go to the right place
// If not set, replies will go to EMAIL_FROM
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || process.env.EMAIL_FROM || 'no-reply@pinetreemagick.com';

// Cache for PDF links map
let PDF_LINKS_CACHE = null;

// Cache for workshop slugs map
let WORKSHOP_SLUGS_CACHE = null;

// Cache for course slugs map
let COURSE_SLUGS_CACHE = null;

/**
 * Read PDF links from the generated JSON file
 * IMPORTANT: The title in the markdown frontmatter must match exactly what PayPal sends as "item_name"
 * The JSON file is generated during build by scripts/generate-pdf-links.js
 */
function getPdfLinks() {
  if (PDF_LINKS_CACHE) {
    return PDF_LINKS_CACHE;
  }

  // Get the path to the JSON file (same directory as this function)
  const functionDir = path.dirname(fileURLToPath(import.meta.url));
  const jsonPath = path.join(functionDir, 'pdf-links.json');
  
  // Try alternative paths in case the function is bundled differently
  const altPaths = [
    jsonPath,
    path.join(process.cwd(), 'netlify/functions/pdf-links.json'),
    path.join(process.cwd(), 'pdf-links.json'),
  ];
  
  let pdfLinks = {};
  let found = false;
  
  for (const altPath of altPaths) {
    try {
      if (fs.existsSync(altPath)) {
        const content = fs.readFileSync(altPath, 'utf-8');
        pdfLinks = JSON.parse(content);
        console.log(`✅ Loaded PDF links from: ${altPath}`);
        console.log(`📊 Total PDF links: ${Object.keys(pdfLinks).length}`);
        console.log(`📊 PDF link titles:`, Object.keys(pdfLinks));
        found = true;
        break;
      }
    } catch (err) {
      console.warn(`⚠️ Error reading ${altPath}:`, err.message);
    }
  }
  
  if (!found) {
    console.error(`❌ PDF links file not found. Tried:`, altPaths);
    console.error(`❌ Make sure to run 'npm run generate-pdf-links' during build`);
  }
  
  PDF_LINKS_CACHE = pdfLinks;
  return pdfLinks;
}

/**
 * Read workshop slug mappings from the generated JSON file.
 * Maps "Workshop Title" -> "workshop-slug" for all paid workshops.
 * The JSON is generated during build by scripts/generate-workshop-slugs.js
 */
function getWorkshopSlugs() {
  if (WORKSHOP_SLUGS_CACHE) {
    return WORKSHOP_SLUGS_CACHE;
  }

  const functionDir = path.dirname(fileURLToPath(import.meta.url));
  const jsonPath = path.join(functionDir, 'workshop-slugs.json');

  const altPaths = [
    jsonPath,
    path.join(process.cwd(), 'netlify/functions/workshop-slugs.json'),
    path.join(process.cwd(), 'workshop-slugs.json'),
  ];

  let workshopSlugs = {};
  let found = false;

  for (const altPath of altPaths) {
    try {
      if (fs.existsSync(altPath)) {
        const content = fs.readFileSync(altPath, 'utf-8');
        workshopSlugs = JSON.parse(content);
        console.log(`✅ Loaded workshop slugs from: ${altPath}`);
        console.log(`📊 Total workshop slugs: ${Object.keys(workshopSlugs).length}`);
        console.log(`📊 Workshop titles:`, Object.keys(workshopSlugs));
        found = true;
        break;
      }
    } catch (err) {
      console.warn(`⚠️ Error reading ${altPath}:`, err.message);
    }
  }

  if (!found) {
    console.error(`❌ Workshop slugs file not found. Tried:`, altPaths);
    console.error(`❌ Make sure to run 'npm run generate-workshop-slugs' during build`);
  }

  WORKSHOP_SLUGS_CACHE = workshopSlugs;
  return workshopSlugs;
}

/**
 * Read course slug mappings from the generated JSON file.
 * Maps "Course Title" -> "course-slug" for all paid courses.
 * The JSON is generated during build by scripts/generate-course-slugs.js
 */
function getCourseSlugs() {
  if (COURSE_SLUGS_CACHE) {
    return COURSE_SLUGS_CACHE;
  }

  const functionDir = path.dirname(fileURLToPath(import.meta.url));
  const jsonPath = path.join(functionDir, 'course-slugs.json');

  const altPaths = [
    jsonPath,
    path.join(process.cwd(), 'netlify/functions/course-slugs.json'),
    path.join(process.cwd(), 'course-slugs.json'),
  ];

  let courseSlugs = {};
  let found = false;

  for (const altPath of altPaths) {
    try {
      if (fs.existsSync(altPath)) {
        const content = fs.readFileSync(altPath, 'utf-8');
        courseSlugs = JSON.parse(content);
        console.log(`✅ Loaded course slugs from: ${altPath}`);
        console.log(`📊 Total course slugs: ${Object.keys(courseSlugs).length}`);
        console.log(`📊 Course titles:`, Object.keys(courseSlugs));
        found = true;
        break;
      }
    } catch (err) {
      console.warn(`⚠️ Error reading ${altPath}:`, err.message);
    }
  }

  if (!found) {
    console.error(`❌ Course slugs file not found. Tried:`, altPaths);
    console.error(`❌ Make sure to run 'npm run generate-course-slugs' during build`);
  }

  COURSE_SLUGS_CACHE = courseSlugs;
  return courseSlugs;
}

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
      <title>Your Download | Pine Tree Magick</title>
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
    reply_to: EMAIL_REPLY_TO,
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

// Grant role to Netlify Identity user
async function grantRole(userId, role) {
  if (!NETLIFY_ACCESS_TOKEN || !NETLIFY_SITE_ID) {
    console.warn("⚠️ NETLIFY_ACCESS_TOKEN or NETLIFY_SITE_ID missing. Role grant skipped.");
    return;
  }

  console.log(`🔑 Granting role '${role}' to user '${userId}'`);

  try {
    // 1. Get current user data to get existing roles
    const userRes = await fetch(`https://api.netlify.com/api/v1/sites/${NETLIFY_SITE_ID}/identity/${userId}`, {
      headers: {
        Authorization: `Bearer ${NETLIFY_ACCESS_TOKEN}`,
      },
    });

    if (!userRes.ok) {
      console.error(`❌ Failed to fetch user ${userId}:`, await userRes.text());
      return;
    }

    const userData = await userRes.json();
    const currentRoles = userData.app_metadata?.roles || [];

    if (currentRoles.includes(role)) {
      console.log(`ℹ️ User already has role '${role}'`);
      return;
    }

    // 2. Update user with new role
    const updateRes = await fetch(`https://api.netlify.com/api/v1/sites/${NETLIFY_SITE_ID}/identity/${userId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${NETLIFY_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_metadata: {
          roles: [...currentRoles, role],
        },
      }),
    });

    if (updateRes.ok) {
      console.log(`✅ Role '${role}' granted cluster-wide for user ${userId}`);
    } else {
      console.error(`❌ Failed to grant role:`, await updateRes.text());
    }
  } catch (err) {
    console.error("❌ Error granting role:", err);
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
      
      const PDF_LINKS = getPdfLinks();
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
    const custom = params.get("custom") || ""; // We'll pass Netlify User ID in the 'custom' field

    console.log("👤 Buyer:", email, buyerName);
    console.log("📦 Item:", itemName);
    console.log("🆔 Custom (User ID):", custom);

    // 1. Handle PDF downloads (Existing logic)
    const PDF_LINKS = getPdfLinks();
    const pdfLink = PDF_LINKS[itemName];
    if (pdfLink) {
      await sendEmail({ to: email, buyerName, link: pdfLink, itemName });
      console.log(`✅ Download delivered: ${itemName}`);
    }

    // 2. Handle Course access
    // We dynamically load course slugs from the JSON artifact built at compile time.
    const courseSlugs = getCourseSlugs();

    const courseSlug = courseSlugs[itemName];
    if (courseSlug && custom) {
      await grantRole(custom, `course:${courseSlug}`);
      console.log(`✅ Course role granted: course:${courseSlug}`);
    } else if (courseSlug && !custom) {
      console.warn(`⚠️ Course purchase detected but no User ID (custom) provided. Manual grant needed for ${email}`);
    }

    // 3. Handle Workshop Spots (Netlify Blobs)
    const workshopSlugs = getWorkshopSlugs();
    
    // JSON now stores { slug, maxParticipants } per title
    const workshopEntry = workshopSlugs[itemName];
    const purchasedWorkshopSlug = workshopEntry?.slug;
    if (purchasedWorkshopSlug) {
      try {
        const store = getStore('workshops');
        const currentCountStr = await store.get(purchasedWorkshopSlug);
        const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;
        const newCount = currentCount + 1;
        
        await store.set(purchasedWorkshopSlug, newCount.toString());
        console.log(`✅ Workshop spots updated: ${purchasedWorkshopSlug} is now at ${newCount} signups`);
      } catch (err) {
        console.error(`❌ Failed to update workshop spots for ${purchasedWorkshopSlug}:`, err);
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("❌ IPN handler error:", err);
    return new Response("Server error", { status: 500 });
  }
}

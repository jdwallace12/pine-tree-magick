import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import matter from 'gray-matter';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.development' });
dotenv.config({ path: '.env.production' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'no-reply@pinetreemagick.com';
const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;

const NEWSLETTER_DIR = path.join(__dirname, '../src/content/newsletter');

// Base HTML Template (Matches paypal-ipn.js style)
const getHtmlTemplate = (title, content, imageUrl) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | Pine Tree Magick</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #1a263a;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #1a263a">
    <tr>
      <td align="center" style="padding: 40px 40px 20px 20px;">
        <img src="https://pinetreemagick.com/assets/logo/logo-light.png" alt="Pine Tree Magick" style="max-width: 200px; height: auto; display: block; margin: 0 auto;" />
      </td>
    </tr>
    <tr>
      <td align="center" style="padding: 0 20px 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: ${imageUrl && imageUrl.trim() !== '' ? '40px' : '28px'} 40px 40px 40px;">
              ${imageUrl && imageUrl.trim() !== '' ? `<img src="${imageUrl}" style="width: 100%; border-radius: 4px; margin-bottom: 20px;" />` : ''}
              <div class="newsletter-content" style="font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                ${content}
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 40px 40px 40px; border-top: 1px solid #f0f0f0;">
               <p style="margin-top: 20px; font-size: 12px; color: #999;">
                © 2026 You're receiving this because your past interest in Pine Tree Magick. All rights reserved.<br>
                <br>
                <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color: #999; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Configure marked to style images
const renderer = new marked.Renderer();
renderer.image = function(token) {
  const { href, title, text } = token;
  return `<img src="${href}" alt="${text}" title="${title || ''}" style="max-width: 100%; height: auto; border-radius: 4px; display: block; margin: 24px auto;" />`;
};
marked.setOptions({ renderer });

async function sendNewsletter() {
  const args = process.argv.slice(2);
  const isTest = args.includes('--test');
  const testEmail = isTest ? args[args.indexOf('--test') + 1] : null;
  const fileName = args.includes('--file') ? args[args.indexOf('--file') + 1] : null;
  const scheduleTime = args.includes('--schedule') ? args[args.indexOf('--schedule') + 1] : null;

  if (!fileName) {
    console.error('❌ Please specify a file with --file <filename.md>');
    process.exit(1);
  }

  if (isTest && !testEmail) {
    console.error('❌ Please specify a test email with --test <email>');
    process.exit(1);
  }

  const filePath = path.join(NEWSLETTER_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data: frontmatter, content: markdownBody } = matter(fileContent);
  const htmlBody = marked.parse(markdownBody); // Use marked.parse for safety
  const fullHtml = getHtmlTemplate(frontmatter.title, htmlBody, frontmatter.image);

  if (isTest) {
    console.log(`🧪 Sending test email to ${testEmail}...`);
    
    const resendFrom = EMAIL_FROM.includes('<')
      ? EMAIL_FROM
      : `Pine Tree Magick <${EMAIL_FROM}>`;

    const payload = {
      from: resendFrom,
      to: [testEmail],
      subject: `[TEST] ${frontmatter.title}`,
      html: fullHtml,
    };

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (res.ok) {
      console.log('✅ Test email sent successfully:', result.id);
    } else {
      console.error('❌ Failed to send test email:', result);
    }
  } else {
      // Create or Schedule a Broadcast in Resend
      if (scheduleTime) {
        console.log(`📡 Scheduling Broadcast for: ${scheduleTime}...`);
      } else {
        console.log(`📡 Creating Draft Broadcast in Resend...`);
      }
      
      const resendFrom = EMAIL_FROM.includes('<')
        ? EMAIL_FROM
        : `Pine Tree Magick <${EMAIL_FROM}>`;

      const payload = {
        name: frontmatter.title,
        subject: frontmatter.title,
        audience_id: AUDIENCE_ID,
        from: resendFrom,
        html: fullHtml,
      };

      // If scheduling, add the necessary parameters
      if (scheduleTime) {
        payload.send = true;
        payload.scheduledAt = scheduleTime;
      }

      const res = await fetch('https://api.resend.com/broadcasts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (res.ok) {
        if (scheduleTime) {
          console.log(`✅ Broadcast scheduled successfully for ${scheduleTime}!`);
        } else {
          console.log('✅ Broadcast draft created successfully!');
          console.log('🔗 You can now schedule or send it from your Resend Dashboard: https://resend.com/broadcasts');
        }
        console.log('Broadcast ID:', result.id);
      } else {
        console.error('❌ Failed to process broadcast:', result);
      }
  }
}

sendNewsletter().catch(console.error);

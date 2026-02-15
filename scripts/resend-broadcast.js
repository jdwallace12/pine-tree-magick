import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import dotenv from 'dotenv';
import { getNewsletterHtml } from '../src/utils/newsletter.js';

// Load environment variables
dotenv.config({ path: '.env.development' });
dotenv.config({ path: '.env.production' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'no-reply@pinetreemagick.com';
const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;

const NEWSLETTER_DIR = path.join(__dirname, '../src/content/newsletter');

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

  const fullHtml = getNewsletterHtml(frontmatter.title, markdownBody, frontmatter.image);

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

import { marked } from 'marked';

// Configure marked to style images and links exactly as in broadcasts
const renderer = new marked.Renderer();
renderer.image = function(token) {
  const { href, title, text } = token;
  return `<img src="${href}" alt="${text}" title="${title || ''}" style="max-width: 100%; height: auto; border-radius: 4px; display: block; margin: 24px auto;" />`;
};
renderer.link = function(token) {
  const { href, title, text } = token;
  return `<a href="${href}" title="${title || ''}" style="color: #f59bbb; text-decoration: underline; font-weight: bold;">${text}</a>`;
};
renderer.heading = function(token) {
  const { text, depth } = token;
  const sizes = { 1: '32px', 2: '24px', 3: '20px' };
  const size = sizes[depth] || '18px';
  return `<h${depth} style="margin-top: 0; margin-bottom: 16px; font-weight: bold; line-height: 1.2; color: #1a263a; font-size: ${size};">${text}</h${depth}>`;
};
marked.setOptions({ renderer });

/**
 * Generates the full HTML for a newsletter using the brand template.
 */
export const getNewsletterHtml = (title, contentMarkdown, imageUrl) => {
  const htmlBody = marked.parse(contentMarkdown);
  const padding = imageUrl && imageUrl.trim() !== '' ? '40px' : '28px';
  const imgHtml = imageUrl && imageUrl.trim() !== '' ? `<img src="${imageUrl}" style="width: 100%; border-radius: 4px; margin-bottom: 20px;" />` : '';

  return `
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
            <td style="padding: ${padding} 40px 40px 40px;">
              ${imgHtml}
              <div class="newsletter-content" style="font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                ${htmlBody}
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 40px 40px 40px; border-top: 1px solid #f0f0f0;">
               <p style="margin-top: 20px; font-size: 12px; color: #999;">
                © 2026 Pine Tree Magick. All rights reserved.<br>
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
};

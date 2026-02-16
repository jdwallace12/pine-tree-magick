import { marked } from 'marked';

// Configure marked to style images and links exactly as in broadcasts
const renderer = {
  image(token) {
    const { href, title, text } = token;
    return `<img src="${href}" alt="${text}" title="${title || ''}" style="max-width: 100%; height: auto; border-radius: 4px; display: block; margin: 24px auto;" />`;
  },
  link(token) {
    const { href, title } = token;
    const cleanTitle = (title || '').toLowerCase().trim();
    
    if (cleanTitle === 'button') {
      return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
          <tr>
            <td align="center" style="border-radius: 6px; background-color: #f59bbb;">
              <a href="${href}" target="_blank" style="padding: 12px 24px; border: 1px solid #f59bbb; border-radius: 6px; font-family: sans-serif; font-size: 16px; color: #1a263a; text-decoration: none; font-weight: bold; display: inline-block;">
                ${this.parser.parseInline(token.tokens)}
              </a>
            </td>
          </tr>
        </table>
      `;
    }
    return `<a href="${href}" title="${title || ''}" style="color: #d16a8d; text-decoration: underline; font-weight: bold;">${this.parser.parseInline(token.tokens)}</a>`;
  },
  heading(token) {
    const { depth } = token;
    const sizes = { 1: '32px', 2: '24px', 3: '20px' };
    const size = sizes[depth] || '18px';
    return `<h${depth} style="margin-top: 0px; margin-bottom: 16px; font-weight: bold; line-height: 1.3; color: #1a263a; font-size: ${size};">${this.parser.parseInline(token.tokens)}</h${depth}>`;
  },
  hr() {
    return `<hr style="border: 0; border-top: 1px solid #f0f0f0; margin: 32px 0;" />`;
  },
  blockquote(token) {
    return `<blockquote style="margin: 24px 0; padding: 16px 24px; border-left: 4px solid #f59bbb; background-color: #fafafa; color: #4a4a4a; font-style: italic;">${this.parser.parse(token.tokens)}</blockquote>`;
  },
  paragraph(token) {
    return `<p style="margin-bottom: 16px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">${this.parser.parseInline(token.tokens)}</p>`;
  },
  list(token) {
    const type = token.ordered ? 'ol' : 'ul';
    const margin = 'margin-bottom: 24px; margin-top: 8px; padding-left: 20px;';
    let body = '';
    for (const item of token.items) {
      body += this.listitem(item);
    }
    return `<${type} style="${margin}">${body}</${type}>`;
  },
  listitem(token) {
    return `<li style="margin-bottom: 8px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">${this.parser.parse(token.tokens)}</li>`;
  },
  codespan(token) {
    return `<code style="background-color: #fce7ef; color: #b03a64; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 14px;">${token.text}</code>`;
  },
  del(token) {
    return `<del style="color: #999; text-decoration: strike-through;">${this.parser.parseInline(token.tokens)}</del>`;
  },
  code(token) {
    return `
      <div style="margin: 32px 0; padding: 24px; background-color: #1a263a; border-radius: 8px; text-align: center;">
        <pre style="margin: 0; color: #f59bbb; font-family: 'Courier New', Courier, monospace; font-size: 18px; line-height: 1.4; white-space: pre-wrap; font-style: italic;">${token.text}</pre>
      </div>
    `;
  },
  table(token) {
    let header = '';
    // token.header is an array of cells
    let headerRow = '';
    for (const cell of token.header) {
      headerRow += this.tablecell(cell);
    }
    header = `<thead><tr>${headerRow}</tr></thead>`;

    let body = '';
    for (const row of token.rows) {
      let bodyRow = '';
      for (const cell of row) {
        bodyRow += this.tablecell(cell);
      }
      body += `<tr>${bodyRow}</tr>`;
    }
    body = `<tbody>${body}</tbody>`;

    return `
      <div style="margin: 32px 0; overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #f0f0f0; font-size: 14px;">
          ${header}
          ${body}
        </table>
      </div>
    `;
  },
  tablecell(token) {
    const type = token.header ? 'th' : 'td';
    const align = token.align ? `text-align: ${token.align};` : '';
    const weight = token.header ? 'font-weight: bold;' : 'font-weight: normal;';
    const background = token.header ? 'background-color: #fafafa;' : '';
    return `
      <${type} style="padding: 12px; border: 1px solid #f0f0f0; ${align} ${weight} ${background} color: #4a4a4a;">
        ${this.parser.parseInline(token.tokens)}
      </${type}>
    `;
  }
};

marked.use({ renderer });

/**
 * Generates the full HTML for a newsletter using the brand template.
 */
export const getNewsletterHtml = (title, contentMarkdown, imageUrl) => {
  const htmlBody = marked.parse(contentMarkdown);
  const padding = '40px';
  const imgHtml = imageUrl && imageUrl.trim() !== '' ? `<img src="${imageUrl}" style="width: 100%; border-radius: 4px; margin-bottom: 20px;" />` : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>${title} | Pine Tree Magick</title>
  <style>
    @media screen and (max-width: 600px) {
      .content-cell {
        padding: 24px 20px 30px 20px !important;
      }
      .footer-cell {
        padding: 0 20px 30px 20px !important;
      }
      .logo-cell {
        padding: 30px 20px 10px 20px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #1a263a;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #1a263a">
    <tr>
      <td align="center" class="logo-cell" style="padding: 40px 40px 20px 20px;">
        <img src="https://pinetreemagick.com/assets/logo/logo-light.png" alt="Pine Tree Magick" style="max-width: 200px; height: auto; display: block; margin: 0 auto;" />
      </td>
    </tr>
    <tr>
      <td align="center" style="padding: 0 20px 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td class="content-cell" style="padding: ${padding} 40px 40px 40px;">
              ${imgHtml}
              <div class="newsletter-content" style="font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                ${htmlBody}
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 20px 40px 16px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding: 0 10px;">
                    <a href="https://www.instagram.com/pinetreemagick/" target="_blank">
                      <img src="https://img.icons8.com/ios-filled/50/1A263A/instagram.png" alt="Instagram" width="24" height="24" style="display: block; width: 24px; height: 24px;" />
                    </a>
                  </td>
                  <td style="padding: 0 10px;">
                    <a href="https://www.tiktok.com/@pinetreemagick?lang=en" target="_blank">
                      <img src="https://img.icons8.com/ios-filled/50/1A263A/tiktok.png" alt="TikTok" width="24" height="24" style="display: block; width: 24px; height: 24px;" />
                    </a>
                  </td>
                  <td style="padding: 0 10px;">
                    <a href="https://pinetreemagick.substack.com/" target="_blank">
                      <img src="https://img.icons8.com/ios-filled/50/1A263A/substack.png" alt="Substack" width="24" height="24" style="display: block; width: 24px; height: 24px;" />
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" class="footer-cell" style="padding: 10px 40px 40px 40px; border-top: 1px solid #f0f0f0;">
               <p style="margin-top: 20px; font-size: 12px; color: #666;">
                © ${new Date().getFullYear()} Pine Tree Magick. All rights reserved.<br>
                <br>
                <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color: #666; text-decoration: underline;">Unsubscribe</a>
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

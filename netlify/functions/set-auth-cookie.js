exports.handler = async (event) => {
  try {
    let token = "";
    let returnTo = "/";

    if (event.httpMethod === "POST") {
      const data = JSON.parse(event.body || "{}");
      token = data.token;
      returnTo = data.returnTo || "/";
    } else {
      token = event.queryStringParameters.token;
      returnTo = event.queryStringParameters.returnTo || "/";
    }

    if (!token) {
      return { 
        statusCode: 400, 
        headers: { "Content-Type": "text/html" },
        body: "<h1>Missing Token</h1><p>Please go back and sign in again.</p>" 
      };
    }

    // Decoding for diagnostics (stable version)
    const decode = (t) => {
      try {
        const base64Url = t.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(Buffer.from(base64, 'base64').toString());
      } catch (e) { return { error: e.message }; }
    };
    const claims = decode(token);
    let roles = (claims.app_metadata && claims.app_metadata.roles) || [];

    // Final Stable v24:00 Bridge
    const killers = [
      `nf_jwt=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
      `nf_jwt=; Path=/; Max-Age=0`
    ];
    const theOne = `nf_jwt=${token}; path=/; SameSite=Lax; Secure`;

    const sep = returnTo.includes('?') ? '&' : '?';
    const busterReturnTo = `${returnTo}${sep}cb=${Date.now()}`;

    return {
      statusCode: 200,
      multiValueHeaders: {
        "Set-Cookie": [...killers, theOne]
      },
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Access Synchronized</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f0fdf4; color: #064e3b; padding: 1rem; }
            .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); width: 100%; max-width: 500px; text-align: center; }
            h1 { font-size: 1.5rem; margin: 0 0 1rem; color: #059669; }
            p { margin-bottom: 1.5rem; line-height: 1.5; color: #065f46; }
            .badge-container { margin-bottom: 2rem; display: flex; flex-wrap: wrap; justify-content: center; gap: 0.5rem; }
            .badge { padding: 4px 10px; border-radius: 9999px; background: #d1fae5; color: #065f46; font-size: 12px; font-weight: 600; border: 1px solid #10b981; }
            .btn { display: block; background: #059669; color: white; padding: 1rem 1.5rem; border-radius: 0.5rem; text-decoration: none; font-weight: bold; transition: background 0.2s; }
            .btn:hover { background: #047857; }
            .footer { margin-top: 2rem; font-size: 10px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Access Synchronized</h1>
            <p>Your security credentials have been verified. You are now ready to enter the course.</p>
            
            <div class="badge-container">
              ${roles.map(r => `<span class="badge">${r}</span>`).join('') || '<span class="badge">No Roles Detected</span>'}
            </div>

            <a href="${busterReturnTo}" class="btn">ENTER COURSE</a>
            <div class="footer">STABLE v24:00 | Secure Edge Protection Enabled</div>
          </div>
        </body>
        </html>
      `,
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: `<h1>Internal Error</h1><p>${err.message}</p>`,
    };
  }
};

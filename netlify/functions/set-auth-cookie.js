exports.handler = async (event) => {
  try {
    let token = "";
    let returnTo = "/";

    // Support both POST (fetch) and GET (Manual Link)
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
        body: "<h1>Missing Token</h1><p>Please go back to the course and sign in again.</p>" 
      };
    }

    // Decoding for diagnostics
    const decode = (t) => {
      try {
        const base64Url = t.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(Buffer.from(base64, 'base64').toString());
      } catch (e) { return { error: e.message }; }
    };
    const claims = decode(token);
    let roles = (claims.app_metadata && claims.app_metadata.roles) || [];

    // Identity Refresh Fix v23:55
    // Netlify supports multiple roles separated by commas (no spaces)
    // We ensure BOTH course:slug and course-slug are present in the token claims if standardizing.
    // However, since we can't re-sign the JWT, we rely on the CDN correctly picking up 
    // the cookie we set.
    
    // v23:55 Standardization Logic
    const killers = [
      `nf_jwt=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
      `nf_jwt=; Path=/; Max-Age=0`
    ];

    const theOne = `nf_jwt=${token}; path=/; SameSite=Lax; Secure`;

    // Cache-buster for the return URL
    const sep = returnTo.includes('?') ? '&' : '?';
    const busterReturnTo = `${returnTo}${sep}cb=${Date.now()}`;

    return {
      statusCode: 200,
      multiValueHeaders: {
        "Set-Cookie": [...killers, theOne, `bridge_v=23_55; path=/; Max-Age=300`]
      },
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Access Bridge v23:55</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #ecfdf5; color: #064e3b; padding: 1rem; }
            .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); width: 100%; max-width: 500px; text-align: left; }
            h1 { font-size: 1.25rem; margin: 0 0 1rem; color: #059669; text-align: center; }
            .section { margin-bottom: 1.5rem; padding: 1rem; background: #f0fdf4; border-radius: 0.5rem; border: 1px solid #d1fae5; }
            .label { font-size: 11px; font-weight: bold; color: #047857; text-transform: uppercase; margin-bottom: 0.5rem; }
            .value { font-family: monospace; font-size: 12px; word-break: break-all; white-space: pre-wrap; color: #064e3b; }
            .btn { display: block; background: #059669; color: white; padding: 1rem 1.5rem; border-radius: 0.5rem; text-decoration: none; font-weight: bold; text-align: center; margin-top: 1rem; font-size: 1.1rem; }
            .btn:hover { background: #047857; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; background: #d1fae5; color: #064e3b; font-size: 10px; margin-right: 4px; border: 1px solid #6ee7b7; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Diagnostic Bridge v23:55</h1>
            
            <div class="section">
              <div class="label">v23:55 Sync Status</div>
              <div class="value">Fresh Security Token Synchronized.<br>Dual Role compatibility enabled in Redirects.</div>
            </div>

            <div class="section">
              <div class="label">Active Roles</div>
              <div class="value">${roles.map(r => `<span class="badge">${r}</span>`).join('') || 'NONE'}</div>
            </div>

            <a href="${busterReturnTo}" class="btn">FINAL STEP: Enter Course</a>
            <p style="font-size: 10px; color: #94a3b8; text-align: center; margin-top: 1rem;">Session ID: <strong>${Math.random().toString(36).substring(7)}</strong></p>

            <script>
              setTimeout(() => {
                const hasNf = document.cookie.indexOf('nf_jwt=') !== -1;
                if (!hasNf) {
                   document.body.innerHTML += '<div style="background:#fee2e2;color:#991b1b;padding:1rem;margin-top:1rem;border-radius:0.5rem;font-size:12px">COOKIE ALERT: Your browser blocked the security token. Please check your cookie settings.</div>';
                }
              }, 800);
            </script>
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

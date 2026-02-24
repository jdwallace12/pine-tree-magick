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
    const roles = (claims.app_metadata && claims.app_metadata.roles) || [];

    // Extreme Diagnostic Bridge v23:10
    // Standardizing on Secure; Path=/ for maximum CDN compatibility
    const cookieHeader = `nf_jwt=${token}; path=/; SameSite=Lax; Secure`;
    const debugCookie = `bridge_domain=${event.headers.host || 'unknown'}; path=/; Max-Age=300; SameSite=Lax; Secure`;

    return {
      statusCode: 200,
      multiValueHeaders: {
        "Set-Cookie": [cookieHeader, debugCookie]
      },
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Access Bridge v23:10</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f1f5f9; color: #1e293b; padding: 1rem; }
            .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); width: 100%; max-width: 500px; text-align: left; }
            h1 { font-size: 1.25rem; margin: 0 0 1rem; color: #10b981; text-align: center; }
            .section { margin-bottom: 1.5rem; padding: 1rem; background: #f8fafc; border-radius: 0.5rem; border: 1px solid #e2e8f0; }
            .label { font-size: 11px; font-weight: bold; color: #94a3b8; text-transform: uppercase; margin-bottom: 0.5rem; }
            .value { font-family: monospace; font-size: 12px; word-break: break-all; white-space: pre-wrap; }
            .btn { display: block; background: #10b981; color: white; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none; font-weight: bold; text-align: center; margin-top: 1rem; }
            .btn:hover { opacity: 0.9; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; background: #dcfce7; color: #166534; font-size: 10px; margin-right: 4px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Diagnostic Bridge v23:10</h1>
            
            <div class="section">
              <div class="label">Step 1: Cookie Delivery</div>
              <div class="value">Security Cookie (nf_jwt) sent via HTTP Header.<br>Status: <span style="color:#10b981">SENT ✅</span></div>
            </div>

            <div class="section">
              <div class="label">Step 2: Token Verification</div>
              <div class="label">Roles found in Token:</div>
              <div class="value">${roles.map(r => `<span class="badge">${r}</span>`).join('') || '<span style="color:#ef4444">NONE</span>'}</div>
              <div style="margin-top:1rem" class="label">JWT Payload:</div>
              <div class="value">${JSON.stringify(claims, null, 2)}</div>
            </div>

            <div class="section">
              <div class="label">Your Browser Cookies:</div>
              <div id="cookies-list" class="value">Scanning...</div>
            </div>

            <a href="${returnTo}" class="btn">Step 2: Enter Course</a>

            <script>
              setTimeout(() => {
                const list = document.getElementById('cookies-list');
                const hasNf = document.cookie.indexOf('nf_jwt=') !== -1;
                list.innerHTML = 'Found: ' + (hasNf ? '<span style="color:#10b981">nf_jwt (YES)</span>' : '<span style="color:#ef4444">nf_jwt (MISSING)</span>') + '<br><br>' + document.cookie;
              }, 500);
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

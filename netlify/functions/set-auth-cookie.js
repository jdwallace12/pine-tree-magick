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

    // v23:20 Extreme Multi-Layer Sync
    // We set the cookie multiple times with different attributes to avoid browser-specific quirks.
    const c1 = `nf_jwt=${token}; path=/; SameSite=Lax; Secure`;
    const c2 = `nf_jwt=${token}; path=/`;
    const c3 = `nf_jwt=${token}; Max-Age=3600; Path=/`;

    // Cache-buster for the return URL
    const sep = returnTo.includes('?') ? '&' : '?';
    const busterReturnTo = `${returnTo}${sep}cb=${Date.now()}`;

    return {
      statusCode: 200,
      multiValueHeaders: {
        "Set-Cookie": [c1, c2, c3, `bridge_v=23_20; path=/; Max-Age=300`]
      },
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Access Bridge v23:20</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #fef2f2; color: #1e293b; padding: 1rem; }
            .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); width: 100%; max-width: 500px; text-align: left; }
            h1 { font-size: 1.25rem; margin: 0 0 1rem; color: #ef4444; text-align: center; }
            .section { margin-bottom: 1.5rem; padding: 1rem; background: #fff1f2; border-radius: 0.5rem; border: 1px solid #fecdd3; }
            .label { font-size: 11px; font-weight: bold; color: #e11d48; text-transform: uppercase; margin-bottom: 0.5rem; }
            .value { font-family: monospace; font-size: 12px; word-break: break-all; white-space: pre-wrap; color: #881337; }
            .btn { display: block; background: #e11d48; color: white; padding: 0.875rem 1.5rem; border-radius: 0.5rem; text-decoration: none; font-weight: bold; text-align: center; margin-top: 1rem; font-size: 1.1rem; }
            .btn:hover { background: #be123c; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; background: #ffe4e6; color: #e11d48; font-size: 10px; margin-right: 4px; border: 1px solid #fda4af; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Diagnostic Bridge v23:20</h1>
            
            <div class="section">
              <div class="label">Cookie Status (v23:20)</div>
              <div class="value" id="status-text">Synchronizing...</div>
            </div>

            <div class="section">
              <div class="label">Roles in Token</div>
              <div class="value">${roles.map(r => `<span class="badge">${r}</span>`).join('') || 'NONE'}</div>
            </div>

            <div class="section">
              <div class="label">Browser Verification</div>
              <div id="cookies-list" class="value">Scanning for nf_jwt...</div>
            </div>

            <a href="${busterReturnTo}" class="btn">FINAL STEP: Enter Course</a>
            <p style="font-size: 10px; color: #94a3b8; text-align: center; margin-top: 1rem;">This link includes a cache-buster (?cb=...) to bypass any old redirects.</p>

            <script>
              setTimeout(() => {
                const list = document.getElementById('cookies-list');
                const hasNf = document.cookie.indexOf('nf_jwt=') !== -1;
                const status = document.getElementById('status-text');
                
                if (hasNf) {
                   status.innerHTML = "Cookie stored in browser. Ready for CDN check.";
                   status.style.color = "#10b981";
                   list.innerHTML = "✅ FOUND nf_jwt";
                } else {
                   status.innerHTML = "Cookie MISSING. Your browser is blocking the sync.";
                   status.style.color = "#ef4444";
                   list.innerHTML = "❌ MISSING nf_jwt";
                }
              }, 600);
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

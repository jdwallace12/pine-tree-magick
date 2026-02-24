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

    // v23:60 NUCLEAR EDGE GUARD
    // This function sets the nf_jwt cookie which the Edge Guard (netlify/edge-functions/access-guard.ts)
    // will now use as the definitive source of truth for authorization.
    
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
        "Set-Cookie": [...killers, theOne, `bridge_v=23_60; path=/; Max-Age=300`]
      },
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Access Bridge v23:60</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #faf5ff; color: #581c87; padding: 1rem; }
            .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); width: 100%; max-width: 500px; text-align: left; }
            h1 { font-size: 1.25rem; margin: 0 0 1rem; color: #7e22ce; text-align: center; }
            .section { margin-bottom: 1.5rem; padding: 1rem; background: #faf5ff; border-radius: 0.5rem; border: 1px solid #e9d5ff; }
            .label { font-size: 11px; font-weight: bold; color: #7e22ce; text-transform: uppercase; margin-bottom: 0.5rem; }
            .value { font-family: monospace; font-size: 12px; word-break: break-all; white-space: pre-wrap; color: #581c87; }
            .btn { display: block; background: #9333ea; color: white; padding: 1rem 1.5rem; border-radius: 0.5rem; text-decoration: none; font-weight: bold; text-align: center; margin-top: 1rem; font-size: 1.1rem; }
            .btn:hover { background: #7e22ce; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; background: #f3e8ff; color: #6b21a8; font-size: 10px; margin-right: 4px; border: 1px solid #d8b4fe; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Nuclear Edge Guard v23:60</h1>
            
            <div class="section">
              <div class="label">v23:60 Initialization</div>
              <div class="value">Edge Verification Layer Active.<br>Bypassing legacy RBAC system.</div>
            </div>

            <div class="section">
              <div class="label">Course Roles</div>
              <div class="value">${roles.map(r => `<span class="badge">${r}</span>`).join('') || 'NONE'}</div>
            </div>

            <a href="${busterReturnTo}" class="btn">FINAL STEP: Enter Course</a>
            <p style="font-size: 10px; color: #94a3b8; text-align: center; margin-top: 1rem;">Edge Sync: <strong>${Math.random().toString(36).substring(7)}</strong></p>

            <script>
              setTimeout(() => {
                const hasNf = document.cookie.indexOf('nf_jwt=') !== -1;
                if (!hasNf) {
                   document.body.innerHTML += '<div style="background:#fee2e2;color:#991b1b;padding:1rem;margin-top:1rem;border-radius:0.5rem;font-size:12px">EDGE ERROR: Browser blocked sync token.</div>';
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

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

    // v23:30 Nuclear Cookie Clear
    // We send deletions for all possible nf_jwt variants first, then set the new one.
    // Some browsers get confused if there are multiple cookies with the same name on different paths/attributes.
    const killers = [
      `nf_jwt=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
      `nf_jwt=; Path=/; Max-Age=0`,
      `nf_jwt=; Max-Age=0`
    ];

    // The ONE true cookie for v23:30
    const theOne = `nf_jwt=${token}; path=/; SameSite=Lax; Secure`;

    // Cache-buster for the return URL
    const sep = returnTo.includes('?') ? '&' : '?';
    const busterReturnTo = `${returnTo}${sep}cb=${Date.now()}`;

    return {
      statusCode: 200,
      multiValueHeaders: {
        "Set-Cookie": [...killers, theOne, `bridge_v=23_30; path=/; Max-Age=300`]
      },
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Access Bridge v23:30</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #fffbeb; color: #1e293b; padding: 1rem; }
            .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); width: 100%; max-width: 500px; text-align: left; }
            h1 { font-size: 1.25rem; margin: 0 0 1rem; color: #d97706; text-align: center; }
            .section { margin-bottom: 1.5rem; padding: 1rem; background: #fff7ed; border-radius: 0.5rem; border: 1px solid #ffedd5; }
            .label { font-size: 11px; font-weight: bold; color: #9a3412; text-transform: uppercase; margin-bottom: 0.5rem; }
            .value { font-family: monospace; font-size: 12px; word-break: break-all; white-space: pre-wrap; color: #7c2d12; }
            .btn { display: block; background: #d97706; color: white; padding: 1rem 1.5rem; border-radius: 0.5rem; text-decoration: none; font-weight: bold; text-align: center; margin-top: 1rem; font-size: 1.1rem; }
            .btn:hover { background: #b45309; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; background: #ffedd5; color: #9a3412; font-size: 10px; margin-right: 4px; border: 1px solid #fed7aa; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Diagnostic Bridge v23:30</h1>
            
            <div class="section">
              <div class="label">Cookie Status (v23:30)</div>
              <div class="value">Nuclear Clear performed. Fresh nf_jwt set via Header.</div>
            </div>

            <div class="section">
              <div class="label">Roles found in Token</div>
              <div class="value">${roles.map(r => `<span class="badge">${r}</span>`).join('') || 'NONE'}</div>
            </div>

            <div class="section">
              <div class="label">Browser Cookies (Post-Sync)</div>
              <div id="cookies-list" class="value">Verifying...</div>
            </div>

            <a href="${busterReturnTo}" class="btn">FINAL STEP: Enter Course</a>
            <p style="font-size: 10px; color: #94a3b8; text-align: center; margin-top: 1rem;">This uses a Cache-Buster <strong>?cb=${Date.now()}</strong> to force a fresh permission check.</p>

            <script>
              setTimeout(() => {
                const list = document.getElementById('cookies-list');
                const hasNf = document.cookie.indexOf('nf_jwt=') !== -1;
                list.innerHTML = hasNf ? "✅ nf_jwt is PRESENT" : "❌ nf_jwt is MISSING (Blocked by Browser)";
                
                if (hasNf) {
                  const match = document.cookie.match(/nf_jwt=([^;]+)/);
                  const token = match ? match[1] : "";
                  if (token.length < 50) {
                     list.innerHTML += "<br><span style='color:#ef4444'>WARNING: Cookie is too short!</span>";
                  }
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
